package app.oqus.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log

/**
 * The real Android tunnel.
 *
 * Mirrors what electron/tunnel.cjs does on Windows, with the pieces Android
 * gives us instead of spawned .exes:
 *
 *   Windows: sslocal.exe (SOCKS5) + tun2socks.exe (Wintun) + `route add`
 *   Android: Shadowsocks SOCKS5 (in-process) + tun2socks engine + VpnService.Builder
 *
 * Android hands us a TUN file descriptor via VpnService.Builder; we pass that fd
 * to the tun2socks engine, which reads IP packets off it and forwards them to a
 * local SOCKS5 that speaks Shadowsocks to the exit server. Routing is declared
 * to the Builder rather than shelled out to `netsh`.
 *
 * A VPN must run in a foreground service or Android will kill it.
 */
class OqusVpnService : VpnService() {

  companion object {
    private const val TAG = "OqusVpnService"

    const val ACTION_CONNECT = "app.oqus.vpn.CONNECT"
    const val ACTION_DISCONNECT = "app.oqus.vpn.DISCONNECT"

    const val EXTRA_HOST = "host"
    const val EXTRA_PORT = "port"
    const val EXTRA_METHOD = "method"
    const val EXTRA_PASSWORD = "password"
    const val EXTRA_CITY = "city"

    private const val CHANNEL_ID = "oqusvpn.tunnel"
    private const val NOTIFICATION_ID = 1

    // Mirrors the desktop tunnel's addressing (electron/tunnel.cjs).
    private const val TUN_ADDR = "10.255.0.2"
    private const val TUN_PREFIX = 24
    private const val TUN_MTU = 1500
    private const val DNS = "9.9.9.9"

    // The in-process SOCKS5 that the tun2socks engine forwards into.
    private const val SOCKS_PORT = 10808

    /** Status pushed up to JS; OqusVpnModule relays these to the RN bridge. */
    @Volatile var statusListener: ((String, String?) -> Unit)? = null

    private fun emit(status: String, detail: String? = null) {
      statusListener?.invoke(status, detail)
    }
  }

  private var tun: ParcelFileDescriptor? = null
  private var engine: TunnelEngine? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_DISCONNECT -> {
        teardown()
        return START_NOT_STICKY
      }
      ACTION_CONNECT -> {
        val host = intent.getStringExtra(EXTRA_HOST)
        val port = intent.getIntExtra(EXTRA_PORT, 0)
        val method = intent.getStringExtra(EXTRA_METHOD)
        val password = intent.getStringExtra(EXTRA_PASSWORD)
        val city = intent.getStringExtra(EXTRA_CITY)
        if (host.isNullOrBlank() || port == 0 || method.isNullOrBlank() || password.isNullOrBlank()) {
          emit("disconnected", "Incomplete server config")
          stopSelf()
          return START_NOT_STICKY
        }
        connect(host, port, method, password, city)
        return START_STICKY
      }
    }
    return START_NOT_STICKY
  }

  private fun connect(host: String, port: Int, method: String, password: String, city: String?) {
    emit("connecting", "Starting tunnel…")
    try {
      startForegroundNotification(city ?: host)

      // 1) Acquire the TUN interface. Everything routes into it (0.0.0.0/0),
      //    except our own app — otherwise the Shadowsocks socket to the exit
      //    server would be routed back into the tunnel it is carrying (a loop).
      val builder = Builder()
        .setSession("OqusVPN")
        .setMtu(TUN_MTU)
        .addAddress(TUN_ADDR, TUN_PREFIX)
        .addRoute("0.0.0.0", 0)
        .addDnsServer(DNS)
      try {
        builder.addDisallowedApplication(packageName)
      } catch (e: Exception) {
        Log.w(TAG, "could not exclude self from tunnel", e)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        builder.setMetered(false)
      }

      val fd = builder.establish()
      if (fd == null) {
        emit("disconnected", "Tunnel adapter didn't come up — VPN permission denied?")
        stopForegroundCompat()
        stopSelf()
        return
      }
      tun = fd

      // 2) Start the Shadowsocks client + tun2socks engine on that fd.
      engine = TunnelEngine().also {
        it.start(
          tunFd = fd.fd,
          mtu = TUN_MTU,
          socksPort = SOCKS_PORT,
          serverHost = host,
          serverPort = port,
          method = method,
          password = password,
          // protect() keeps the engine's own outbound socket off the tunnel —
          // the Android equivalent of the desktop's `route add <server> <gw>`.
          protect = { socket -> protect(socket) },
        )
      }

      emit("connected", "All traffic via ${city ?: host}")
    } catch (e: Exception) {
      Log.e(TAG, "connect failed", e)
      teardown()
      emit("disconnected", "Failed: ${e.message}")
    }
  }

  private fun teardown() {
    try {
      engine?.stop()
    } catch (e: Exception) {
      Log.w(TAG, "engine stop failed", e)
    }
    engine = null
    try {
      tun?.close()
    } catch (e: Exception) {
      Log.w(TAG, "tun close failed", e)
    }
    tun = null
    stopForegroundCompat()
    stopSelf()
    emit("disconnected", null)
  }

  /** The user revoked the VPN from Android's settings — tear down, don't fight it. */
  override fun onRevoke() {
    Log.i(TAG, "VPN revoked by system")
    teardown()
    super.onRevoke()
  }

  override fun onDestroy() {
    teardown()
    super.onDestroy()
  }

  // --- foreground service -----------------------------------------------------

  private fun startForegroundNotification(where: String) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val ch = NotificationChannel(CHANNEL_ID, "VPN status", NotificationManager.IMPORTANCE_LOW)
      ch.description = "Shows while the OqusVPN tunnel is running"
      ch.setShowBadge(false)
      nm.createNotificationChannel(ch)
    }

    val open = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val n: Notification = Notification.Builder(this, CHANNEL_ID)
      .setContentTitle("OqusVPN is connected")
      .setContentText("All traffic via $where")
      .setSmallIcon(android.R.drawable.stat_sys_vpn_ic)
      .setContentIntent(open)
      .setOngoing(true)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        n,
        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(NOTIFICATION_ID, n)
    }
  }

  private fun stopForegroundCompat() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
  }
}
