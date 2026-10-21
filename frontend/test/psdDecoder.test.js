import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, mock, test } from "node:test";
import { ColorSpace, ImageMagick } from "@imagemagick/magick-wasm";
import { decodePsd } from "../src/lib/psdDecoder.js";

let wasmStatus = 503;
let runtimeRequests = 0;

function psdFixture({ mode = 3, depth = 8, compression = 0, includePixels = true } = {}) {
  const header = Buffer.alloc(26);
  header.write("8BPS");
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(mode === 1 ? 1 : mode === 4 ? 5 : 3, 12);
  header.writeUInt32BE(1, 14);
  header.writeUInt32BE(2, 18);
  header.writeUInt16BE(depth, 22);
  header.writeUInt16BE(mode, 24);
  const compressionBytes = Buffer.alloc(2);
  compressionBytes.writeUInt16BE(compression);
  const pixels = mode === 1 ? [64, 192]
    : mode === 4 ? [0, 255, 255, 0, 255, 255, 255, 255, 255, 128]
      : depth === 16 ? [255, 255, 0, 0, 0, 0, 255, 255, 128, 0, 0, 0]
        : [255, 0, 0, 255, 0, 0];
  return new File([
    header, Buffer.alloc(12), compressionBytes, includePixels ? Buffer.from(pixels) : Buffer.alloc(0),
  ], "test.psd", { type: "image/vnd.adobe.photoshop" });
}

async function inspect(blob) {
  assert.equal(blob.type, "image/png");
  return ImageMagick.read(new Uint8Array(await blob.arrayBuffer()), (image) => ({
    width: image.width,
    height: image.height,
    colorSpace: image.colorSpace,
    pixels: image.getPixels((pixels) => [
      Array.from(pixels.toByteArray(0, 0, 1, 1, "RGB")),
      Array.from(pixels.toByteArray(image.width - 1, 0, 1, 1, "RGB")),
    ]),
  }));
}

before(() => {
  const wasm = readFileSync(new URL("../node_modules/@imagemagick/magick-wasm/dist/x86/magick.wasm", import.meta.url));
  mock.method(globalThis, "fetch", async (url) => {
    assert.match(String(url), /magick\.wasm$/);
    runtimeRequests++;
    return new Response(wasmStatus === 200 ? wasm : null, { status: wasmStatus });
  });
});

after(() => mock.restoreAll());

test("reports missing offline converter data and permits retry when it becomes available", async () => {
  await assert.rejects(decodePsd(psdFixture()), /HTTP 503/);
  wasmStatus = 200;
  const image = await inspect(await decodePsd(psdFixture()));
  assert.equal(runtimeRequests, 2);
  assert.equal(image.width, 2);
});

test("decodes the document composite with correct RGB pixels", async () => {
  const image = await inspect(await decodePsd(psdFixture()));
  assert.deepEqual(image.pixels, [[255, 0, 0], [0, 255, 0]]);
  assert.equal(image.colorSpace, ColorSpace.sRGB);
  assert.equal(image.height, 1);
});

test("supports CMYK PSDs with an additional channel", async () => {
  const image = await inspect(await decodePsd(psdFixture({ mode: 4 })));
  assert.equal(image.width, 2);
  assert.equal(image.colorSpace, ColorSpace.sRGB);
  assert.notDeepEqual(image.pixels[0], image.pixels[1]);
});

test("preserves grayscale and 16-bit RGB content", async () => {
  const grayscale = await inspect(await decodePsd(psdFixture({ mode: 1 })));
  assert.deepEqual(grayscale.pixels, [[64, 64, 64], [192, 192, 192]]);
  const rgb16 = await inspect(await decodePsd(psdFixture({ depth: 16 })));
  assert.deepEqual(rgb16.pixels, [[255, 0, 128], [0, 255, 0]]);
});

test("honors the requested dimension limit without upscaling small images", async () => {
  const resized = await inspect(await decodePsd(psdFixture(), 1));
  assert.equal(resized.width, 1);
  assert.equal(resized.height, 1);
  const original = await inspect(await decodePsd(psdFixture(), 2048));
  assert.equal(original.width, 2);
  assert.equal(original.height, 1);
});

test("surfaces malformed or truncated PSD data instead of producing a blank preview", async () => {
  await assert.rejects(decodePsd(new File(["not a PSD"], "broken.psd")));
  await assert.rejects(decodePsd(psdFixture({ includePixels: false })));
  await assert.rejects(decodePsd(psdFixture({ compression: 99 })));
});
