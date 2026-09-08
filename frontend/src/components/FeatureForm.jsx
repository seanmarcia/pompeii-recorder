import React, { useState, useEffect } from "react";
import PhotoUploader from "./PhotoUploader";
import { submitFeature } from "../lib/api";

const REGION_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "Suburban"];

const SHEET_TYPE_OPTIONS = ["Feature", "Space", "Area", "Deposit", "Structure", "Other"];

const CATEGORY_OPTIONS = [
  "Food preparation",
  "Production",
  "Architectural Element",
  "Water catchment",
  "Commercial Service",
  "Storage",
  "Circulation",
  "Religious / Cult",
  "Sanitary",
  "Decoration",
  "Other",
];

export default function FeatureForm({
  initialFeature,
  actionType, // 'create_new' or 'update_existing'
  onSuccess,
  isOnline,
  formResetKey,
}) {
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState([]);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterNotes, setSubmitterNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sync state when initialFeature changes
  useEffect(() => {
    if (initialFeature) {
      setFormData({
        SHEET: initialFeature.SHEET || "",
        FEATURE_ID: initialFeature.FEATURE_ID || "",
        SHEET_DATE: initialFeature.SHEET_DATE ? initialFeature.SHEET_DATE.substring(0, 10) : "",
        RECORDER_ID: initialFeature.RECORDER_ID || "",
        RESEARCHER_ID: initialFeature.RESEARCHER_ID || "",
        SEASON: initialFeature.SEASON || new Date().getFullYear().toString(),
        REGION: initialFeature.REGION || "",
        INSULA: initialFeature.INSULA || "",
        ENTRANCE: initialFeature.ENTRANCE || "",
        SPACE_NUMBER: initialFeature.SPACE_NUMBER || "",
        STRUCTURE_ID: initialFeature.STRUCTURE_ID || "",
        SHEET_TYPE_ID: initialFeature.SHEET_TYPE_ID || "Feature",
        FEATURE_TYPE_ID: initialFeature.FEATURE_TYPE_ID || "",
        CATEGORY_ID: initialFeature.CATEGORY_ID || "",
        SPACE_TYPE_ID: initialFeature.SPACE_TYPE_ID || "",
        USAGE_ID: initialFeature.USAGE_ID || "",
        GATE_ID: initialFeature.GATE_ID || "",
        NEGATIVE_FEATURE: initialFeature.NEGATIVE_FEATURE === "T" ? "T" : "F",
        MINORITY_REPORT: initialFeature.MINORITY_REPORT === "T" ? "T" : "F",
        DESCRIPTION: initialFeature.DESCRIPTION || "",
        CONTIGUOUS_RELATIONSHIP: initialFeature.CONTIGUOUS_RELATIONSHIP || "",
        PHOTOGRAPHER_ID: initialFeature.PHOTOGRAPHER_ID || "",
        BW_ROLL: initialFeature.BW_ROLL || "",
        COLOR_ROLL: initialFeature.COLOR_ROLL || "",
        DIGITAL_IMAGE: initialFeature.DIGITAL_IMAGE || "",
        VIDEOGRAPHER_ID: initialFeature.VIDEOGRAPHER_ID || "",
        FILE_NUMBER: initialFeature.FILE_NUMBER || "",
        TAPE_NUMBER: initialFeature.TAPE_NUMBER || "",
        TIME_COUNT: initialFeature.TIME_COUNT || "",
        VIDEO_COMMENTS: initialFeature.VIDEO_COMMENTS || "",
        ARTIST_ID: initialFeature.ARTIST_ID || "",
      });
      // Existing photos from feature record
      setPhotos([]);
    } else {
      // Default blank template for new room
      setFormData({
        SHEET: "",
        FEATURE_ID: "",
        SHEET_DATE: new Date().toISOString().substring(0, 10),
        RECORDER_ID: "",
        RESEARCHER_ID: "",
        SEASON: new Date().getFullYear().toString(),
        REGION: "VI",
        INSULA: "",
        ENTRANCE: "",
        SPACE_NUMBER: "",
        STRUCTURE_ID: "",
        SHEET_TYPE_ID: "Feature",
        FEATURE_TYPE_ID: "",
        CATEGORY_ID: "",
        SPACE_TYPE_ID: "",
        USAGE_ID: "",
        GATE_ID: "",
        NEGATIVE_FEATURE: "F",
        MINORITY_REPORT: "F",
        DESCRIPTION: "",
        CONTIGUOUS_RELATIONSHIP: "",
        PHOTOGRAPHER_ID: "",
        BW_ROLL: "",
        COLOR_ROLL: "",
        DIGITAL_IMAGE: "",
        VIDEOGRAPHER_ID: "",
        FILE_NUMBER: "",
        TAPE_NUMBER: "",
        TIME_COUNT: "",
        VIDEO_COMMENTS: "",
        ARTIST_ID: "",
      });
      setPhotos([]);
    }
    setFeedback(null);
  }, [initialFeature, actionType, formResetKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.SHEET?.trim()) {
      alert("Please enter a Sheet Number for this archaeological record.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    // Build payload including existing + new photo names
    const photoNames = photos.map((p) => p.name);
    if (initialFeature?.photos) {
      photoNames.unshift(...initialFeature.photos);
    }

    const payload = {
      ...formData,
      photos: Array.from(new Set(photoNames)),
    };

    // Metadata for offline caching if offline
    const photoMeta = photos.map((p) => ({
      name: p.name,
      dataUrl: p.dataUrl,
      size: p.compressedSize,
      sizeFormatted: p.compressedFormatted,
    }));

    try {
      const result = await submitFeature({
        actionType,
        targetSheet: formData.SHEET,
        submitterName,
        submitterNotes,
        payload,
        photoFiles: photos,
        photoMeta,
      });

      setFeedback({
        type: result.isOffline ? "offline" : "online",
        message: result.message,
        id: result.submissionId || result.clientId,
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setFeedback({
        type: "error",
        message: `Submission error: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUpdating = actionType === "update_existing" && initialFeature;

  return (
    <div className="feature-form-container">
      <div className="form-title-bar">
        <div>
          <div className="form-mode-tag">
            {isUpdating ? "UPDATING EXISTING RECORD" : "LOGGING NEW ROOM RECORD"}
          </div>
          <h2 className="form-main-title">
            {isUpdating
              ? `Sheet #${formData.SHEET || "—"} &bull; ${formData.SPACE_NUMBER || formData.STRUCTURE_ID || "Room Record"}`
              : "New Pompeii Archaeological Sheet"}
          </h2>
        </div>
        <div className="form-status-indicator">
          {isOnline ? (
            <span className="badge-online">&#9679; Connected to Review Queue</span>
          ) : (
            <span className="badge-offline">&#9679; Offline Outbox Active</span>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`form-feedback-banner ${feedback.type}`}>
          <div className="feedback-icon">
            {feedback.type === "online" ? "✓" : feedback.type === "offline" ? "📥" : "⚠️"}
          </div>
          <div>
            <strong>{feedback.message}</strong>
            {feedback.id && <div className="feedback-sub">Record Token: {feedback.id}</div>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="pompeii-field-sheet">
        {/* SECTION 1: Sheet & Record Identification */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">01</span>
            <h3>Sheet &amp; Record Identification</h3>
          </div>
          <div className="form-grid-4">
            <div className="form-field">
              <label>Sheet Number *</label>
              <input
                type="text"
                name="SHEET"
                value={formData.SHEET || ""}
                onChange={handleChange}
                placeholder="e.g. 6083"
                required
                readOnly={isUpdating}
                className={isUpdating ? "readonly-input" : ""}
              />
              <span className="field-hint">Canonical Pompeian sheet ID</span>
            </div>
            <div className="form-field">
              <label>Feature ID</label>
              <input
                type="text"
                name="FEATURE_ID"
                value={formData.FEATURE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. 16781"
              />
            </div>
            <div className="form-field">
              <label>Sheet Date</label>
              <input
                type="date"
                name="SHEET_DATE"
                value={formData.SHEET_DATE || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Excavation Season</label>
              <input
                type="text"
                name="SEASON"
                value={formData.SEASON || ""}
                onChange={handleChange}
                placeholder="e.g. 2011"
              />
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Recorder Name</label>
              <input
                type="text"
                name="RECORDER_ID"
                value={formData.RECORDER_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Linda Baxter"
              />
            </div>
            <div className="form-field">
              <label>Researcher Name</label>
              <input
                type="text"
                name="RESEARCHER_ID"
                value={formData.RESEARCHER_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Sera Baker"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Spatial Address & Location */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">02</span>
            <h3>Pompeii Spatial Address &amp; Location</h3>
          </div>
          <div className="form-grid-4">
            <div className="form-field">
              <label>Region</label>
              <select name="REGION" value={formData.REGION || ""} onChange={handleChange}>
                <option value="">Select Region</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    Region {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Insula</label>
              <input
                type="text"
                name="INSULA"
                value={formData.INSULA || ""}
                onChange={handleChange}
                placeholder="e.g. 2"
              />
            </div>
            <div className="form-field">
              <label>Entrance</label>
              <input
                type="text"
                name="ENTRANCE"
                value={formData.ENTRANCE || ""}
                onChange={handleChange}
                placeholder="e.g. 6"
              />
            </div>
            <div className="form-field">
              <label>Space / Room Name</label>
              <input
                type="text"
                name="SPACE_NUMBER"
                value={formData.SPACE_NUMBER || ""}
                onChange={handleChange}
                placeholder="e.g. Preparation room"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Architectural Classification */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">03</span>
            <h3>Architecture &amp; Classification</h3>
          </div>
          <div className="form-grid-3">
            <div className="form-field">
              <label>Structure Name</label>
              <input
                type="text"
                name="STRUCTURE_ID"
                value={formData.STRUCTURE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. House of Sallust"
              />
            </div>
            <div className="form-field">
              <label>Sheet Type</label>
              <select name="SHEET_TYPE_ID" value={formData.SHEET_TYPE_ID || ""} onChange={handleChange}>
                {SHEET_TYPE_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Feature Type</label>
              <input
                type="text"
                name="FEATURE_TYPE_ID"
                value={formData.FEATURE_TYPE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Oven, Impluvium, Basin"
              />
            </div>
          </div>

          <div className="form-grid-4" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Category</label>
              <select name="CATEGORY_ID" value={formData.CATEGORY_ID || ""} onChange={handleChange}>
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Space Type</label>
              <input
                type="text"
                name="SPACE_TYPE_ID"
                value={formData.SPACE_TYPE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Mill-baking area"
              />
            </div>
            <div className="form-field">
              <label>Usage Classification</label>
              <input
                type="text"
                name="USAGE_ID"
                value={formData.USAGE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Commercial, Domestic"
              />
            </div>
            <div className="form-field">
              <label>City Gate / Approach</label>
              <input
                type="text"
                name="GATE_ID"
                value={formData.GATE_ID || ""}
                onChange={handleChange}
                placeholder="e.g. Herculaneum Gate"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Archaeological Description & Relationships */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">04</span>
            <h3>Field Observations &amp; Context</h3>
          </div>
          <div className="form-grid-2" style={{ marginBottom: "1rem" }}>
            <div className="form-field-checkbox">
              <input
                type="checkbox"
                id="NEGATIVE_FEATURE"
                checked={formData.NEGATIVE_FEATURE === "T"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    NEGATIVE_FEATURE: e.target.checked ? "T" : "F",
                  }))
                }
              />
              <label htmlFor="NEGATIVE_FEATURE">Negative Feature (T/F)</label>
            </div>
            <div className="form-field-checkbox">
              <input
                type="checkbox"
                id="MINORITY_REPORT"
                checked={formData.MINORITY_REPORT === "T"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    MINORITY_REPORT: e.target.checked ? "T" : "F",
                  }))
                }
              />
              <label htmlFor="MINORITY_REPORT">Minority Report (Dissenting Interpretation)</label>
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: "1rem" }}>
            <label>Archaeological Description</label>
            <textarea
              name="DESCRIPTION"
              rows={4}
              value={formData.DESCRIPTION || ""}
              onChange={handleChange}
              placeholder="Detailed stratigraphic and architectural description of the room / feature..."
            ></textarea>
          </div>

          <div className="form-field">
            <label>Contiguous Spatial Relationships</label>
            <textarea
              name="CONTIGUOUS_RELATIONSHIP"
              rows={2}
              value={formData.CONTIGUOUS_RELATIONSHIP || ""}
              onChange={handleChange}
              placeholder="e.g. The oven (6083) is located in north corner of mill room (6082)..."
            ></textarea>
          </div>
        </div>

        {/* SECTION 5: Excavation Photos with Auto-Resizing < 1MB */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">05</span>
            <h3>Field Photos &bull; Auto-Compressed to &lt; 1MB</h3>
          </div>
          <PhotoUploader photos={photos} setPhotos={setPhotos} />
        </div>

        {/* SECTION 6: Archive & Documentation */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-num">06</span>
            <h3>Archival Records &amp; Media Catalog</h3>
          </div>
          <div className="form-grid-4">
            <div className="form-field">
              <label>Photographer</label>
              <input
                type="text"
                name="PHOTOGRAPHER_ID"
                value={formData.PHOTOGRAPHER_ID || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>B/W Roll #</label>
              <input
                type="text"
                name="BW_ROLL"
                value={formData.BW_ROLL || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Color Roll #</label>
              <input
                type="text"
                name="COLOR_ROLL"
                value={formData.COLOR_ROLL || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Digital Image #</label>
              <input
                type="text"
                name="DIGITAL_IMAGE"
                value={formData.DIGITAL_IMAGE || ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-grid-3" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Videographer</label>
              <input
                type="text"
                name="VIDEOGRAPHER_ID"
                value={formData.VIDEOGRAPHER_ID || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>File #</label>
              <input
                type="text"
                name="FILE_NUMBER"
                value={formData.FILE_NUMBER || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Artist / Drafter</label>
              <input
                type="text"
                name="ARTIST_ID"
                value={formData.ARTIST_ID || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* SECTION 7: Submitter Info & Submission */}
        <div className="form-section submit-bar-section">
          <div className="form-grid-2">
            <div className="form-field">
              <label>Your Name / Field Researcher ID</label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="e.g. Dr. Sean Marcia"
              />
            </div>
            <div className="form-field">
              <label>Field Notes for Review Admin</label>
              <input
                type="text"
                value={submitterNotes}
                onChange={(e) => setSubmitterNotes(e.target.value)}
                placeholder="e.g. Excavated newly exposed threshold plaster"
              />
            </div>
          </div>

          <div className="form-actions-row">
            <button
              type="submit"
              className="btn-submit-sheet"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Submitting..."
                : isOnline
                ? "Send to Review Queue →"
                : "Save to Offline Outbox (Queue) →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
