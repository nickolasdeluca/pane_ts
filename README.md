# Pane Windows

This is a Windows-focused Electron port scaffold for [ibuhs/Pane](https://github.com/ibuhs/Pane), replacing the SwiftUI and SceneKit surface with a React, TypeScript, canvas, and Three.js implementation.

## Current Slice

- Electron desktop shell with a native PNG save dialog.
- Vite + React + TypeScript renderer.
- Canvas compositor for App Store screenshot presets, backgrounds, captions, subtitles, 2D frames, and zoom callouts.
- Three.js `GLTFLoader` rendering for GLB device mockups.
- Bundled iPhone 15 Pro Max GLB copied from upstream Pane.
- Screenshot, background, and GLB import through file inputs, drag/drop, and paste for screenshots.
- Full-size PNG export from the composed canvas, including the current Three.js canvas layer.

## Development

```powershell
bun install
bun run dev
```

Open the dev server at `http://127.0.0.1:5173`.

For the Electron shell:

```powershell
bun run build
bun run build:electron
bun run electron:dev
```

For a Windows package:

```powershell
bun run dist
```

## Assets And License

The bundled iPhone GLB and icon are reused from upstream Pane. The upstream project is licensed under GPL-3.0, and this port keeps the same license. The bundled iPhone 15 Pro Max model is credited upstream to MajdyModels under CC BY 4.0.
