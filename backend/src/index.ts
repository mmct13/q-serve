import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import agentRoutes, { setIo as setAgentIo } from "./routes/agent.ts";
import clientRoutes, { setIo as setClientIo } from "./routes/client.ts";

const app = express();
const port = 3001;

// Configurer CORS pour autoriser les requêtes depuis le frontend Next.js
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Route de santé pour vérifier que l'API fonctionne
app.get("/health", (req, res) => {
  res.json({ status: "API is running" });
});

// Créer le serveur HTTP et intégrer Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },
});

// Passer l'instance Socket.io aux routes
setAgentIo(io);
setClientIo(io);

// Gestion des connexions WebSocket
io.on("connection", (socket) => {
  console.log("Client connecté");
  socket.on("disconnect", () => console.log("Client déconnecté"));
});

// Utiliser les routes
app.use("/api/agent", agentRoutes);
app.use("/api/client", clientRoutes);

// Lancer le serveur
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
