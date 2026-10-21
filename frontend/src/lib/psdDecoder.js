let decoderReady;

function getDecoder() {
  if (!decoderReady) {
    decoderReady = import("@imagemagick/magick-wasm").then(async (decoder) => {
      const url = new URL("../../node_modules/@imagemagick/magick-wasm/dist/x86/magick.wasm", import.meta.url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load the PSD converter (HTTP ${response.status}). Reconnect and reload the app to cache it for offline use.`);
      }
      await decoder.initializeImageMagick(new Uint8Array(await response.arrayBuffer()));
      return decoder;
    }).catch((error) => {
      decoderReady = undefined;
      throw error;
    });
  }
  return decoderReady;
}

export async function decodePsd(file, maxDimension = 2048) {
  const { ImageMagick, MagickReadSettings, MagickFormat, ColorSpace, MagickColors, AlphaAction } = await getDecoder();
  const settings = new MagickReadSettings({ format: MagickFormat.Psd, frameIndex: 0, frameCount: 1 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  return ImageMagick.read(bytes, settings, (image) => {
    image.colorSpace = ColorSpace.sRGB;
    image.backgroundColor = MagickColors.White;
    image.alpha(AlphaAction.Remove);
    if (Math.max(image.width, image.height) > maxDimension) {
      image.resize(maxDimension, maxDimension);
    }
    return image.write(MagickFormat.Png, (data) => new Blob([data], { type: "image/png" }));
  });
}
