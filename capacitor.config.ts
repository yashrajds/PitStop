import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pitstop.app",
  appName: "Pitstop",
  webDir: "dist",
  // Localhost API (via `adb reverse`) + dev live-reload need cleartext on Android.
  server: {
    cleartext: true,
    // Uncomment for live-reload on the emulator instead of the bundled build:
    // url: "http://10.0.2.2:8443",
  },
};

export default config;
