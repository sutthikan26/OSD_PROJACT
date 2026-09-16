import { defineConfig } from "vite";

const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:4000";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
