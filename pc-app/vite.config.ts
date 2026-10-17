import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    dedupe: ['yjs', '@tiptap/pm'],
  },

  css: {
    // Isolate pc-app CSS pipeline from root Next.js postcss.config.mjs
    postcss: {},
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  root: ".",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: [
        "**/src-tauri/**",
        "**/.git/**",
        "**/dist/**",
        "../.next/**",
        "../node_modules/**",
      ],
    },
  },
}));