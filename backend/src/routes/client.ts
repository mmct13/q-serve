import express from 'express';
import pool from '../db.ts';
import { Server, Socket } from 'socket.io';

// Créer une instance du routeur Express
const router = express.Router();

// Référence à l'instance Socket.io (doit être passée depuis index.ts)
let io: Server;

// Fonction pour définir l'instance Socket.io
export const setIo = (socketIo: Server) => {
  io = socketIo;
};

// Route pour enregistrer un nouveau client
router.post('/register', async (req, res) => {
  const { first_name, last_name } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, message: 'Prénom et nom requis' });
  }
  try {
    // Générer un numéro de ticket (dernier ticket + 1)
    const [lastTicket] = await pool.query('SELECT MAX(ticket_number) as max FROM queue') as any[];
    const ticket_number = (lastTicket[0].max || 0) + 1;
    const customer_name = `${first_name} ${last_name}`;

    // Insérer le nouveau client dans la file
    await pool.query(
      'INSERT INTO queue (customer_name, ticket_number, status) VALUES (?, ?, "waiting")',
      [customer_name, ticket_number]
    );

    // Émettre un événement WebSocket pour mettre à jour la file
    io.emit('queue-update', { ticket_number, customer_name, status: 'waiting' });

    res.json({ success: true, ticket_number, customer_name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour récupérer le statut d'un ticket
router.get('/status', async (req, res) => {
  const { ticket_number } = req.query;
  if (!ticket_number || isNaN(Number(ticket_number))) {
    return res.status(400).json({ success: false, message: 'Numéro de ticket invalide' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM queue WHERE ticket_number = ?', [ticket_number]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    }
    const ticket = rows[0];
    res.json({
      success: true,
      ticket: {
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        status: ticket.status,
        assigned_agent: ticket.assigned_agent || null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour récupérer tous les tickets (optionnel, pour débogage ou affichage)
router.get('/tickets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM queue ORDER BY created_at');
    res.json({ success: true, tickets: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;