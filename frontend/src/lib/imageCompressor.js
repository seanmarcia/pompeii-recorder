/**
 * imageCompressor.js
 * Client-side image compressor ensuring any photo taken by field archaeologists
 * is strictly resized and compressed to under 1MB (1,048,576 bytes) in the browser
 * before submission or offline storage.
 */

const MAX_BYTES = 1024 * 1024; // 1MB exact threshold
const TARGET_MAX_BYTES = 950 * 1024; // 950 KB safe margin below 1MB
const INITIAL_MAX_DIMENSION = 2048; // Max width or height in px

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function isHeicFile(file) {
  return /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || "");
}

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid or unsupported image format"));
    };
    img.src = url;
  });
}

/**
 * Compresses an image File or Blob so that the output size is strictly < 1MB.
 *
 * @param {File|Blob} file - Original image file from input or camera
 * @param {Object} options - Optional compression tuning
 * @returns {Promise<{
 *   file: File,
 *   dataUrl: string,
 *   originalSize: number,
 *   compressedSize: number,
 *   originalFormatted: string,
 *   compressedFormatted: string,
 *   width: number,
 *   height: number,
 *   isUnder1MB: boolean
 * }>}
 */
export async function compressImage(file, options = {}) {
  const originalSize = file.size;
  const fileName = file.name || `photo_${Date.now()}.jpg`;
  const maxDimension = options.maxDimension ?? INITIAL_MAX_DIMENSION;
  if (!Number.isInteger(maxDimension) || maxDimension < 1) {
    throw new Error("Maximum photo dimension must be a positive integer.");
  }

  let source = file;
  if (isHeicFile(file)) {
    const { heicTo } = await import("heic-to/csp");
    source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
  }
  const img = await loadImage(source);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  let width = Math.max(1, Math.round(img.width * scale));
  let height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not initialize photo processing.");

  const renderBlob = (quality) => new Promise((resolve, reject) => {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode this photo as JPEG."));
    }, "image/jpeg", quality);
  });

  let quality = 0.88;
  let blob = await renderBlob(quality);
  while (blob.size > TARGET_MAX_BYTES && quality > 0.35) {
    quality = Math.max(0.35, quality - 0.12);
    blob = await renderBlob(quality);
  }
  while (blob.size > TARGET_MAX_BYTES && Math.max(width, height) > 1) {
    width = Math.max(1, Math.floor(width * 0.8));
    height = Math.max(1, Math.floor(height * 0.8));
    blob = await renderBlob(quality);
  }
  if (blob.size >= MAX_BYTES) {
    throw new Error("Could not shrink this photo below 1 MB. Please choose another image.");
  }

  const compressedFile = new File([blob], `${fileName.replace(/\.[^/.]+$/, "")}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
  const dataUrl = await readDataUrl(blob);

  return {
    file: compressedFile,
    dataUrl,
    originalSize,
    compressedSize: blob.size,
    originalFormatted: formatBytes(originalSize),
    compressedFormatted: formatBytes(blob.size),
    width,
    height,
    isUnder1MB: true,
  };
}
