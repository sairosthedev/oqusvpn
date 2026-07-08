import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  // Relative base so the built index.html loads its assets over file:// inside Electron.
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // The desktop/consumer VPN app…
        main: path.resolve(__dirname, "index.html"),
        // …and the standalone admin console (web only).
        admin: path.resolve(__dirname, "admin.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
})
