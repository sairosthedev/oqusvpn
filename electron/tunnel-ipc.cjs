// Shared tunnel IPC wiring, used by both the real main process (main.cjs) and
// the e2e harness (e2e.cjs). Creates a TunnelManager, registers the vpn:*
// handlers, and forwards status pushes to the current window.
const { ipcMain } = require("electron")
const { TunnelManager } = require("./tunnel.cjs")

function registerTunnelIpc(getWindow) {
  const tunnel = new TunnelManager()

  tunnel.on("status", (payload) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send("vpn:status", payload)
  })

  tunnel.on("throughput", (payload) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send("vpn:throughput", payload)
  })

  tunnel.on("session", (payload) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.send("vpn:session", payload)
  })

  ipcMain.handle("vpn:connect", async (_evt, config) => {
    try {
      await tunnel.connect(config)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) }
    }
  })

  ipcMain.handle("vpn:disconnect", async () => {
    try {
      await tunnel.disconnect()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) }
    }
  })

  ipcMain.handle("vpn:getStatus", () => tunnel.getStatus())

  ipcMain.handle("vpn:setKillSwitch", async (_evt, on) => {
    try {
      await tunnel.setKillSwitch(!!on)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) }
    }
  })

  return tunnel
}

module.exports = { registerTunnelIpc }
