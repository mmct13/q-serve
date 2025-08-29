"use client";

import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

interface Ticket {
  ticket_number: number;
  customer_name: string;
  status: "waiting" | "in_service" | "done";
  assigned_agent: string | null;
}

export default function ClientPage() {
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Charger le ticket depuis localStorage au montage
  useEffect(() => {
    const savedTicket = localStorage.getItem("ticket");
    if (savedTicket) {
      try {
        const parsedTicket: Ticket = JSON.parse(savedTicket);
        setTicket(parsedTicket);
        fetchTicketStatus(parsedTicket.ticket_number);
      } catch (err) {
        console.error(
          "Erreur lors du parsing du ticket dans localStorage",
          err
        );
        localStorage.removeItem("ticket");
      }
    }
  }, []);

  // Configurer WebSocket pour les mises à jour en temps réel
  useEffect(() => {
    if (!ticket) return;

    const newSocket = io("http://localhost:3001", {
      reconnection: true,
      reconnectionAttempts: 5,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connecté au serveur WebSocket");
    });

    newSocket.on(
      "queue-update",
      (data: {
        ticket_number: number;
        status: string;
        agent_name?: string;
      }) => {
        if (data.ticket_number === ticket.ticket_number) {
          fetchTicketStatus(ticket.ticket_number);
        }
      }
    );

    newSocket.on("connect_error", (err) => {
      console.error("Erreur de connexion WebSocket", err);
      setError("Impossible de se connecter au serveur en temps réel");
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [ticket]);

  // Enregistrer un nouveau client
  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Veuillez entrer votre prénom et nom.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/client/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newTicket: Ticket = {
          ticket_number: data.ticket_number,
          customer_name: data.customer_name,
          status: "waiting",
          assigned_agent: null,
        };
        setTicket(newTicket);
        localStorage.setItem("ticket", JSON.stringify(newTicket));
        setFirstName("");
        setLastName("");
      } else {
        setError(data.message || "Erreur lors de l’enregistrement");
      }
    } catch (error) {
      console.error("Erreur lors de l’enregistrement", error);
      setError("Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer le statut du ticket
  const fetchTicketStatus = async (ticketNumber: number) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/client/status?ticket_number=${ticketNumber}`
      );
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        localStorage.setItem("ticket", JSON.stringify(data.ticket));
      } else {
        setError(data.message || "Erreur lors de la récupération du statut");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut", error);
      setError("Erreur serveur");
    }
  };

  // Réinitialiser le ticket
  const handleReset = () => {
    if (socket) {
      socket.disconnect();
    }
    setTicket(null);
    setSocket(null);
    localStorage.removeItem("ticket");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-center mb-6">
            Portail Client
          </h1>
          {error && (
            <div className="alert alert-error mb-4">
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
          {!ticket ? (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Prénom</span>
                </label>
                <input
                  type="text"
                  placeholder="Entrez votre prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input input-bordered w-full"
                  disabled={isLoading}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nom</span>
                </label>
                <input
                  type="text"
                  placeholder="Entrez votre nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input input-bordered w-full"
                  disabled={isLoading}
                />
              </div>
              <div className="form-control mt-6">
                <button
                  onClick={handleRegister}
                  className="btn btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner"></span>
                  ) : (
                    "Prendre un ticket"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Votre ticket</h2>
              <p className="mb-2">Nom : {ticket.customer_name}</p>
              <p className="mb-2">
                Numéro de ticket :{" "}
                <span className="font-bold">#{ticket.ticket_number}</span>
              </p>
              <p className="mb-2">
                Statut :{" "}
                <span
                  className={
                    ticket.status === "waiting"
                      ? "badge badge-warning"
                      : ticket.status === "in_service"
                      ? "badge badge-primary"
                      : "badge badge-success"
                  }
                >
                  {ticket.status === "waiting"
                    ? "En attente"
                    : ticket.status === "in_service"
                    ? "En service"
                    : "Terminé"}
                </span>
              </p>
              {ticket.status === "in_service" && ticket.assigned_agent && (
                <p className="mb-2">Guichet : {ticket.assigned_agent}</p>
              )}
              <button
                onClick={handleReset}
                className="btn btn-outline btn-error mt-6"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
