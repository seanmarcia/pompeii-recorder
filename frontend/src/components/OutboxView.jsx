import React from "react";

export default function OutboxView({
  outbox,
  isOnline,
  onSync,
  isSyncing,
  onRemoveItem,
  onClearAll,
}) {
  return (
    <div className="outbox-view-container">
      <div className="outbox-header-row">
        <div>
          <h2 className="outbox-title">&#128235; Offline Outbox Queue</h2>
          <p className="outbox-desc">
            Submissions logged while offline are held safely on this device.
            When connected, sync them directly to the admin review queue.
          </p>
        </div>

        <div className="outbox-actions">
          {outbox.length > 0 && (
            <>
              <button
                type="button"
                className="btn-sync-all"
                disabled={!isOnline || isSyncing}
                onClick={onSync}
                title={isOnline ? "Send all outbox entries to admin review" : "Connect to the internet to sync"}
              >
                {isSyncing ? "Syncing..." : isOnline ? `Sync All Now (${outbox.length})` : "Offline (Connect to Sync)"}
              </button>
              <button
                type="button"
                className="btn-clear-outbox"
                onClick={onClearAll}
              >
                Clear Outbox
              </button>
            </>
          )}
        </div>
      </div>

      {outbox.length === 0 ? (
        <div className="outbox-empty-state">
          <div className="empty-icon">&#9989;</div>
          <h3>Outbox is empty</h3>
          <p>
            All field logs have been successfully sent to the admin review queue, or no offline entries are pending.
          </p>
        </div>
      ) : (
        <div className="outbox-cards-list">
          {outbox.map((item) => {
            const p = { ...(item.payload?._defaults || {}), ...(item.payload || {}) };
            const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
            return (
              <div key={item.clientId} className="outbox-item-card">
                <div className="outbox-item-main">
                  <div className="outbox-item-tags">
                    <span className={`tag-type ${item.actionType}`}>
                      {item.actionType === "create_new" ? "New Room Log" : "Room Update"}
                    </span>
                    <span className="tag-sheet">Sheet #{item.targetSheet || p.SHEET || "—"}</span>
                    <span className="tag-time">
                      Saved {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <h3 className="outbox-room-title">
                    {p.SPACE_NUMBER || p.STRUCTURE_ID || "Untitled Space"}
                  </h3>

                  <div className="outbox-room-meta">
                    <span>
                      Reg {p.REGION || "—"}.{p.INSULA || "—"}.{p.ENTRANCE || "—"}
                    </span>
                    &bull;
                    <span>Submitter: {item.submitterName}</span>
                    {photoCount > 0 && (
                      <>
                        &bull; <span>📷 {photoCount} photo(s) attached</span>
                      </>
                    )}
                  </div>

                  {item.submitterNotes && (
                    <div className="outbox-notes-box">
                      <strong>Field Notes:</strong> {item.submitterNotes}
                    </div>
                  )}

                  {/* Photo previews if dataUrls exist */}
                  {photoCount > 0 && (
                    <div className="outbox-photos-row">
                      {item.photos.map((photo, idx) => (
                        <div key={idx} className="outbox-photo-mini">
                          {photo.dataUrl ? (
                            <img src={photo.dataUrl} alt={photo.name} />
                          ) : (
                            <div className="outbox-no-thumb">📷 {photo.name}</div>
                          )}
                          <span className="outbox-photo-size">{photo.sizeFormatted || "<1MB"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="outbox-item-actions">
                  <button
                    type="button"
                    className="btn-remove-outbox-item"
                    onClick={() => onRemoveItem(item.clientId)}
                    title="Delete this pending submission"
                  >
                    &times; Discard
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
