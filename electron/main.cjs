// OqusVPN — Electron main process.
// Owns the app window and brokers connect/disconnect between the React UI and
// the native tunnel (TunnelManager). All privileged work happens here in the
// main process; the renderer only sends intents and receives status.
const { app, BrowserWindow, shell, ipcMain } = require("electron")
const path = require("node:path")
const { registerTunnelIpc } = require("./tunnel-ipc.cjs")

const isDev = process.env.OQUS_DEV === "1"
const DEV_URL = "http://localhost:5173"

/** @type {BrowserWindow | null} */
let win = null
const tunnel = registerTunnelIpc(() => win)

// Launch-at-startup (real: writes the OS login item, no admin needed).
ipcMain.handle("app:getAutoLaunch", () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle("app:setAutoLaunch", (_evt, on) => {
  app.setLoginItemSettings({ openAtLogin: !!on })
  return app.getLoginItemSettings().openAtLogin
})

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0f1220",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once("ready-to-show", () => win && win.show())

  // Open external links in the OS browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url)
    return { action: "deny" }
  })

  if (isDev) {
    win.loadURL(DEV_URL)
    win.webContents.openDevTools({ mode: "detach" })
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"))
  }
}

// --- app lifecycle ---------------------------------------------------------
app.whenReady().then(() => {
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Never leave a tunnel (routes/DNS) up after the app exits.
async function teardown() {
  try {
    await tunnel.disconnect()
  } catch {
    /* best effort */
  }
}

app.on("before-quit", teardown)
app.on("window-all-closed", async () => {
  await teardown()
  if (process.platform !== "darwin") app.quit()
})
