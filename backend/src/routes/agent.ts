import express from "express";
import pool from "../db.ts";
import { Server } from "socket.io";

// Créer une instance du routeur Express
const router = express.Router();

// Référence à l'instance Socket.io (doit être passée depuis index.ts)
let io: Server;

// Fonction pour définir l'instance Socket.io
export const setIo = (socketIo: Server) => {
  io = socketIo;
};

// Route pour l'authentification d'un agent
router.post("/login", async (req, res) => {
  const { name, password } = req.body;
  try {
    const [rows] = (await pool.query("SELECT * FROM agents WHERE name = ?", [
      name,
    ])) as any[];
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Agent inconnu" });
    }
    const agent = rows[0];
    if (agent.password !== password) {
      return res
        .status(401)
        .json({ success: false, message: "Mot de passe incorrect" });
    }
    // Mettre à jour le statut à 'available' après connexion
    await pool.query('UPDATE agents SET status = "available" WHERE id = ?', [
      agent.id,
    ]);
    res.json({
      success: true,
      agent: { id: agent.id, name: agent.name, status: agent.status },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Route pour récupérer la liste des clients en attente et en service
router.get("/queue", async (req, res) => {
  const { agent_name } = req.query;
  try {
    // Récupérer les clients en attente (tous) et en service (assignés à l'agent)
    const [rows] = await pool.query(
      'SELECT * FROM queue WHERE status = "waiting" OR (status = "in_service" AND assigned_agent = ?) ORDER BY created_at',
      [agent_name]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Route pour appeler un client
router.post("/call", async (req, res) => {
  const { ticket_number, agent_name } = req.body;
  try {
    const [agentRows] = (await pool.query(
      "SELECT status FROM agents WHERE name = ?",
      [agent_name]
    )) as any[];
    if (agentRows.length === 0 || agentRows[0].status === "unavailable") {
      return res
        .status(403)
        .json({ success: false, message: "Agent non disponible" });
    }
    const [queueRows] = (await pool.query(
      'SELECT * FROM queue WHERE ticket_number = ? AND status = "waiting"',
      [ticket_number]
    )) as any[];
    if (queueRows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Ticket non trouvé ou déjà en service",
        });
    }
    await pool.query(
      'UPDATE queue SET status = "in_service", assigned_agent = ? WHERE ticket_number = ?',
      [agent_name, ticket_number]
    );
    await pool.query('UPDATE agents SET status = "busy" WHERE name = ?', [
      agent_name,
    ]);
    io.emit("queue-update", {
      ticket_number,
      agent_name,
      status: "in_service",
    });
    io.emit("agent-status-update", { name: agent_name, status: "busy" });
    res.json({ success: true, ticket_number, agent_name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Route pour terminer un service
router.post("/complete", async (req, res) => {
  const { ticket_number, agent_name } = req.body;
  try {
    const [queueRows] = (await pool.query(
      "SELECT * FROM queue WHERE ticket_number = ? AND assigned_agent = ?",
      [ticket_number, agent_name]
    )) as any[];
    if (queueRows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Ticket non trouvé ou non assigné à cet agent",
        });
    }
    await pool.query(
      'UPDATE queue SET status = "done" WHERE ticket_number = ? AND assigned_agent = ?',
      [ticket_number, agent_name]
    );
    await pool.query('UPDATE agents SET status = "available" WHERE name = ?', [
      agent_name,
    ]);
    io.emit("queue-update", { ticket_number, status: "done" });
    io.emit("agent-status-update", { name: agent_name, status: "available" });
    res.json({ success: true, ticket_number });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Route pour récupérer le statut d'un agent
router.get("/status", async (req, res) => {
  const { name } = req.query;
  try {
    const [rows] = (await pool.query(
      "SELECT status FROM agents WHERE name = ?",
      [name]
    )) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Agent inconnu" });
    }
    res.json({ success: true, status: rows[0].status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

// Route pour mettre à jour le statut d'un agent
router.post("/status", async (req, res) => {
  const { name, status } = req.body;
  if (!["available", "busy", "unavailable"].includes(status)) {
    return res.status(400).json({ success: false, message: "Statut invalide" });
  }
  try {
    const [agentRows] = (await pool.query(
      "SELECT * FROM agents WHERE name = ?",
      [name]
    )) as any[];
    if (agentRows.length === 0) {
      return res.status(404).json({ success: false, message: "Agent inconnu" });
    }
    await pool.query("UPDATE agents SET status = ? WHERE name = ?", [
      status,
      name,
    ]);
    io.emit("agent-status-update", { name, status });
    res.json({ success: true, status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
});

export default router;
