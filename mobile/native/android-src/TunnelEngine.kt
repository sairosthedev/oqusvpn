package app.oqus.vpn

import android.util.Log
import oqustunnel.Oqustunnel

/**
 * Kotlin wrapper over the Go tunnel (mobile/native/oqustunnel).
 *
 * gomobile generates the `oqustunnel` package (an .aar) from that Go source; its
 * Oqustunnel class exposes the flat Start/Stop/IsRunning API. Keeping the JNI
 * surface behind this class means OqusVpnService never touches generated types.
 *
 * The Go side owns both halves of the tunnel: the tun2socks engine reading
 * Android's TUN fd, and the Shadowsocks SOCKS5 client it forwards into.
 */
class TunnelEngine {

  companion object {
    private const val TAG = "TunnelEngine"
  }

  private var started = false

  /**
   * @param tunFd   file descriptor from VpnService.Builder.establish()
   * @param protect keeps the engine's own socket off the tunnel (VpnService.protect)
   */
  fun start(
    tunFd: Int,
    mtu: Int,
    socksPort: Int,
    serverHost: String,
    serverPort: Int,
    method: String,
    password: String,
    protect: (Int) -> Boolean,
  ) {
    // The Shadowsocks socket must egress the physical NIC, not the tunnel it is
    // itself carrying — the Android equivalent of the desktop's
    // `route add <server> <gateway>`. VpnService.protect() marks the fd so the
    // kernel bypasses the VPN for it.
    if (!protect(tunFd)) {
      Log.w(TAG, "protect(tunFd) returned false — tunnel may loop")
    }

    val server = "$serverHost:$serverPort"
    val err = Oqustunnel.start(tunFd.toLong(), mtu.toLong(), socksPort.toLong(), server, method, password)
    if (err.isNotEmpty()) throw IllegalStateException(err)
    started = true
    Log.i(TAG, "tunnel up → $server")
  }

  fun stop() {
    if (!started) return
    val err = Oqustunnel.stop()
    if (err.isNotEmpty()) Log.w(TAG, "stop: $err")
    started = false
  }

  fun isRunning(): Boolean = started && Oqustunnel.isRunning()
}
