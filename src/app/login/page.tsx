"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("agentName", data.agent.name); // Stockage temporaire
        router.push("/agent");
      } else {
        setError(data.message || "Erreur de connexion");
      }
    } catch (error) {
      setError("Erreur serveur");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-center mb-6">
            Connexion Agent
          </h1>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nom d’agent</span>
            </label>
            <input
              type="text"
              placeholder="Entrez votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Mot de passe</span>
            </label>
            <input
              type="password"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          <div className="form-control mt-6">
            <button onClick={handleLogin} className="btn btn-primary w-full">
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
