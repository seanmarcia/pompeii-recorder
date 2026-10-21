import React, { useState, useMemo } from "react";

const SOURCE_LABELS = {
  backend: "database",
  cache: "saved on this device",
  localStorage: "saved on this device",
  bundled_fallback: "built-in copy",
  none: "none",
};

export default function BrowseView({
  features,
  onSelectFeature,
  onViewFeature,
  onNewRoom,
  dataSource,
  onPullRooms,
  isPullingRooms,
  isOnline,
}) {
  const [filterRegion, setFilterRegion] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const regions = useMemo(() => {
    const set = new Set();
    features.forEach((f) => {
      if (f.REGION) set.add(f.REGION);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [features]);

  const filtered = useMemo(() => {
    return features.filter((f) => {
      if (filterRegion !== "ALL" && f.REGION !== filterRegion) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        String(f.SHEET || "").toLowerCase().includes(q) ||
        String(f.SPACE_NUMBER || "").toLowerCase().includes(q) ||
        String(f.STRUCTURE_ID || "").toLowerCase().includes(q) ||
        String(f.DESCRIPTION || "").toLowerCase().includes(q) ||
        `${f.REGION}.${f.INSULA}.${f.ENTRANCE}`.includes(q)
      );
    });
  }, [features, filterRegion, searchQuery]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(features, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pompeii_rooms_master.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="browse-view-container">
      <div className="browse-controls-bar">
        <div className="browse-search-wrapper">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            className="browse-search-input"
            placeholder="Search Pompeii catalog by sheet, room, structure, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="browse-actions-group">
          <div className="region-filter-group">
            <span className="filter-label">Region:</span>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="region-select"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === "ALL" ? "All Regions" : `Region ${r}`}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-pull-rooms-browse"
            onClick={onPullRooms}
            disabled={!isOnline || isPullingRooms}
            title="Download the latest rooms from the database"
          >
            {isPullingRooms ? "⏳ Syncing..." : "⬇️ Sync Database Updates"}
          </button>

          <button
            type="button"
            className="btn-export-json"
            onClick={downloadJson}
            title="Download full JSON file of Pompeii rooms"
          >
            &#8681; Export JSON ({features.length})
          </button>

          <button
            type="button"
            className="btn-new-room-primary"
            onClick={onNewRoom}
          >
            + Log New Room
          </button>
        </div>
      </div>

      <div className="browse-meta-banner">
        <span>
          Showing <strong>{filtered.length}</strong> of {features.length} Pompeii room records
          (Data source: <code className="source-code">{SOURCE_LABELS[dataSource] || dataSource}</code>)
        </span>
      </div>

      <div className="features-card-grid">
        {filtered.map((f) => {
          const photoCount = Array.isArray(f.photos) ? f.photos.length : 0;
          return (
            <div key={f.SHEET} className="room-catalog-card">
              <div className="card-top-header">
                <span className="card-sheet-tag">Sheet #{f.SHEET}</span>
                <span className="card-address-tag">
                  {f.REGION ? `Reg ${f.REGION}.${f.INSULA || "—"}.${f.ENTRANCE || "—"}` : "Unlocated"}
                </span>
              </div>

              <h3 className="card-space-title">
                {f.SPACE_NUMBER || f.STRUCTURE_ID || "Unnamed Room / Space"}
              </h3>

              <div className="card-meta-row">
                {f.STRUCTURE_ID && <span className="meta-pill struct">{f.STRUCTURE_ID}</span>}
                {f.FEATURE_TYPE_ID && <span className="meta-pill type">{f.FEATURE_TYPE_ID}</span>}
                {f.CATEGORY_ID && <span className="meta-pill category">{f.CATEGORY_ID}</span>}
                {photoCount > 0 && <span className="meta-pill photo">📷 {photoCount}</span>}
              </div>

              {f.DESCRIPTION && (
                <p className="card-description-snippet">
                  {f.DESCRIPTION.length > 160
                    ? `${f.DESCRIPTION.substring(0, 160)}...`
                    : f.DESCRIPTION}
                </p>
              )}

              <div className="card-footer-actions">
                <button
                  type="button"
                  className="btn-edit-room"
                  onClick={() => onViewFeature(f)}
                >
                  View Sheet
                </button>
                <button
                  type="button"
                  className="btn-edit-room"
                  onClick={() => onSelectFeature(f)}
                >
                  &#9998; Edit / Log Updates &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
