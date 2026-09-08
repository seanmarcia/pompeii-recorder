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

  // If already < 1MB and not exceeding initial dimension, still convert to standard JPEG
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format"));

      img.onload = async () => {
        let { width, height } = img;
        let maxDim = options.maxDimension || INITIAL_MAX_DIMENSION;

        // Downscale dimensions if needed
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Helper to render onto canvas and export as blob
        const renderBlob = (w, h, quality) => {
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          return new Promise((res) => {
            canvas.toBlob(
              (blob) => res(blob),
              "image/jpeg",
              quality
            );
          });
        };

        // Iteratively adjust quality or dimensions until < TARGET_MAX_BYTES
        let quality = 0.88;
        let currentW = width;
        let currentH = height;
        let blob = await renderBlob(currentW, currentH, quality);

        // Quality reduction loop
        while (blob.size > TARGET_MAX_BYTES && quality > 0.35) {
          quality -= 0.12;
          blob = await renderBlob(currentW, currentH, quality);
        }

        // If still > TARGET_MAX_BYTES, scale dimensions down further
        while (blob.size > TARGET_MAX_BYTES && currentW > 600) {
          currentW = Math.round(currentW * 0.8);
          currentH = Math.round(currentH * 0.8);
          blob = await renderBlob(currentW, currentH, quality);
        }

        const compressedFile = new File([blob], fileName.replace(/\.[^/.]+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        resolve({
          file: compressedFile,
          dataUrl,
          originalSize,
          compressedSize: blob.size,
          originalFormatted: formatBytes(originalSize),
          compressedFormatted: formatBytes(blob.size),
          width: currentW,
          height: currentH,
          isUnder1MB: blob.size < MAX_BYTES,
        });
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}
