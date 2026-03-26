import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "LifeOS",
        short_name: "LifeOS",
        description: "Your personal productivity system",
        theme_color: "#4f46e5",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "/logo192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png"
          }
    ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://lifeos-backend-39pd.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
