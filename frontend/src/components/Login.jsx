import React, { useState } from "react";
import "./Login.css";
import { loginClient } from "../lib/api";

export default function Login({ onLogin, isOnline }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginClient(username, password);
      if (result.success) {
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("currentUser", JSON.stringify(result.user || { username }));
        onLogin(result.user || { username });
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch (err) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="client-login-container">
      <div className="client-login-card">
        <div className="client-login-header">
          <div className="client-login-icon">&#9928;</div>
          <h1>FOOD AND DRINK IN ANCIENT POMPEII</h1>
          <p className="client-login-subtitle">Field Recorder</p>
          <div className="client-login-status">
            <span className={`status-dot ${isOnline ? "online" : "offline"}`}></span>
            <span>{isOnline ? "Database Connected" : "Field Mode (Offline Active)"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="client-login-form">
          <div className="client-form-group">
            <label htmlFor="client-username">Username</label>
            <input
              id="client-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="first and last name, e.g. serabaker"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="client-form-group">
            <label htmlFor="client-password">Password</label>
            <input
              id="client-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className="client-login-error">{error}</div>}

          <button type="submit" className="client-login-button" disabled={isLoading}>
            {isLoading ? "Verifying Credentials..." : "Authenticate & Enter Field Recorder →"}
          </button>
        </form>

      </div>
    </div>
  );
}
