package app.oqus.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * The RN bridge for the Android tunnel — registers as `NativeModules.OqusVpn`,
 * which is exactly what mobile/src/lib/vpn.ts probes for. When this module is
 * present the app uses the real tunnel; when it isn't, vpn.ts falls back to the
 * StubVpn. That means the JS/UI needs no changes at all.
 *
 * Contract (mobile/src/lib/vpn.ts):
 *   connect(cfg: {host, port, method, password, city?, serverId?}): Promise<void>
 *   disconnect(): Promise<void>
 *   onStatus(cb): emits "OqusVpnStatus" events with {status, detail}
 */
class OqusVpnModule(private val reactCtx: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactCtx) {

  companion object {
    private const val VPN_REQUEST_CODE = 0x0BFC
    const val EVENT = "OqusVpnStatus"
  }

  /** Set while we wait for the user to answer Android's VPN consent dialog. */
  private var pendingConnect: ReadableMap? = null
  private var pendingPromise: Promise? = null

  private val activityListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(a: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != VPN_REQUEST_CODE) return
        val cfg = pendingConnect
        val promise = pendingPromise
        pendingConnect = null
        pendingPromise = null

        if (resultCode == Activity.RESULT_OK && cfg != null) {
          startTunnel(cfg)
          promise?.resolve(null)
        } else {
          // The user declined the system VPN dialog. Not an error — but the UI
          // must fall back out of "connecting", so emit a terminal status.
          emit("disconnected", "VPN permission denied")
          promise?.reject("E_VPN_DENIED", "VPN permission denied")
        }
      }
    }

  init {
    reactCtx.addActivityEventListener(activityListener)
    // Relay service-side status straight to JS.
    OqusVpnService.statusListener = { status, detail -> emit(status, detail) }
  }

  override fun getName() = "OqusVpn"

  @ReactMethod
  fun connect(cfg: ReadableMap, promise: Promise) {
    // Android requires one-time user consent before any app may capture traffic.
    // prepare() returns an Intent the first time; null once consent is granted.
    val consent = VpnService.prepare(reactCtx)
    if (consent != null) {
      val activity = currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No foreground activity to show the VPN consent dialog")
        return
      }
      pendingConnect = cfg
      pendingPromise = promise
      activity.startActivityForResult(consent, VPN_REQUEST_CODE)
      return // resolved in onActivityResult
    }
    startTunnel(cfg)
    promise.resolve(null)
  }

  @ReactMethod
  fun disconnect(promise: Promise) {
    val i = Intent(reactCtx, OqusVpnService::class.java).setAction(OqusVpnService.ACTION_DISCONNECT)
    reactCtx.startService(i)
    promise.resolve(null)
  }

  // RN requires these for NativeEventEmitter; the work is done by statusListener.
  @ReactMethod fun addListener(eventName: String) = Unit
  @ReactMethod fun removeListeners(count: Int) = Unit

  private fun startTunnel(cfg: ReadableMap) {
    val i = Intent(reactCtx, OqusVpnService::class.java)
      .setAction(OqusVpnService.ACTION_CONNECT)
      .putExtra(OqusVpnService.EXTRA_HOST, cfg.getString("host"))
      .putExtra(OqusVpnService.EXTRA_PORT, if (cfg.hasKey("port")) cfg.getInt("port") else 0)
      .putExtra(OqusVpnService.EXTRA_METHOD, cfg.getString("method"))
      .putExtra(OqusVpnService.EXTRA_PASSWORD, cfg.getString("password"))
      .putExtra(OqusVpnService.EXTRA_CITY, if (cfg.hasKey("city")) cfg.getString("city") else null)
    // A VPN's foreground service must be started as one from the background.
    reactCtx.startForegroundService(i)
  }

  private fun emit(status: String, detail: String?) {
    val payload = Arguments.createMap().apply {
      putString("status", status)
      putString("detail", detail)
    }
    if (!reactCtx.hasActiveReactInstance()) return
    reactCtx
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT, payload)
  }
}
