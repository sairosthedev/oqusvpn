// Where the mobile app finds your OqusVPN backend.
//
// IMPORTANT: a phone cannot reach "localhost" — that's the phone itself. Use one
// of these for API_BASE:
//   • Dev, phone on same Wi-Fi as your PC:  http://<your-PC-LAN-IP>:8080
//       (find it with `ipconfig` → IPv4 Address, e.g. http://192.168.1.20:8080)
//   • Android emulator reaching a PC backend: http://10.0.2.2:8080
//   • Production: your deployed backend URL,  https://api.oqus.app
//
// You can also override at runtime without a rebuild via EXPO_PUBLIC_OQUS_API.
export const API_BASE =
  process.env.EXPO_PUBLIC_OQUS_API || "http://192.168.100.15:8080"
