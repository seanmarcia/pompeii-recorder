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

export default function SheetView({ feature, onBack, onEdit }) {
  const photos = Array.isArray(feature.photos) ? feature.photos : [];
  return (
    <article className="sheet-view">
      <div className="sheet-view-toolbar">
        <button type="button" className="btn-edit-room" onClick={onBack}>Back to Catalog</button>
        <h2>Sheet #{feature.SHEET} <small>Read only</small></h2>
        <button type="button" className="btn-edit-room" onClick={() => onEdit(feature)}>
          Edit / Log Updates
        </button>
      </div>
      <p className="sheet-view-notice">Viewing the saved catalog record. Unsaved drafts are not shown or changed.</p>
      {Object.entries(SECTIONS).map(([section, fields]) => (
        <section className="form-section" key={section}>
          <h3>{section}</h3>
          <dl className="sheet-view-fields">
            {Object.entries(fields).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{feature[key] == null || feature[key] === "" ? "Not recorded" : String(feature[key])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section className="form-section">
        <h3>Field Photos ({photos.length})</h3>
        {photos.length ? (
          <ul className="sheet-view-photos">
            {photos.map((photo, index) => (
              <li key={`${photo}_${index}`}>
                {/^(https?:\/\/|\/(?!\/)|data:image\/|blob:)/i.test(photo) && (
                  <img src={photo} alt={`Sheet ${feature.SHEET}, photo ${index + 1}`} loading="lazy" />
                )}
                <span>{/^(data:|blob:)/i.test(photo) ? `Photo ${index + 1}` : photo}</span>
              </li>
            ))}
          </ul>
        ) : <p>No photos recorded.</p>}
      </section>
    </article>
  );
}
