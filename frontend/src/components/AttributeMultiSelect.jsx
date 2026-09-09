import React, { useEffect, useRef, useState } from "react";
import "./AttributeMultiSelect.css";

// Compact multi-select: collapsed to a single field-height control showing
// selected values as chips, expands into a checklist panel on click.
export default function AttributeMultiSelect({ label, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleAttr = (attr) => {
    const next = selected.includes(attr)
      ? selected.filter((a) => a !== attr)
      : [...selected, attr];
    onChange(next);
  };

  return (
    <div className="attribute-multiselect" ref={containerRef}>
      <button
        type="button"
        className="attribute-multiselect-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
      >
        <span className="attribute-multiselect-value">
          {selected.length === 0 ? (
            <span className="attribute-multiselect-placeholder">
              {placeholder || `Select ${label}`}
            </span>
          ) : (
            selected.map((attr) => (
              <span className="attribute-chip" key={attr}>
                {attr}
                <span
                  role="button"
                  tabIndex={0}
                  className="attribute-chip-remove"
                  aria-label={`Remove ${attr}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAttr(attr);
                  }}
                >
                  &times;
                </span>
              </span>
            ))
          )}
        </span>
        <span className={`attribute-multiselect-caret ${open ? "open" : ""}`}>&#9662;</span>
      </button>

      {open && (
        <div className="attribute-multiselect-panel">
          {options.map((attr) => (
            <label className="attribute-multiselect-option" key={attr}>
              <input
                type="checkbox"
                checked={selected.includes(attr)}
                onChange={() => toggleAttr(attr)}
              />
              <span>{attr}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
