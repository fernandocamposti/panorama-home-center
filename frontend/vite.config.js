import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev local, o Vite roda na porta 5173 e proxeia /api para a API do
// Panorama rodando localmente (ajuste a porta se necessário). Em produção,
// o build estático é servido pelo Nginx do próprio container, que já faz
// esse proxy (ver nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
