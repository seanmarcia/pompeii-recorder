import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { compressImage, isHeicFile, isPsdFile } from "../src/lib/imageCompressor.js";

const MAX_BYTES = 1024 * 1024;
const originals = new Map();
let imageWidth;
let imageHeight;
let outputSize;
let invalidImage;
let missingContext;
let readError;

beforeEach(() => {
  imageWidth = 4000;
  imageHeight = 3000;
  outputSize = () => 100_000;
  invalidImage = missingContext = readError = false;
  for (const key of ["Image", "document", "FileReader"]) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  globalThis.Image = class {
    width = imageWidth;
    height = imageHeight;
    set src(_value) {
      queueMicrotask(() => invalidImage ? this.onerror() : this.onload());
    }
  };
  globalThis.FileReader = class {
    async readAsDataURL(blob) {
      if (readError) return this.onerror();
      this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
      this.onload();
    }
  };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      return {
        getContext: () => missingContext ? null : { drawImage() {} },
        toBlob(callback, type, quality) {
          const size = outputSize(this.width, this.height, quality);
          callback(size === null ? null : new Blob([new Uint8Array(size)], { type }));
        },
      };
    },
  };
  mock.method(URL, "createObjectURL", () => "blob:test-photo");
  mock.method(URL, "revokeObjectURL", () => {});
});

afterEach(() => {
  mock.restoreAll();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test("detects iPhone MIME types and case-insensitive HEIC/HEIF extensions", () => {
  for (const type of ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]) {
    assert.equal(isHeicFile({ type, name: "photo" }), true);
  }
  for (const name of ["IMG_0001.HEIC", "photo.heif", "photo.HeIf"]) {
    assert.equal(isHeicFile({ name, type: "" }), true);
    assert.equal(isHeicFile({ name, type: "application/octet-stream" }), true);
  }
  assert.equal(isHeicFile({ name: "photo.jpg", type: "image/jpeg" }), false);
});

test("detects PSD extensions and Photoshop MIME types, including missing MIME information", () => {
  for (const type of ["image/vnd.adobe.photoshop", "image/psd", "image/x-photoshop", "application/photoshop", "application/x-photoshop"]) {
    assert.equal(isPsdFile({ type, name: "photo" }), true);
  }
  for (const type of ["", "application/octet-stream"]) {
    assert.equal(isPsdFile({ type, name: "field.PSD" }), true);
  }
  assert.equal(isPsdFile({ type: "image/jpeg", name: "field.jpg" }), false);
  assert.equal(isPsdFile({ type: "", name: "field.psd.jpg" }), false);
});

test("outputs a correctly named JPEG with matching preview bytes and bounded dimensions", async () => {
  const input = new File([new Uint8Array(2 * MAX_BYTES)], "field.png", { type: "image/png" });
  const result = await compressImage(input);
  assert.equal(result.file.name, "field.jpg");
  assert.equal(result.file.type, "image/jpeg");
  assert.equal(result.originalSize, input.size);
  assert.equal(result.compressedSize, result.file.size);
  assert.ok(result.file.size < MAX_BYTES);
  assert.equal(result.isUnder1MB, true);
  assert.equal(result.width, 2048);
  assert.equal(result.height, 1536);
  const previewBytes = Buffer.from(result.dataUrl.split(",")[1], "base64");
  assert.deepEqual(previewBytes, Buffer.from(await result.file.arrayBuffer()));
  assert.equal(URL.revokeObjectURL.mock.callCount(), 1);
});

test("continues reducing tall images even when their width is already below 600 pixels", async () => {
  imageWidth = 400;
  imageHeight = 12000;
  outputSize = (_width, height) => height > 500 ? 2 * MAX_BYTES : 80_000;
  const result = await compressImage(new File(["photo"], "tall.jpg", { type: "image/jpeg" }));
  assert.ok(result.height <= 500);
  assert.ok(result.width >= 1);
  assert.ok(result.file.size < MAX_BYTES);
});

test("rejects an encoder that cannot produce an image strictly below the size limit", async () => {
  outputSize = () => MAX_BYTES;
  await assert.rejects(compressImage(new File(["photo"], "large.jpg")), /below 1 MB/);
});

test("rejects a failed JPEG encoding rather than hanging or returning a broken photo", async () => {
  outputSize = () => null;
  await assert.rejects(compressImage(new File(["photo"], "broken.jpg")), /encode.*JPEG/);
});

test("reports unsupported image, canvas, and preview-read errors", async () => {
  invalidImage = true;
  await assert.rejects(compressImage(new File(["photo"], "broken.jpg")), /unsupported image/);
  invalidImage = false;
  missingContext = true;
  await assert.rejects(compressImage(new File(["photo"], "photo.jpg")), /initialize photo processing/);
  missingContext = false;
  readError = true;
  await assert.rejects(compressImage(new File(["photo"], "photo.jpg")), /read image/);
});

test("supports unnamed blobs and validates custom dimensions", async () => {
  const result = await compressImage(new Blob(["photo"], { type: "image/jpeg" }), { maxDimension: 1000 });
  assert.match(result.file.name, /\.jpg$/);
  assert.equal(result.width, 1000);
  assert.equal(result.height, 750);
  await assert.rejects(compressImage(new Blob(), { maxDimension: -1 }), /positive integer/);
});
