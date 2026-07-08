// Bridge exposed to the React renderer as `window.oqus`.
// contextIsolation keeps Node out of the page; only these typed calls cross over.
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("oqus", {
  /**
   * Start the tunnel for a server.
   * @param {{ host: string, port: number, password: string, method: string,
   *           id?: string, city?: string }} config
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  connect: (config) => ipcRenderer.invoke("vpn:connect", config),

  /** Tear the tunnel down. @returns {Promise<{ ok: boolean, error?: string }>} */
  disconnect: () => ipcRenderer.invoke("vpn:disconnect"),

  /** Current status snapshot. @returns {Promise<{ status: string, detail?: string }>} */
  getStatus: () => ipcRenderer.invoke("vpn:getStatus"),

  /**
   * Subscribe to tunnel status pushes.
   * @param {(payload: { status: string, detail?: string }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onStatus: (cb) => {
    const listener = (_evt, payload) => cb(payload)
    ipcRenderer.on("vpn:status", listener)
    return () => ipcRenderer.removeListener("vpn:status", listener)
  },

  /**
   * Subscribe to real throughput pushes (Mb/s) while connected.
   * @param {(payload: { down: number, up: number }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onThroughput: (cb) => {
    const listener = (_evt, payload) => cb(payload)
    ipcRenderer.on("vpn:throughput", listener)
    return () => ipcRenderer.removeListener("vpn:throughput", listener)
  },

  /**
   * Subscribe to finished-session usage (bytes + duration) on disconnect.
   * @param {(p: { serverId: string, bytesDown: number, bytesUp: number, durationSec: number }) => void} cb
   * @returns {() => void} unsubscribe
   */
  onSession: (cb) => {
    const listener = (_evt, payload) => cb(payload)
    ipcRenderer.on("vpn:session", listener)
    return () => ipcRenderer.removeListener("vpn:session", listener)
  },

  /** Arm/disarm the kill switch live while connected. */
  setKillSwitch: (on) => ipcRenderer.invoke("vpn:setKillSwitch", on),

  /** Launch-at-startup (OS login item). */
  getAutoLaunch: () => ipcRenderer.invoke("app:getAutoLaunch"),
  setAutoLaunch: (on) => ipcRenderer.invoke("app:setAutoLaunch", on),
})
