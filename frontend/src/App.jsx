import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import Header from "./components/Header";
import RoomSelector from "./components/RoomSelector";
import FeatureForm from "./components/FeatureForm";
import BrowseView from "./components/BrowseView";
import OutboxView from "./components/OutboxView";
import Login from "./components/Login";
import LandingChoice from "./components/LandingChoice";
import { loadMasterFeatures, checkBackendStatus, syncOutbox, pullMasterFeatures } from "./lib/api";
import { getOutbox, removeFromOutbox, clearOutbox } from "./lib/storage";

export default function App() {
  // Auth persists in localStorage (not sessionStorage) so field researchers
  // stay logged in after fully closing the browser, not just reloading.
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("isAuthenticated") === "true"
  );
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || { username: "Researcher" };
    } catch {
      return { username: "Researcher" };
    }
  });

  const [features, setFeatures] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [actionType, setActionType] = useState("create_new");
  const [activeTab, setActiveTab] = useState("landing"); // 'landing' | 'form' | 'browse' | 'outbox'
  const [isOnline, setIsOnline] = useState(false);
  const [dataSource, setDataSource] = useState("loading...");
  const [outbox, setOutbox] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPullingRooms, setIsPullingRooms] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [notice, setNotice] = useState(null);

  const refreshData = useCallback(async () => {
    const result = await loadMasterFeatures();
    setFeatures(result.features);
    setIsOnline(result.isOnline);
    setDataSource(result.source);
  }, []);

  const refreshOutbox = useCallback(() => {
    setOutbox(getOutbox());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    refreshData();
    refreshOutbox();

    // Check backend health periodically
    const healthInterval = setInterval(async () => {
      const online = await checkBackendStatus();
      setIsOnline((prev) => {
        if (!prev && online) {
          // If we just reconnected, also refresh master catalog
          refreshData();
        }
        return online;
      });
    }, 10000);

    // Listen for storage outbox changes
    const onOutboxChange = () => refreshOutbox();
    window.addEventListener("pompeii_outbox_change", onOutboxChange);

    return () => {
      clearInterval(healthInterval);
      window.removeEventListener("pompeii_outbox_change", onOutboxChange);
    };
  }, [isAuthenticated, refreshData, refreshOutbox]);

  const showNotice = (msg, type = "info") => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setActiveTab("landing");
    showNotice(`Welcome, ${user.full_name || user.username || "Researcher"}. Field Recorder ready.`, "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    setIsAuthenticated(false);
    setSelectedFeature(null);
    setActiveTab("landing");
    showNotice("Signed out of Field Recorder.", "info");
  };

  const handlePullRooms = async () => {
    setIsPullingRooms(true);
    try {
      const result = await pullMasterFeatures();
      setFeatures(result.features);
      setDataSource("backend");
      showNotice(
        `✓ Successfully pulled ${result.count.toLocaleString()} rooms from the master archive!`,
        "success"
      );
    } catch (err) {
      showNotice(`Sync error: ${err.message}`, "error");
    } finally {
      setIsPullingRooms(false);
    }
  };

  const handleSelectFeature = (feat) => {
    setSelectedFeature(feat);
    setActionType("update_existing");
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewRoom = () => {
    setSelectedFeature(null);
    setActionType("create_new");
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOutbox();
      showNotice(result.message, "success");
      refreshOutbox();
      refreshData();
    } catch (err) {
      showNotice(`Sync failed: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFormSuccess = (result) => {
    if (result.isOffline) {
      showNotice("Saved to Offline Outbox. Will sync when server is reachable.", "warning");
    } else {
      showNotice("Submission successfully sent to the admin review queue!", "success");
    }
    refreshOutbox();

    // Back to the start page so they can begin a new sheet or edit another.
    setSelectedFeature(null);
    setActionType("create_new");
    setFormResetKey((k) => k + 1);
    setActiveTab("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveOutboxItem = (clientId) => {
    if (window.confirm("Are you sure you want to discard this pending submission?")) {
      removeFromOutbox(clientId);
      refreshOutbox();
      showNotice("Item removed from outbox.", "info");
    }
  };

  const handleClearOutbox = () => {
    if (window.confirm("Clear all items in the outbox? This cannot be undone.")) {
      clearOutbox();
      refreshOutbox();
      showNotice("Outbox cleared.", "info");
    }
  };

  // If not logged in, show Login page
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} isOnline={isOnline} />;
  }

  return (
    <div className="pompeii-app-wrapper">
      <Header
        isOnline={isOnline}
        outboxCount={outbox.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSync={handleSync}
        isSyncing={isSyncing}
        catalogCount={features.length}
        onPullRooms={handlePullRooms}
        isPullingRooms={isPullingRooms}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {notice && (
        <div className={`global-notice-bar ${notice.type}`}>
          <span>{notice.msg}</span>
          <button
            type="button"
            className="notice-close-btn"
            onClick={() => setNotice(null)}
          >
            &times;
          </button>
        </div>
      )}

      <main className="app-main-content">
        {activeTab === "landing" && (
          <LandingChoice onNewSheet={handleNewRoom} onEditSheet={() => setActiveTab("browse")} />
        )}

        {activeTab === "form" && (
          <div className="form-tab-layout">
            <RoomSelector
              features={features}
              selectedSheet={selectedFeature?.SHEET}
              onSelectFeature={handleSelectFeature}
              onNewRoom={handleNewRoom}
            />

            <FeatureForm
              initialFeature={selectedFeature}
              actionType={actionType}
              onSuccess={handleFormSuccess}
              isOnline={isOnline}
              formResetKey={formResetKey}
              currentUser={currentUser}
            />
          </div>
        )}

        {activeTab === "browse" && (
          <BrowseView
            features={features}
            onSelectFeature={handleSelectFeature}
            onNewRoom={handleNewRoom}
            dataSource={dataSource}
            onPullRooms={handlePullRooms}
            isPullingRooms={isPullingRooms}
            isOnline={isOnline}
          />
        )}

        {activeTab === "outbox" && (
          <OutboxView
            outbox={outbox}
            isOnline={isOnline}
            onSync={handleSync}
            isSyncing={isSyncing}
            onRemoveItem={handleRemoveOutboxItem}
            onClearAll={handleClearOutbox}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            Food And Drink in Ancient Pompeii &bull; Field Recorder &bull; Compatible with Pompeii Excavation Master Sheets
          </p>
          <p className="footer-sub">
            All photos compressed client-side &lt; 1MB &bull; Offline-first resilient architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
