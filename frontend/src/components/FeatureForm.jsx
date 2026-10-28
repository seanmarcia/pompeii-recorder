import React, { useState, useEffect, useMemo, useRef } from "react";
import PhotoUploader from "./PhotoUploader";
import AttributeMultiSelect from "./AttributeMultiSelect";
import { submitFeature } from "../lib/api";
import {
  featureTypeOptionsFor,
  attributesForFeatureType,
  formatFeatureType,
  parseFeatureType,
} from "../data/featureTypes";
import {
  spaceTypeOptionsFor,
  attributesForSpaceType,
  formatSpaceType,
  parseSpaceType,
} from "../data/spaceTypes";
import { lateUsageOptionsFor, attributesForLateUsageType } from "../data/lateUsage";
import { formatUsageField, parseUsageField } from "../data/usageField";
import { categoryOptionsFor } from "../data/categories";
import {
  getDraft,
  saveDraft,
  clearDraft,
  getLastSubmitterName,
  setLastSubmitterName,
} from "../lib/storage";
import { RECORDER_NAMES as RECORDER_OPTIONS, RESEARCHER_NAMES as RESEARCHER_OPTIONS } from "../data/people";

const REGION_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "Suburban"];

const SHEET_TYPE_OPTIONS = ["Space", "Room", "Feature", "Other"];


const GATE_OPTIONS = [
  "Capua Gate",
  "Herculaneum Gate",
  "Marine Gate",
  "Nocera Gate",
  "Nola Gate",
  "Sarno Gate",
  "Stabian Gate",
  "Vesuvius Gate",
];

