/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { WebSocketServer } from "ws";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "local-ws-audio-server",
      configureServer(server) {
        if (!server.httpServer) return;
        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on("upgrade", (req, socket, head) => {
          if (req.url?.startsWith("/api/ws/audio")) {
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit("connection", ws, req);
            });
          }
        });

        wss.on("connection", (ws) => {
          console.log("🔊 Local WS: Ljudström ansluten");
          ws.on("message", (msg) => {
            // Vidarebefordra ljudet till anslutna lyssnare
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(msg);
              }
            });
          });
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
