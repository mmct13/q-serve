"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

interface QueueItem {
  id: number;
  customer_name: string;
  ticket_number: number;
  status: "waiting" | "in_service" | "done";
  assigned_agent?: string;
}

export default function AgentDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>("unavailable");
  const router = useRouter();

  // Vérifier si l’agent est connecté
  useEffect(() => {
    const name = localStorage.getItem("agentName");
    if (!name) {
      router.push("/login");
    } else {
      setAgentName(name);
      fetchQueue(name);
      fetchAgentStatus(name);
    }
  }, [router]);

  // Récupérer la file d’attente (waiting + in_service pour cet agent)
  const fetchQueue = async (agentName: string) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/agent/queue?agent_name=${agentName}`
      );
      const data = await res.json();
      setQueue(data);
    } catch (error) {
      console.error("Erreur lors de la récupération de la file", error);
    }
  };

  // Récupérer le statut de l’agent
  const fetchAgentStatus = async (name: string) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/agent/status?name=${name}`
      );
      const data = await res.json();
      if (data.success) {
        setAgentStatus(data.status);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut", error);
    }
  };

  // Appeler un client
  const handleCall = async (ticket_number: number) => {
    if (agentStatus === "unavailable") {
      alert(
        "Vous êtes indisponible. Changez votre statut pour appeler un client."
      );
      return;
    }
    try {
      const res = await fetch("http://localhost:3001/api/agent/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_number, agent_name: agentName }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error("Erreur lors de l’appel", error);
      alert("Erreur serveur");
    }
  };

  // Terminer un service
  const handleComplete = async (ticket_number: number) => {
    try {
      const res = await fetch("http://localhost:3001/api/agent/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_number, agent_name: agentName }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la complétion", error);
      alert("Erreur serveur");
    }
  };

  // Changer le statut de l’agent
  const handleStatusChange = async (
    newStatus: "available" | "busy" | "unavailable"
  ) => {
    try {
      const res = await fetch("http://localhost:3001/api/agent/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agentName, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setAgentStatus(newStatus);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Erreur lors du changement de statut", error);
      alert("Erreur serveur");
    }
  };

  // WebSocket pour mises à jour en temps réel
  useEffect(() => {
    if (!agentName) return;
    const socket = io("http://localhost:3001");
    socket.on("queue-update", () => {
      fetchQueue(agentName);
    });
    socket.on(
      "agent-status-update",
      (data: { name: string; status: string }) => {
        if (data.name === agentName) {
          setAgentStatus(data.status);
        }
      }
    );
    return () => {
      socket.disconnect();
    };
  }, [agentName]);

  if (!agentName) return null;

  // Séparer les clients en attente et en service
  const waitingClients = queue.filter((item) => item.status === "waiting");
  const inServiceClients = queue.filter(
    (item) => item.status === "in_service" && item.assigned_agent === agentName
  );

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="text-3xl font-bold">
              Tableau de bord Agent : {agentName}
            </h1>
            <div className="mt-4">
              <h2 className="text-xl font-semibold">
                Statut actuel : {agentStatus}
              </h2>
              <div className="btn-group mt-2">
                <button
                  className={`btn ${
                    agentStatus === "available" ? "btn-success" : "btn-outline"
                  }`}
                  onClick={() => handleStatusChange("available")}
                >
                  Disponible
                </button>
                <button
                  className={`btn ${
                    agentStatus === "busy" ? "btn-warning" : "btn-outline"
                  }`}
                  onClick={() => handleStatusChange("busy")}
                  disabled={agentStatus === "available"}
                >
                  Occupé
                </button>
                <button
                  className={`btn ${
                    agentStatus === "unavailable" ? "btn-error" : "btn-outline"
                  }`}
                  onClick={() => handleStatusChange("unavailable")}
                >
                  Indisponible
                </button>
              </div>
            </div>
            <h2 className="text-xl font-semibold mt-6">Clients en attente</h2>
            {waitingClients.length === 0 ? (
              <div className="alert alert-info mt-4">
                <span>Aucun client en attente</span>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Ticket</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingClients.map((item) => (
                      <tr key={item.id}>
                        <td>{item.customer_name}</td>
                        <td>#{item.ticket_number}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm mr-2"
                            onClick={() => handleCall(item.ticket_number)}
                            disabled={agentStatus === "unavailable"}
                          >
                            Appeler
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h2 className="text-xl font-semibold mt-6">Clients en service</h2>
            {inServiceClients.length === 0 ? (
              <div className="alert alert-info mt-4">
                <span>Aucun client en service</span>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Ticket</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inServiceClients.map((item) => (
                      <tr key={item.id}>
                        <td>{item.customer_name}</td>
                        <td>#{item.ticket_number}</td>
                        <td>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleComplete(item.ticket_number)}
                          >
                            Terminer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              className="btn btn-outline btn-error mt-6"
              onClick={() => {
                localStorage.removeItem("agentName");
                router.push("/login");
              }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
