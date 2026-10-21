import React from "react";

export default function LandingChoice({ onNewSheet, onEditSheet, onViewSheet }) {
  return (
    <div className="landing-choice">
      <h2 className="landing-choice-heading">What would you like to do?</h2>
      <p className="landing-choice-sub">Choose an action to get started.</p>

      <div className="landing-choice-options">
        <button type="button" className="landing-choice-card" onClick={onViewSheet}>
          <span className="landing-choice-icon">&#128196;</span>
          <span className="landing-choice-title">View an Existing Sheet</span>
          <span className="landing-choice-desc">
            Read a saved sheet without editing it, including from the offline catalog.
          </span>
        </button>
        <button type="button" className="landing-choice-card" onClick={onNewSheet}>
          <span className="landing-choice-icon">&#9998;</span>
          <span className="landing-choice-title">Start a New Sheet</span>
          <span className="landing-choice-desc">
            Log a brand-new archaeological field record from scratch.
          </span>
        </button>

        <button type="button" className="landing-choice-card" onClick={onEditSheet}>
          <span className="landing-choice-icon">&#128269;</span>
          <span className="landing-choice-title">Edit an Existing Sheet</span>
          <span className="landing-choice-desc">
            Search the catalog and update a previously recorded sheet.
          </span>
        </button>
      </div>
    </div>
  );
}
