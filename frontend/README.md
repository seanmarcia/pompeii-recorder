# React + Vite

## Field photos

JPEG, PNG, iPhone HEIC/HEIF photos, and Photoshop PSD files can be selected or
dragged into the sheet. HEIC/HEIF and PSD files are decoded on the device,
converted to JPEG, and resized to a
maximum dimension of 2048 pixels. Every accepted output is strictly below
1,048,576 bytes, with further resizing when needed. Invalid or unconvertible
files show an error and are not added. Submission waits for photo processing.

The JPEG preview, draft, offline outbox, and upload all use the same compressed
image bytes. No external image conversion service is used. The production
service worker caches both decoders along with the app, so conversion works offline
after the app has been opened and cached once.

HEIC decoding uses [heic-to](https://github.com/hoppergee/heic-to), licensed under
LGPL-3.0-or-later. Its license is included as `heic-to-LICENSE.txt` in production
builds. The decoder is a separate, lazy-loaded bundle.

PSD decoding uses [ImageMagick WebAssembly](https://github.com/dlemstra/magick-wasm),
including support for CMYK files with extra channels. Its license and third-party
notices are included in production builds. PSD conversion reads the first
document image (the merged preview), not an individual layer; layers are not
kept in the JPEG. For best compatibility, save PSDs with **Maximize Compatibility**
enabled in Photoshop. Transparent areas are flattened onto white, and the image
is converted to sRGB. The approximately 15 MB WebAssembly runtime is bundled and
cached with the app; it does not upload the PSD to a server.

## Viewing sheets

The **Your Name / Data Entered By** field uses the same dropdown names and order
as **Recorder Name**, and remembers a valid selection for subsequent sheets.

Choose **View an Existing Sheet**, or **View Sheet** on a catalog card, to read
the saved master sheet. This works with the cached offline catalog and does not
create, overwrite, or show an unsaved draft. **Edit / Log Updates** remains a
separate action. Photo filenames are retained; previews are available when the
record includes a reachable image URL.

Run `npm test` for compression and read-only rendering tests, `npm run build`
for the production build, and `npm run lint` for lint checks.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
