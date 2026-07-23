import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// HOSPITAL 2 (AarogyaEHR) frontend runs on port 3001. Any request to /api is
// proxied to Hospital 2's Django backend on port 8001. This keeps Hospital 2
// fully independent from Hospital 1 (which uses 3000 -> 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3001,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
