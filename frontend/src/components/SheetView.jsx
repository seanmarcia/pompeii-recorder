import React from "react";

const SECTIONS = {
  "Sheet Identification": {
    SHEET: "Sheet Number",
    FEATURE_ID: "Sheet ID",
    SHEET_DATE: "Sheet Date",
    SEASON: "Excavation Season",
    RESEARCHER_ID: "Researcher Name",
    RECORDER_ID: "Recorder Name",
  },
  "Spatial Address & Location": {
    REGION: "Region",
    INSULA: "Insula",
    ENTRANCE: "Entrance",
    GATE_ID: "City Gate / Approach",
    SPACE_NUMBER: "Space / Room Name",
    STRUCTURE_ID: "Structure Name",
  },
  Classification: {
    SHEET_TYPE_ID: "Sheet Type",
    FEATURE_TYPE_ID: "Feature Type",
    SPACE_TYPE_ID: "Space Type",
    CATEGORY_ID: "Category",
    USAGE_ID: "Usage Classification / Late Usage",
  },
  Interpretation: {
    NEGATIVE_FEATURE: "Negative Feature (T/F)",
    MINORITY_REPORT: "Minority Report (Other Interpretation)",
    DESCRIPTION: "Archaeological Description",
    CONTIGUOUS_RELATIONSHIP: "Contiguous Spatial Relationships",
  },
  "Archival Records & Media": {
    PHOTOGRAPHER_ID: "Photographer",
    ARTIST_ID: "Sketch Artist",
    BW_ROLL: "B/W Roll #",
    COLOR_ROLL: "Color Roll #",
    DIGITAL_IMAGE: "Digital Image #",
    VIDEOGRAPHER_ID: "Videographer",
    FILE_NUMBER: "File #",
    TAPE_NUMBER: "Tape #",
    TIME_COUNT: "Time Count",
    VIDEO_COMMENTS: "Video Comments",
  },
};

const LONG_TEXT = new Set(["DESCRIPTION", "CONTIGUOUS_RELATIONSHIP", "VIDEO_COMMENTS"]);
const YES_NO = new Set(["NEGATIVE_FEATURE", "MINORITY_REPORT"]);

const isBlank = (value) => value == null || String(value).trim() === "";
const isImageUrl = (photo) => /^(https?:\/\/|\/(?!\/)|data:image\/|blob:)/i.test(photo);

function formatValue(key, value) {
  if (YES_NO.has(key)) return value === "T" ? "Yes" : "No";
  if (key === "SHEET_DATE") {
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
  }
  return String(value);
}

export default function SheetView({ feature, onBack, onEdit }) {
  const photos = Array.isArray(feature.photos) ? feature.photos : [];
  const title = feature.SPACE_NUMBER || feature.STRUCTURE_ID || `Sheet #${feature.SHEET}`;
  const address = [
    feature.REGION && `Region ${feature.REGION}`,
    feature.INSULA && `Insula ${feature.INSULA}`,
    feature.ENTRANCE && `Entrance ${feature.ENTRANCE}`,
  ].filter(Boolean).join(" · ");
  const tags = [feature.SHEET_TYPE_ID, feature.FEATURE_TYPE_ID, feature.SPACE_TYPE_ID, feature.CATEGORY_ID]
    .filter((tag) => !isBlank(tag));
  const facts = [
    ["Date", feature.SHEET_DATE && formatValue("SHEET_DATE", feature.SHEET_DATE)],
    ["Season", feature.SEASON],
    ["Researcher", feature.RESEARCHER_ID],
    ["Recorder", feature.RECORDER_ID],
  ];

  return (
    <article className="sheet-view">
      <header className="sheet-view-hero">
        <div className="sheet-view-toolbar">
          <button type="button" className="sheet-view-back" onClick={onBack}>← Back to Catalog</button>
          <button type="button" className="sheet-view-edit" onClick={() => onEdit(feature)}>
            ✎ Edit / Log Updates
          </button>
        </div>
        <div className="sheet-view-heading">
          <span className="card-sheet-tag">Sheet #{feature.SHEET}</span>
          <span className="sheet-view-readonly">Read only</span>
        </div>
        <h2 className="sheet-view-title">{title}</h2>
        <p className="sheet-view-address">{address || "Location not recorded"}</p>
        {tags.length > 0 && (
          <ul className="sheet-view-tags">
            {tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
        <dl className="sheet-view-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className={isBlank(value) ? "is-empty" : undefined}>{isBlank(value) ? "—" : value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <p className="sheet-view-notice">Showing the saved catalog record. Unsaved drafts on this device aren't shown or changed.</p>

      {Object.entries(SECTIONS).map(([section, fields], index) => {
        const entries = Object.entries(fields);
        const recorded = entries.filter(([key]) => YES_NO.has(key) || !isBlank(feature[key]));
        const missing = entries.filter(([key]) => !YES_NO.has(key) && isBlank(feature[key]));
        return (
          <section className="sheet-view-section" key={section}>
            <div className="section-header">
              <span className="section-num">{String(index + 1).padStart(2, "0")}</span>
              <h3>{section}</h3>
            </div>
            {recorded.length > 0 ? (
              <dl className="sheet-view-fields">
                {recorded.map(([key, label]) => (
                  <div key={key} className={LONG_TEXT.has(key) ? "is-long" : undefined}>
                    <dt>{label}</dt>
                    <dd className={YES_NO.has(key) ? `sheet-view-flag ${feature[key] === "T" ? "is-yes" : ""}` : undefined}>
                      {formatValue(key, feature[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="sheet-view-none">Nothing recorded in this section yet.</p>
            )}
            {missing.length > 0 && recorded.length > 0 && (
              <p className="sheet-view-missing">
                <span>Not recorded:</span> {missing.map(([, label]) => label).join(", ")}
              </p>
            )}
          </section>
        );
      })}

      <section className="sheet-view-section">
        <div className="section-header">
          <span className="section-num">{String(Object.keys(SECTIONS).length + 1).padStart(2, "0")}</span>
          <h3>Field Photos ({photos.length})</h3>
        </div>
        {photos.length ? (
          <ul className="sheet-view-photos">
            {photos.map((photo, index) => {
              const caption = /^(data:|blob:)/i.test(photo) ? `Photo ${index + 1}` : photo.split("/").pop();
              return (
                <li key={`${photo}_${index}`}>
                  {isImageUrl(photo) ? (
                    <a href={photo} target="_blank" rel="noreferrer">
                      <img src={photo} alt={`Sheet ${feature.SHEET}, photo ${index + 1}`} loading="lazy" />
                    </a>
                  ) : (
                    <div className="sheet-view-photo-placeholder" aria-hidden="true">📷</div>
                  )}
                  <span title={photo}>{caption}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="sheet-view-none">No photos recorded.</p>}
      </section>
    </article>
  );
}
