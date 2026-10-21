import React, { useState, useRef } from "react";
import { compressImage, isHeicFile, isPsdFile } from "../lib/imageCompressor";

export default function PhotoUploader({ photos, setPhotos, onProcessingChange }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const fileInputRef = useRef(null);
  const processingRef = useRef(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0 || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    onProcessingChange?.(true);

    const newPhotos = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const format = isPsdFile(file) ? "PSD" : isHeicFile(file) ? "HEIC" : null;
        setProcessingStatus(`${format ? `Converting ${format} and resizing` : "Resizing"} photo ${i + 1} of ${files.length} to < 1MB...`);

        try {
          const compressed = await compressImage(file);
          newPhotos.push({
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: compressed.file.name,
            file: compressed.file,
            dataUrl: compressed.dataUrl,
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            originalFormatted: compressed.originalFormatted,
            compressedFormatted: compressed.compressedFormatted,
            width: compressed.width,
            height: compressed.height,
            isUnder1MB: compressed.isUnder1MB,
          });
        } catch (err) {
          console.error("Image compression error:", err);
          const hint = isPsdFile(file)
            ? " Try resaving as an RGB PSD with Maximize Compatibility enabled, or export JPEG/PNG."
            : "";
          alert(`Failed to compress ${file.name}: ${err.message}${hint}`);
        }
      }

      if (newPhotos.length) setPhotos((current) => [...current, ...newPhotos]);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      setProcessingStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onProcessingChange?.(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="photo-uploader-component">
      <div
        className={`dropzone ${isProcessing ? "processing" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/*,.heic,.heif,.psd,image/heic,image/heif,image/heic-sequence,image/heif-sequence,image/vnd.adobe.photoshop,application/photoshop,application/x-photoshop"
          disabled={isProcessing}
          style={{ display: "none" }}
        />
        <div className="dropzone-icon">&#128247;</div>
        <div className="dropzone-text">
          <strong>Click to select</strong> or drag and drop field excavation photos here
        </div>
        <div className="dropzone-sub">
          iPhone HEIC/HEIF and Photoshop PSD files supported. Photos are converted to JPEG and resized to <strong>&lt; 1 MB</strong> on this device, including offline.
        </div>
      </div>

      {isProcessing && (
        <div className="compression-progress-bar">
          <div className="spinner"></div>
          <span>{processingStatus}</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="photo-preview-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-preview-card">
              <div className="photo-thumb-container">
                <img src={photo.dataUrl} alt={photo.name} className="photo-thumb" />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(photo.id);
                  }}
                  title="Remove this photo"
                >
                  &times;
                </button>
              </div>
              <div className="photo-meta-info">
                <div className="photo-filename" title={photo.name}>{photo.name}</div>
                <div className="photo-compression-stats">
                  <span className="orig-size">{photo.originalFormatted}</span>
                  <span className="arrow-sep">&rarr;</span>
                  <span className="comp-size">{photo.compressedFormatted}</span>
                </div>
                <div className="under-1mb-pill">&#10003; &lt; 1MB ({Math.round(photo.compressedSize / 1024)} KB)</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
