import express from "express";
import { createServer } from "http";
import { setupWebSocket } from "./ws";

const app = express();
const server = createServer(app);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

setupWebSocket(server);

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