export default function FeatureForm({
  initialFeature,
  actionType, // 'create_new' or 'update_existing'
  onSuccess,
  isOnline,
  formResetKey,
  currentUser,
}) {
  const [formData, setFormData] = useState({});
  // The form's starting values (the master record, or the new-sheet
  // defaults). Only fields that differ from these are sent as changes, so two
  // people working on the same sheet don't overwrite each other's fields.
  const [baseline, setBaseline] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterNotes, setSubmitterNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Unsaved sheet content is drafted to localStorage under this key so it
  // survives closing the browser or the device sleeping mid-entry in the
  // field. "new" for a not-yet-submitted sheet, "edit_<SHEET>" while editing.
  const draftId = initialFeature?.SHEET ? `edit_${initialFeature.SHEET}` : "new";

  // The hydration effect below and the auto-save effect further down both
  // run on the same initial pass, but auto-save would otherwise capture
  // formData from *before* hydration's setFormData takes effect, writing a
  // blank draft that a later pass could read back and "resume" from -
  // silently wiping the real defaults. This ref makes auto-save skip that
  // one stale pass right after any (re)hydration.
  const skipNextAutoSaveRef = useRef(true);
  // The values the form opened with (draft-first, else the master record).
  // Pinned so each field's original choice stays selectable for the session:
  // an accidental change to Late Usage, Feature Type, or Space Type is undone
  // by re-picking it from the select instead of reloading the sheet (which
  // would only restore the autosaved draft, not the database value).
  const [originalValues, setOriginalValues] = useState({
    featureType: "",
    spaceType: "",
    lateUsageType: "",
  });

  // Remember the researcher's name across sheets and browser restarts so
  // they don't have to retype it every time.
  useEffect(() => {
    const savedName = getLastSubmitterName();
    if (RECORDER_OPTIONS.includes(savedName)) setSubmitterName(savedName);
    else if (RECORDER_OPTIONS.includes(currentUser?.full_name)) setSubmitterName(currentUser.full_name);
  }, []);

  // Sync state when initialFeature changes
  useEffect(() => {
    skipNextAutoSaveRef.current = true;
    const draft = getDraft(draftId);
    if (draft) {
      // Resume exactly where the researcher left off on this sheet.
      setFormData(draft.formData || {});
      setBaseline(draft.baseline || null);
      setPhotos(draft.photos || []);
      setSubmitterNotes(draft.submitterNotes || "");
      setFeedback(null);
      // Pin the resumed draft's own values as this session's originals.
      setOriginalValues(originalsFrom(draft.formData || {}));
      return;
    }

    let start;
    if (initialFeature) {
      start = {
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
        BIBLIOGRAPHY: initialFeature.BIBLIOGRAPHY || "",
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
      };
      // Existing photos from feature record
      setPhotos([]);
    } else {
      // Default blank template for new room
      start = {
        SHEET: "",
        FEATURE_ID: "",
        SHEET_DATE: new Date().toISOString().substring(0, 10),
        // New sheets are recorded by whoever is signed in, if they're on the recorder list.
        RECORDER_ID: RECORDER_OPTIONS.includes(currentUser?.full_name) ? currentUser.full_name : "",
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
        BIBLIOGRAPHY: "",
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
      };
      setPhotos([]);
    }
    setFormData(start);
    setBaseline(start);
    setFeedback(null);
    setOriginalValues(originalsFrom(start));
  }, [initialFeature, actionType, formResetKey, currentUser]);

  // The pinned per-field originals, parsed from the composite stored values.
  function originalsFrom(values) {
    return {
      featureType: parseFeatureType(values.FEATURE_TYPE_ID || "").typeName,
      spaceType: parseSpaceType(values.SPACE_TYPE_ID || "").typeName,
      lateUsageType: parseUsageField(values.USAGE_ID || "").lateUsageTypeName,
    };
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-save the in-progress sheet on every change so nothing is lost if the
  // browser closes, crashes, or the device sleeps before submission - no
  // matter which field the researcher happens to fill in first.
  useEffect(() => {
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    saveDraft(draftId, {
      formData,
      baseline,
      photos: photos.map((p) => ({ ...p, file: undefined })),
      submitterNotes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, formData, baseline, photos, submitterNotes]);

  useEffect(() => {
    setLastSubmitterName(submitterName);
  }, [submitterName]);

  // Feature Type is stored as a single "Type: Attr1, Attr2" string; derive the
  // dropdown + checkbox selections from it on each render. The offered types
  // follow the sheet's Category; the current and originally-loaded types stay
  // selectable when they fall outside that category's list.
  const { typeName: selectedFeatureType, attributes: selectedFeatureAttributes } =
    parseFeatureType(formData.FEATURE_TYPE_ID);
  const featureTypeOptions = featureTypeOptionsFor(
    formData.CATEGORY_ID,
    selectedFeatureType,
    originalValues.featureType
  );
  const featureTypeAttributeOptions = attributesForFeatureType(
    formData.CATEGORY_ID,
    selectedFeatureType,
    selectedFeatureAttributes
  );
  const isFeatureSheet = formData.SHEET_TYPE_ID === "Feature";

  // Space Type follows the same single-field "Type: Attr1, Attr2" pattern.
  const { typeName: selectedSpaceType, attributes: selectedSpaceAttributes } = parseSpaceType(
    formData.SPACE_TYPE_ID
  );
  const spaceTypeOptions = spaceTypeOptionsFor(
    formData.CATEGORY_ID,
    selectedSpaceType,
    originalValues.spaceType
  );
  const spaceTypeAttributeOptions = attributesForSpaceType(
    formData.CATEGORY_ID,
    selectedSpaceType,
    selectedSpaceAttributes
  );
  // Older imported sheets use "Space or Room" for the same sheet type.
  const isSpaceSheet = formData.SHEET_TYPE_ID === "Space" || formData.SHEET_TYPE_ID === "Space or Room";

  // Usage Classification was retired from the form; Late Usage (category +
  // sub-categories) remains and combines into the single USAGE_ID field with
  // any classification parsed from a stored value. The offered types follow
  // the sheet's Category (issue #17); the current and originally-loaded types
  // stay selectable when they fall outside that category's list.
  const {
    usageClassification: selectedUsageClassification,
    lateUsageTypeName: selectedLateUsageType,
    lateUsageAttributes: selectedLateUsageAttributes,
  } = parseUsageField(formData.USAGE_ID);
  const lateUsageOptions = lateUsageOptionsFor(
    formData.CATEGORY_ID,
    selectedLateUsageType,
    originalValues.lateUsageType
  );
  const lateUsageAttributeOptions = attributesForLateUsageType(
    formData.CATEGORY_ID,
    selectedLateUsageType,
    selectedLateUsageAttributes
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessingPhotos) {
      alert("Please wait for your photos to finish processing before submitting.");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    // Build payload including existing + new photo names
    const photoNames = photos.map((p) => p.name);
    if (initialFeature?.photos) {
      photoNames.unshift(...initialFeature.photos);
    }

    // Send what this person entered or changed. Untouched starting values
    // (today's date, Region VI, ...) go separately and only fill in blanks
    // on the master sheet when an admin approves it.
    const changed = { SHEET: formData.SHEET };
    const defaults = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "SHEET") return;
      if (baseline && value === baseline[key]) {
        if (value) defaults[key] = value;
      } else {
        changed[key] = value;
      }
    });

    const payload = {
      ...changed,
      _defaults: defaults,
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

      // Submission is safely on the server (or in the persisted outbox), so
      // the local in-progress draft is no longer needed.
      clearDraft(draftId);

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
              <label>Sheet ID</label>
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
              <label>Researcher Name *</label>
              <select name="RESEARCHER_ID" value={formData.RESEARCHER_ID || ""} onChange={handleChange} required>
                <option value="">Select Researcher</option>
                {RESEARCHER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {/* Keep the sheet's existing researcher selectable even if
                    they aren't one of the three submission-side researchers
                    (legacy master data). Same pattern as Photographer/Artist. */}
                {formData.RESEARCHER_ID && !RESEARCHER_OPTIONS.includes(formData.RESEARCHER_ID) && (
                  <option value={formData.RESEARCHER_ID}>{formData.RESEARCHER_ID}</option>
                )}
              </select>
            </div>
            <div className="form-field">
              <label>Recorder Name</label>
              <select name="RECORDER_ID" value={formData.RECORDER_ID || ""} onChange={handleChange}>
                <option value="">Select Recorder</option>
                {RECORDER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
              <label>City Gate / Approach</label>
              <select name="GATE_ID" value={formData.GATE_ID || ""} onChange={handleChange}>
                <option value="">Select Gate</option>
                {GATE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                {/* Keep a value from an older sheet selectable even if it isn't one of the standard gates. */}
                {formData.GATE_ID && !GATE_OPTIONS.includes(formData.GATE_ID) && (
                  <option value={formData.GATE_ID}>{formData.GATE_ID}</option>
                )}
              </select>
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
              <select
                name="SHEET_TYPE_ID"
                value={formData.SHEET_TYPE_ID || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    SHEET_TYPE_ID: e.target.value,
                    // Feature Type only applies to Feature sheets and Space Type to Space
                    // sheets; clear them when switching away so a hidden value isn't submitted.
                    ...(e.target.value !== "Feature" && { FEATURE_TYPE_ID: "" }),
                    ...(e.target.value !== "Space" && { SPACE_TYPE_ID: "" }),
                  }))
                }
              >
                {SHEET_TYPE_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                {/* Keep a value from an older sheet (e.g. "Space or Room") selectable. */}
                {formData.SHEET_TYPE_ID && !SHEET_TYPE_OPTIONS.includes(formData.SHEET_TYPE_ID) && (
                  <option value={formData.SHEET_TYPE_ID}>{formData.SHEET_TYPE_ID}</option>
                )}
              </select>
            </div>
            {isFeatureSheet && (
              <div className="form-field">
                <label>Feature Type</label>
                <select
                  name="FEATURE_TYPE_ID"
                  value={selectedFeatureType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      FEATURE_TYPE_ID: formatFeatureType(e.target.value, []),
                    }))
                  }
                >
                  <option value="">Select Feature Type</option>
                  {featureTypeOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isSpaceSheet && (
              <div className="form-field">
                <label>Space Type</label>
                <select
                  name="SPACE_TYPE_ID"
                  value={selectedSpaceType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      SPACE_TYPE_ID: formatSpaceType(e.target.value, []),
                    }))
                  }
                >
                  <option value="">Select Space Type</option>
                  {spaceTypeOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isFeatureSheet && featureTypeAttributeOptions.length > 0 && (
            <div className="form-field" style={{ marginTop: "1rem" }}>
              <label>{selectedFeatureType} Attributes</label>
              <AttributeMultiSelect
                label={`${selectedFeatureType} attributes`}
                options={featureTypeAttributeOptions}
                selected={selectedFeatureAttributes}
                onChange={(nextAttributes) =>
                  setFormData((prev) => ({
                    ...prev,
                    FEATURE_TYPE_ID: formatFeatureType(selectedFeatureType, nextAttributes),
                  }))
                }
              />
            </div>
          )}

          {isSpaceSheet && spaceTypeAttributeOptions.length > 0 && (
            <div className="form-field" style={{ marginTop: "1rem" }}>
              <label>{selectedSpaceType} Attributes</label>
              <AttributeMultiSelect
                label={`${selectedSpaceType} attributes`}
                options={spaceTypeAttributeOptions}
                selected={selectedSpaceAttributes}
                onChange={(nextAttributes) =>
                  setFormData((prev) => ({
                    ...prev,
                    SPACE_TYPE_ID: formatSpaceType(selectedSpaceType, nextAttributes),
                  }))
                }
              />
            </div>
          )}

          <div className="form-grid-4" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Category</label>
              <select name="CATEGORY_ID" value={formData.CATEGORY_ID || ""} onChange={handleChange}>
                {categoryOptionsFor(formData.CATEGORY_ID).map((c) => (
                  <option key={c} value={c}>
                    {c === "" ? "Select Category" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Late Usage</label>
              <select
                name="LATE_USAGE_TYPE"
                value={selectedLateUsageType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    USAGE_ID: formatUsageField(selectedUsageClassification, e.target.value, []),
                  }))
                }
              >
                <option value="">Select Late Usage</option>
                {lateUsageOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {lateUsageAttributeOptions.length > 0 && (
              <div className="form-field">
                <label>{selectedLateUsageType} Attributes</label>
                <AttributeMultiSelect
                  label={`${selectedLateUsageType} attributes`}
                  options={lateUsageAttributeOptions}
                  selected={selectedLateUsageAttributes}
                  onChange={(nextAttributes) =>
                    setFormData((prev) => ({
                      ...prev,
                      USAGE_ID: formatUsageField(
                        selectedUsageClassification,
                        selectedLateUsageType,
                        nextAttributes
                      ),
                    }))
                  }
                />
              </div>
            )}
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
              <label htmlFor="MINORITY_REPORT">Minority Report (Other Interpretation)</label>
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

          <div className="form-field" style={{ marginBottom: "1rem" }}>
            <label>Bibliography Reference(s)</label>
            <textarea
              name="BIBLIOGRAPHY"
              rows={2}
              value={formData.BIBLIOGRAPHY || ""}
              onChange={handleChange}
              placeholder="e.g. Eschebach 57"
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
          <PhotoUploader photos={photos} setPhotos={setPhotos} onProcessingChange={setIsProcessingPhotos} />
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
              <select name="PHOTOGRAPHER_ID" value={formData.PHOTOGRAPHER_ID || ""} onChange={handleChange}>
                <option value="">Select Photographer</option>
                {RECORDER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {/* Keep a name from an older sheet selectable even if it isn't in the recorder list. */}
                {formData.PHOTOGRAPHER_ID && !RECORDER_OPTIONS.includes(formData.PHOTOGRAPHER_ID) && (
                  <option value={formData.PHOTOGRAPHER_ID}>{formData.PHOTOGRAPHER_ID}</option>
                )}
              </select>
            </div>
            <div className="form-field">
              <label>Sketch Artist</label>
              <select name="ARTIST_ID" value={formData.ARTIST_ID || ""} onChange={handleChange}>
                <option value="">Select Sketch Artist</option>
                {RECORDER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {/* Keep a name from an older sheet selectable even if it isn't in the recorder list. */}
                {formData.ARTIST_ID && !RECORDER_OPTIONS.includes(formData.ARTIST_ID) && (
                  <option value={formData.ARTIST_ID}>{formData.ARTIST_ID}</option>
                )}
              </select>
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
          </div>
          <div className="form-grid-3" style={{ marginTop: "1rem" }}>
            <div className="form-field">
              <label>Digital Image #</label>
              <input
                type="text"
                name="DIGITAL_IMAGE"
                value={formData.DIGITAL_IMAGE || ""}
                onChange={handleChange}
              />
            </div>
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
          </div>
        </div>

        {/* SECTION 7: Submitter Info & Submission */}
        <div className="form-section submit-bar-section">
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="submitter-name">Your Name / Data Entered By</label>
              <select
                id="submitter-name"
                name="submitter_name"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
              >
                <option value="">Select Data Entered By</option>
                {RECORDER_OPTIONS.map((recorder) => (
                  <option key={recorder} value={recorder}>
                    {recorder}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Field Notes for the Reviewer</label>
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
              disabled={isSubmitting || isProcessingPhotos}
            >
              {isProcessingPhotos
                ? "Processing photos..."
                : isSubmitting
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
