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
})
