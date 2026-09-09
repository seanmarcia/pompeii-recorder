import React from "react";

export default function Header({
  isOnline,
  outboxCount,
  activeTab,
  setActiveTab,
  onSync,
  isSyncing,
  catalogCount,
  onPullRooms,
  isPullingRooms,
  currentUser,
  onLogout,
}) {
  return (
    <header className="app-header">
      <div className="header-container">
        <button
          type="button"
          className="brand-section brand-section-btn"
          onClick={() => setActiveTab("landing")}
          title="Return to landing page"
        >
          <div className="brand-icon">&#9928;</div>
          <div>
            <h1 className="brand-title">POMPEII FIELD RECORDER</h1>
            <p className="brand-sub">Pompeii Food and Drink Research</p>
          </div>
        </button>

        <div className="header-center">
          <nav className="header-nav">
            <button
              type="button"
              className={`nav-btn ${activeTab === "form" ? "active" : ""}`}
              onClick={() => setActiveTab("form")}
            >
              <span>&#9998;</span> Record / Update Room
            </button>
            <button
              type="button"
              className={`nav-btn ${activeTab === "browse" ? "active" : ""}`}
              onClick={() => setActiveTab("browse")}
            >
              <span>&#128269;</span> Browse Rooms ({catalogCount})
            </button>
            <button
              type="button"
              className={`nav-btn ${activeTab === "outbox" ? "active" : ""}`}
              onClick={() => setActiveTab("outbox")}
            >
              <span>&#128235;</span> Outbox
              {outboxCount > 0 && <span className="outbox-badge">{outboxCount}</span>}
            </button>
          </nav>
        </div>

        <div className="header-status-section">
          <div
            className={`status-pill ${isOnline ? "online" : "offline"}`}
            title={
              isOnline
                ? "Connected to Rails Review Server (localhost:3000)"
                : "Offline mode: Submissions saved locally in browser storage"
            }
          >
            <span className="status-dot"></span>
            <span className="status-text">{isOnline ? "Rails Online" : "Offline Mode"}</span>
          </div>

          {/* Prominent Pull / Sync Rooms from Rails button */}
          {isOnline && (
            <button
              type="button"
              className="pull-rooms-btn"
              onClick={onPullRooms}
              disabled={isPullingRooms}
              title="Download latest verified master Pompeii rooms catalog from Rails"
            >
              <span className={isPullingRooms ? "spinner-mini" : ""}>
                {isPullingRooms ? "⏳" : "⬇️"}
              </span>
              <span>{isPullingRooms ? "Updating..." : "Update Latest Data"}</span>
            </button>
          )}

          {outboxCount > 0 && isOnline && (
            <button
              type="button"
              className="sync-btn"
              onClick={onSync}
              disabled={isSyncing}
              title="Sync pending submissions to Rails review queue"
            >
              {isSyncing ? "Syncing..." : `Sync Outbox (${outboxCount})`}
            </button>
          )}

          <div className="user-profile-widget">
            <span className="user-tag" title="Authenticated field researcher">
              👤 {currentUser?.username || "Researcher"}
            </span>
            <button
              type="button"
              className="signout-btn"
              onClick={onLogout}
              title="Sign out of field recorder"
            >
              Sign Out
            </button>
          </div>

          {currentUser?.role === "admin" && (
            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noreferrer"
              className="admin-portal-link"
              title="Open Rails Admin Review Portal in new tab"
            >
              Admin Queue &rarr;
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
