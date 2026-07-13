# Pane TS

This is a web port of [ibuhs/Pane](https://github.com/ibuhs/Pane), replacing the SwiftUI and SceneKit surface with a React, TypeScript, canvas, and Three.js implementation.

## Current Slice

- Vite + React + TypeScript web application.
- Canvas compositor for App Store screenshot presets, backgrounds, captions, subtitles, 2D frames, and zoom callouts.
- iPhone screenshot presets through the 6.9-inch iPhone (1320 x 2868).
- Optional simulated notch/Dynamic Island rendering for both 2D and 3D device compositions.
- Three.js `GLTFLoader` rendering for GLB device mockups.
- Bundled iPhone 15 Pro Max GLB copied from upstream Pane.
- Screenshot, background, and GLB import through file inputs, drag/drop, and paste for screenshots.
- Browser-based full-size PNG export from the composed canvas, including the current Three.js canvas layer.

## Development

```bash
bun install
bun run dev
```

Open the dev server at `http://127.0.0.1:5173`.

## Production

```bash
bun run build
```

The static production output is written to `dist/` and can be deployed to any static web host. To test it locally:

```bash
bun run preview
```

## Assets And License

The bundled iPhone GLB and icon are reused from upstream Pane. The upstream project is licensed under GPL-3.0, and this port keeps the same license. The bundled iPhone 15 Pro Max model is credited upstream to MajdyModels under CC BY 4.0.
