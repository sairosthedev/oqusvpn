// Tiny persisted key/value over AsyncStorage — the RN equivalent of the web
// app's localStorage.
import AsyncStorage from "@react-native-async-storage/async-storage"

const TOKEN_KEY = "oqus.token"
const ONBOARDED_KEY = "oqus.onboarded"

export const storage = {
  getToken: () => AsyncStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => AsyncStorage.setItem(TOKEN_KEY, t),
  clearToken: () => AsyncStorage.removeItem(TOKEN_KEY),
  getOnboarded: async () => (await AsyncStorage.getItem(ONBOARDED_KEY)) === "1",
  setOnboarded: () => AsyncStorage.setItem(ONBOARDED_KEY, "1"),
}
