import React, { useState, useMemo } from "react";

export default function RoomSelector({
  features,
  selectedSheet,
  onSelectFeature,
  onNewRoom,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return features.slice(0, 15);
    const q = searchTerm.toLowerCase().trim();
    return features.filter((f) => {
      const sheet = String(f.SHEET || "").toLowerCase();
      const space = String(f.SPACE_NUMBER || "").toLowerCase();
      const struct = String(f.STRUCTURE_ID || "").toLowerCase();
      const region = String(f.REGION || "").toLowerCase();
      const insula = String(f.INSULA || "").toLowerCase();
      const entrance = String(f.ENTRANCE || "").toLowerCase();
      const desc = String(f.DESCRIPTION || "").toLowerCase();
      return (
        sheet.includes(q) ||
        space.includes(q) ||
        struct.includes(q) ||
        desc.includes(q) ||
        `${region}.${insula}.${entrance}`.includes(q)
      );
    });
  }, [features, searchTerm]);

  return (
    <div className="room-selector-box">
      <div className="selector-top-row">
        <div className="search-field-wrapper">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            className="room-search-input"
            placeholder="Search existing Pompeii rooms by Sheet #, Region.Insula.Entrance, or space name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearchTerm("");
                setIsOpen(false);
              }}
            >
              &times;
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn-new-room"
          onClick={() => {
            setIsOpen(false);
            onNewRoom();
          }}
        >
          <span>+</span> Log Brand New Room
        </button>
      </div>

      {isOpen && (
        <div className="dropdown-results">
          <div className="dropdown-header">
            <span>Matching Pompeii Records ({filtered.length})</span>
            <button
              type="button"
              className="close-dropdown-btn"
              onClick={() => setIsOpen(false)}
            >
              Close &times;
            </button>
          </div>
          <div className="dropdown-list">
            {filtered.length === 0 ? (
              <div className="dropdown-empty">No matching rooms found in catalog.</div>
            ) : (
              filtered.map((f) => {
                const isSelected = selectedSheet === f.SHEET;
                return (
                  <div
                    key={f.SHEET}
                    className={`dropdown-item ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onSelectFeature(f);
                      setIsOpen(false);
                    }}
                  >
                    <div className="item-sheet-badge">Sheet {f.SHEET}</div>
                    <div className="item-details">
                      <div className="item-title">
                        {f.SPACE_NUMBER || f.STRUCTURE_ID || "Unnamed Space"}
                      </div>
                      <div className="item-sub">
                        Reg {f.REGION || "—"} &bull; Insula {f.INSULA || "—"} &bull; Ent {f.ENTRANCE || "—"}
                        {f.STRUCTURE_ID ? ` &bull; ${f.STRUCTURE_ID}` : ""}
                      </div>
                    </div>
                    <div className="item-action">Select to Edit &rarr;</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
