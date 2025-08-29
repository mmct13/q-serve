"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Ticket {
  ticket_number: number;
  customer_name: string;
  status: "waiting" | "in_service" | "done";
  assigned_agent: string | null;
  created_at: string;
}

export default function DisplayPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [lastCalled, setLastCalled] = useState<Ticket | null>(null);
  const [error, setError] = useState<string>("");
  const socketRef = useRef<Socket | null>(null);
  const lastAnnouncedRef = useRef<number | null>(null);

  // Récupérer les tickets initiaux
  const fetchTickets = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/client/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        // Trouver le dernier ticket appelé (in_service, le plus récent)
        const calledTickets = data.tickets.filter(
          (t: Ticket) => t.status === "in_service"
        );
        if (calledTickets.length > 0) {
          const latestCalled = calledTickets.reduce(
            (latest: Ticket, current: Ticket) =>
              new Date(latest.created_at) > new Date(current.created_at)
                ? latest
                : current
          );
          setLastCalled(latestCalled);
        } else {
          setLastCalled(null);
        }
      } else {
        setError(data.message || "Erreur lors de la récupération des tickets");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des tickets", error);
      setError("Erreur serveur");
    }
  };

  // Annoncer vocalement un ticket appelé
  const announceTicket = (ticket: Ticket) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Web Speech API non supportée dans ce navigateur");
      return;
    }
    if (lastAnnouncedRef.current === ticket.ticket_number) {
      return; // Éviter les annonces répétées
    }
    const message = `Client numéro ${ticket.ticket_number}, veuillez vous présenter au guichet ${ticket.assigned_agent}`;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "fr-FR";
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    lastAnnouncedRef.current = ticket.ticket_number;
  };

  // Configurer WebSocket pour mises à jour en temps réel
  useEffect(() => {
    socketRef.current = io("http://localhost:3001", {
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on("connect", () => {
      console.log("Connecté au serveur WebSocket (display)");
    });

    socketRef.current.on(
      "queue-update",
      (data: {
        ticket_number: number;
        status: string;
        agent_name?: string;
      }) => {
        fetchTickets();
        // Annoncer si un nouveau ticket passe à in_service
        if (data.status === "in_service" && data.agent_name) {
          const newCalledTicket: Ticket = {
            ticket_number: data.ticket_number,
            customer_name: "",
            status: "in_service",
            assigned_agent: data.agent_name,
            created_at: new Date().toISOString(),
          };
          announceTicket(newCalledTicket);
        }
      }
    );

    socketRef.current.on("connect_error", (err) => {
      console.error("Erreur de connexion WebSocket", err);
      setError("Impossible de se connecter au serveur en temps réel");
    });

    // Charger les tickets initiaux
    fetchTickets();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Filtrer les tickets en attente
  const waitingTickets = tickets.filter(
    (ticket) => ticket.status === "waiting"
  );

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Écran d'affichage
        </h1>
        {error && (
          <div className="alert alert-error mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="text-2xl font-semibold">Dernier client appelé</h2>
            {lastCalled ? (
              <div className="text-center">
                <p className="text-lg mt-2">
                  Numéro :{" "}
                  <span className="font-bold">#{lastCalled.ticket_number}</span>
                </p>
                <p className="text-lg mt-2">
                  Guichet :{" "}
                  <span className="font-bold">{lastCalled.assigned_agent}</span>
                </p>
              </div>
            ) : (
              <div className="alert alert-info mt-4">
                <span>Aucun client appelé pour le moment</span>
              </div>
            )}
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="text-2xl font-semibold">Clients en attente</h2>
            {waitingTickets.length === 0 ? (
              <div className="alert alert-info mt-4">
                <span>Aucune file d'attente</span>
              </div>
            ) : (
              <div className="marquee">
                <div className="marquee-content">
                  {waitingTickets.map((ticket) => (
                    <div
                      key={ticket.ticket_number}
                      className="badge badge-outline badge-lg mx-2"
                    >
                      #{ticket.ticket_number} - {ticket.customer_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
