import {
  Box,
  Download,
  Image as ImageIcon,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  Upload,
  X
} from "lucide-react";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  bubbleRect,
  drawBackground,
  drawForeground,
  loadImage,
  modelStageFrame,
  presetSize,
  renderExportCanvas,
  screenshotFrame
} from "./composition.ts";
import { ThreeDevice } from "./ThreeDevice.tsx";
import {
  applyAppscreen3DDefaults,
  applyCustomModelDefaults,
  captionFonts,
  defaultState,
  devicePresets,
  EditorState,
  frameColorPresets,
  makeCallout,
  paddingDefaults,
  presetsForPlatform,
  presetSupportsPlatform,
  publicAssetPath,
  themePresets,
  type Callout,
  type DevicePreset,
  type Rect,
  type ScreenshotPlatform
} from "./state.ts";
import { KofiWidget } from "./KofiWidget.tsx";

interface LoadedAssets {
  screenshot: HTMLImageElement | null;
  backgroundImage: HTMLImageElement | null;
}

type EditorPatch = Partial<EditorState> | ((state: EditorState) => EditorState);

export default function App() {
  const [editor, setEditorState] = useState(defaultState);
  const [assets, setAssets] = useState<LoadedAssets>({
    screenshot: null,
    backgroundImage: null
  });
  const [isExporting, setIsExporting] = useState(false);
  const modelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const modelInputRef = useRef<HTMLInputElement | null>(null);

  const setEditor = (patch: EditorPatch) => {
    setEditorState((state) => (typeof patch === "function" ? patch(state) : { ...state, ...patch }));
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadImage(editor.screenshotUrl), loadImage(editor.backgroundImageUrl)]).then(
      ([screenshot, backgroundImage]) => {
        if (!cancelled) {
          setAssets({ screenshot, backgroundImage });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [editor.screenshotUrl, editor.backgroundImageUrl]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const image = files.find((file) => file.type.startsWith("image/"));
      if (image) {
        loadScreenshotFile(image);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function loadScreenshotFile(file: File) {
    const url = URL.createObjectURL(file);
    setEditor({
      screenshotUrl: url,
      screenshotName: file.name
    });
  }

  function loadBackgroundFile(file: File) {
    const url = URL.createObjectURL(file);
    setEditor({
      backgroundImageUrl: url
    });
  }

  function loadModelFile(file: File) {
    const url = URL.createObjectURL(file);
    setEditor((state) => applyCustomModelDefaults(state, url, file.name));
  }

  function onScreenshotInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      loadScreenshotFile(file);
    }
    event.target.value = "";
  }

  function onBackgroundInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      loadBackgroundFile(file);
    }
    event.target.value = "";
  }

  function onModelInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      loadModelFile(file);
    }
    event.target.value = "";
  }

  async function exportPng() {
    setIsExporting(true);
    try {
      const canvas = renderExportCanvas(editor, assets, modelCanvasRef.current);
      const dataUrl = canvas.toDataURL("image/png");
      const filename = `Pane-${editor.preset.id}-${editor.preset.width}x${editor.preset.height}.png`;

      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = filename;
      anchor.click();
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="app-shell">
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={onScreenshotInput}
      />
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={onBackgroundInput}
      />
      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        hidden
        onChange={onModelInput}
      />

      <section className="preview-pane">
        <TopBar editor={editor} setEditor={setEditor} />
        <CanvasPreview
          editor={editor}
          setEditor={setEditor}
          assets={assets}
          modelCanvasRef={modelCanvasRef}
          onScreenshotPick={() => screenshotInputRef.current?.click()}
          onDropFiles={(files) => {
            const file = files[0];
            if (!file) {
              return;
            }
            if (file.name.match(/\.(glb|gltf)$/i)) {
              loadModelFile(file);
            } else if (file.type.startsWith("image/")) {
              loadScreenshotFile(file);
            }
          }}
        />
      </section>

      <aside className="sidebar">
        <header className="brand-header">
          <div>
            <h1>pane.</h1>
            <p>
              {editor.preset.width} x {editor.preset.height} - {presetSummary(editor.preset)}
            </p>
          </div>
          <img src={publicAssetPath("icon.png")} alt="" />
        </header>

        <ControlPanel
          editor={editor}
          setEditor={setEditor}
          onScreenshotPick={() => screenshotInputRef.current?.click()}
          onBackgroundPick={() => backgroundInputRef.current?.click()}
          onModelPick={() => modelInputRef.current?.click()}
          onExport={() => void exportPng()}
        />
      </aside>

      {isExporting && (
        <div className="export-overlay" role="status">
          <div className="spinner" />
          <span>Rendering...</span>
        </div>
      )}
      <KofiWidget />
    </main>
  );
}

function TopBar({
  editor,
  setEditor
}: {
  editor: EditorState;
  setEditor: (patch: EditorPatch) => void;
}) {
  return (
    <div className="topbar">
      <Segmented
        value={editor.toolMode}
        options={[
          ["move", "Move"],
          ["callouts", "Callouts"]
        ]}
        onChange={(toolMode) => setEditor({ toolMode: toolMode as EditorState["toolMode"] })}
      />
    </div>
  );
}

function CanvasPreview({
  editor,
  setEditor,
  assets,
  modelCanvasRef,
  onScreenshotPick,
  onDropFiles
}: {
  editor: EditorState;
  setEditor: (patch: EditorPatch) => void;
  assets: LoadedAssets;
  modelCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  onScreenshotPick: () => void;
  onDropFiles: (files: File[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const foregroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(0.35);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [hoveredCalloutID, setHoveredCalloutID] = useState<string | null>(null);
  const [draggingCalloutID, setDraggingCalloutID] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const calloutDragRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const size = presetSize(editor);
  const stage = useMemo(() => modelStageFrame(size, editor), [editor, size.width, size.height]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setScale(Math.min((rect.width - 40) / size.width, (rect.height - 40) / size.height, 1));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [size.width, size.height]);

  useEffect(() => {
    const bg = backgroundCanvasRef.current;
    const fg = foregroundCanvasRef.current;
    if (!bg || !fg) {
      return;
    }

    bg.width = size.width;
    bg.height = size.height;
    fg.width = size.width;
    fg.height = size.height;

    const bgCtx = bg.getContext("2d");
    const fgCtx = fg.getContext("2d");
    if (!bgCtx || !fgCtx) {
      return;
    }

    drawBackground(bgCtx, editor, assets);
    fgCtx.clearRect(0, 0, size.width, size.height);
    drawForeground(fgCtx, editor, assets);
  }, [editor, assets, size.width, size.height]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (editor.toolMode !== "callouts" || !assets.screenshot) {
      return;
    }
    const point = pointFromEvent(event);
    const hitCallout = findCalloutAtPoint(editor.callouts, point, size);

    event.currentTarget.setPointerCapture(event.pointerId);
    if (hitCallout) {
      calloutDragRef.current = {
        id: hitCallout.id,
        pointerId: event.pointerId,
        offsetX: point.x - hitCallout.bubbleCenter.x * size.width,
        offsetY: point.y - hitCallout.bubbleCenter.y * size.height
      };
      setDraggingCalloutID(hitCallout.id);
      setHoveredCalloutID(hitCallout.id);
      return;
    }

    dragStartRef.current = point;
    setDragRect({ x: point.x, y: point.y, width: 0, height: 0 });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const point = pointFromEvent(event);
    const calloutDrag = calloutDragRef.current;
    if (calloutDrag && calloutDrag.pointerId === event.pointerId) {
      setEditor((state) => {
        const shotFrame = screenshotFrame(size, state);
        return {
          ...state,
          callouts: state.callouts.map((callout) => {
            if (callout.id !== calloutDrag.id) {
              return callout;
            }

            const bubble = bubbleRect(callout, size);
            const bubbleCenter = {
              x: clampBubbleCenter(
                point.x - calloutDrag.offsetX,
                bubble.width,
                size.width
              ),
              y: clampBubbleCenter(
                point.y - calloutDrag.offsetY,
                bubble.height,
                size.height
              )
            };
            return {
              ...callout,
              bubbleCenter,
              sourceRect: sourceRectUnderBubble(
                callout.sourceRect,
                bubbleCenter,
                shotFrame,
                size
              )
            };
          })
        };
      });
      return;
    }

    const start = dragStartRef.current;
    if (start) {
      setDragRect({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y)
      });
      return;
    }

    const hitCallout = findCalloutAtPoint(editor.callouts, point, size);
    setHoveredCalloutID(hitCallout?.id ?? null);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const calloutDrag = calloutDragRef.current;
    if (calloutDrag && calloutDrag.pointerId === event.pointerId) {
      calloutDragRef.current = null;
      setDraggingCalloutID(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    const start = dragStartRef.current;
    const rect = dragRect;
    dragStartRef.current = null;
    setDragRect(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || !rect || rect.width < 8 || rect.height < 8) {
      return;
    }

    const shotFrame = screenshotFrame(size, editor);
    if (!shotFrame.width || !shotFrame.height) {
      return;
    }

    const nx = clamp((rect.x - shotFrame.x) / shotFrame.width, 0, 1);
    const ny = clamp((rect.y - shotFrame.y) / shotFrame.height, 0, 1);
    const nw = clamp(rect.width / shotFrame.width, 0, 1 - nx);
    const nh = clamp(rect.height / shotFrame.height, 0, 1 - ny);
    if (nw <= 0.02 || nh <= 0.02) {
      return;
    }

    const callout: Callout = {
      ...makeCallout(),
      sourceRect: { x: nx, y: ny, width: nw, height: nh },
      bubbleCenter: {
        x: size.width - rect.x - rect.width > rect.x ? 0.78 : 0.22,
        y: clamp((rect.y + rect.height / 2) / size.height, 0.18, 0.82)
      }
    };
    setEditor((state) => ({ ...state, callouts: [...state.callouts, callout] }));
  }

  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    calloutDragRef.current = null;
    dragStartRef.current = null;
    setDraggingCalloutID(null);
    setDragRect(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={hostRef}
      className="canvas-host"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div
        className={`artboard${editor.toolMode === "callouts" ? " callout-mode" : ""}${
          draggingCalloutID ? " dragging-callout" : hoveredCalloutID ? " hovering-callout" : ""
        }`}
        style={{
          width: size.width,
          height: size.height,
          transform: `scale(${scale})`
        }}
        onClick={() => {
          if (!assets.screenshot && editor.toolMode === "move") {
            onScreenshotPick();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => {
          if (!calloutDragRef.current) {
            setHoveredCalloutID(null);
          }
        }}
      >
        <canvas ref={backgroundCanvasRef} className="canvas-layer" />
        {editor.modelEnabled && editor.modelUrl && (
          <ThreeDevice
            editor={editor}
            screenshotImage={assets.screenshot}
            stage={stage}
            modelCanvasRef={modelCanvasRef}
          />
        )}
        <canvas ref={foregroundCanvasRef} className="canvas-layer foreground" />
        {dragRect && (
          <div
            className="selection-box"
            style={{
              left: dragRect.x,
              top: dragRect.y,
              width: dragRect.width,
              height: dragRect.height,
              borderColor: editor.accent,
              backgroundColor: `${editor.accent}2E`
            }}
          />
        )}
      </div>
    </div>
  );
}

function ControlPanel({
  editor,
  setEditor,
  onScreenshotPick,
  onBackgroundPick,
  onModelPick,
  onExport
}: {
  editor: EditorState;
  setEditor: (patch: EditorPatch) => void;
  onScreenshotPick: () => void;
  onBackgroundPick: () => void;
  onModelPick: () => void;
  onExport: () => void;
}) {
  const availablePresets = presetsForPlatform(editor.screenshotPlatform);

  function setPlatform(platform: ScreenshotPlatform) {
    setEditor((state) => ({
      ...state,
      screenshotPlatform: platform,
      preset: presetSupportsPlatform(state.preset, platform)
        ? state.preset
        : presetsForPlatform(platform)[0]
    }));
  }

  return (
    <div className="controls">
      <Panel title="Theme" icon={<Palette size={16} />}>
        <Label>Background type</Label>
        <Segmented
          value={editor.backgroundMode}
          options={[
            ["solid", "Solid"],
            ["gradient", "Gradient"]
          ]}
          onChange={(backgroundMode) => setEditor({ backgroundMode: backgroundMode as EditorState["backgroundMode"] })}
        />

        <div className="color-row">
          <ColorControl
            label="Background"
            value={editor.background}
            onChange={(background) => setEditor({ background })}
          />
          <ColorControl
            label="Accent"
            value={editor.accent}
            onChange={(accent) => setEditor({ accent })}
          />
          <ColorControl
            label="Text"
            value={editor.textColor}
            onChange={(textColor) => setEditor({ textColor })}
          />
        </div>

        {editor.backgroundMode === "gradient" && (
          <>
            <Label>Gradient colors</Label>
            <div className="gradient-stops">
              {editor.gradientStops.map((stop) => (
                <input
                  key={stop.id}
                  type="color"
                  value={stop.color}
                  title={stop.color}
                  onChange={(event) =>
                    setEditor((state) => ({
                      ...state,
                      gradientStops: state.gradientStops.map((item) =>
                        item.id === stop.id ? { ...item, color: event.target.value } : item
                      )
                    }))
                  }
                />
              ))}
              <button
                className="icon-button"
                type="button"
                title="Add gradient stop"
                onClick={() =>
                  setEditor((state) => ({
                    ...state,
                    gradientStops: [
                      ...state.gradientStops,
                      {
                        id: crypto.randomUUID(),
                        color: state.gradientStops.at(-1)?.color ?? state.accent
                      }
                    ]
                  }))
                }
              >
                <Plus size={15} />
              </button>
            </div>
            <Slider
              label="Gradient angle"
              min={0}
              max={360}
              value={editor.gradientAngle}
              onChange={(gradientAngle) => setEditor({ gradientAngle })}
            />
          </>
        )}

        <div className="theme-grid">
          {themePresets.map((theme) => (
            <button
              key={theme.id}
              className="theme-swatch"
              type="button"
              title={theme.name}
              onClick={() =>
                setEditor({
                  backgroundMode: "solid",
                  background: theme.background,
                  accent: theme.accent,
                  textColor: theme.text
                })
              }
            >
              <span style={{ backgroundColor: theme.background }} />
              <span style={{ backgroundColor: theme.accent }} />
            </button>
          ))}
        </div>

        <button className="secondary-button" type="button" onClick={onBackgroundPick}>
          <Upload size={15} />
          {editor.backgroundImageUrl ? "Replace background" : "Upload background"}
        </button>
        {editor.backgroundImageUrl && (
          <button
            className="ghost-button"
            type="button"
            onClick={() => setEditor({ backgroundImageUrl: null })}
          >
            <X size={15} />
            Remove background
          </button>
        )}
      </Panel>

      <Panel title="Typography" icon={<Type size={16} />}>
        <Label>Font</Label>
        <select
          value={editor.captionFont}
          onChange={(event) => setEditor({ captionFont: event.target.value })}
        >
          {captionFonts.map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>

        <Label>Caption</Label>
        <textarea
          value={editor.caption}
          rows={3}
          onChange={(event) => setEditor({ caption: event.target.value })}
        />

        <Slider
          label="Caption size"
          min={0.04}
          max={0.16}
          step={0.001}
          value={editor.captionSize}
          onChange={(captionSize) => setEditor({ captionSize })}
        />

        <Label>Caption position</Label>
        <Segmented
          value={editor.captionPosition}
          options={[
            ["top", "Top"],
            ["bottom", "Bottom"]
          ]}
          onChange={(captionPosition) =>
            setEditor({ captionPosition: captionPosition as EditorState["captionPosition"] })
          }
        />

        <Label>Padding</Label>
        <Segmented
          value={editor.paddingMode}
          options={[
            ["comfy", "Comfy"],
            ["tight", "Tight"],
            ["xtight", "X-tight"]
          ]}
          onChange={(paddingMode) =>
            setEditor({
              paddingMode: paddingMode as EditorState["paddingMode"],
              paddingAmount: paddingDefaults[paddingMode as EditorState["paddingMode"]]
            })
          }
        />
        <Slider
          label="Padding amount"
          min={0}
          max={1}
          step={0.01}
          value={editor.paddingAmount}
          onChange={(paddingAmount) => setEditor({ paddingAmount })}
        />

        <Label>Subtitle</Label>
        <input
          type="text"
          value={editor.subtitle}
          onChange={(event) => setEditor({ subtitle: event.target.value })}
          placeholder="Optional subtitle"
        />
        <Segmented
          value={editor.subtitlePlacement}
          options={[
            ["above", "Above"],
            ["below", "Below"]
          ]}
          onChange={(subtitlePlacement) =>
            setEditor({ subtitlePlacement: subtitlePlacement as EditorState["subtitlePlacement"] })
          }
        />
      </Panel>

      <Panel title="Preset" icon={<Monitor size={16} />}>
        <Label>Platform</Label>
        <Segmented
          value={editor.screenshotPlatform}
          options={[
            ["iphone", "iPhone"],
            ["macOS", "Mac OS"]
          ]}
          onChange={(platform) => setPlatform(platform as ScreenshotPlatform)}
        />
        <Label>Size</Label>
        <select
          value={editor.preset.id}
          onChange={(event) => {
            const preset = availablePresets.find((item) => item.id === event.target.value);
            if (preset) {
              setEditor({ preset });
            }
          }}
        >
          {availablePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <Toggle
          label="Device frame"
          checked={editor.showDeviceFrame}
          onChange={(showDeviceFrame) => setEditor({ showDeviceFrame })}
        />
        {editor.screenshotPlatform === "iphone" && (
          <Toggle
            label="Simulated notch"
            checked={editor.showSimulatedNotch}
            onChange={(showSimulatedNotch) => setEditor({ showSimulatedNotch })}
          />
        )}
      </Panel>

      <Panel title="Screenshot" icon={<ImageIcon size={16} />}>
        <button className="drop-button" type="button" onClick={onScreenshotPick}>
          <ImageIcon size={18} />
          <span>{editor.screenshotName ?? "Pick or drop screenshot"}</span>
        </button>

        {editor.screenshotUrl && (
          <>
            <Slider
              label="2D device scale"
              min={0.6}
              max={2.2}
              step={0.01}
              value={editor.screenshotScale}
              onChange={(screenshotScale) => setEditor({ screenshotScale })}
            />
            <Slider
              label="2D horizontal offset"
              min={-0.45}
              max={0.45}
              step={0.01}
              value={editor.screenshotOffsetX}
              onChange={(screenshotOffsetX) => setEditor({ screenshotOffsetX })}
            />
            <Slider
              label="2D vertical offset"
              min={-0.45}
              max={0.45}
              step={0.01}
              value={editor.screenshotOffsetY}
              onChange={(screenshotOffsetY) => setEditor({ screenshotOffsetY })}
            />
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setEditor({
                  screenshotScale: 1,
                  screenshotOffsetX: 0,
                  screenshotOffsetY: 0
                })
              }
            >
              <RotateCcw size={15} />
              Reset 2D transform
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setEditor({
                  screenshotUrl: null,
                  screenshotName: null,
                  callouts: []
                })
              }
            >
              <X size={15} />
              Remove screenshot
            </button>
          </>
        )}
      </Panel>

      <Panel title="3D model" icon={<Box size={16} />}>
        <div className="row-between">
          <button className="secondary-button" type="button" onClick={onModelPick}>
            <Upload size={15} />
            {editor.modelName ?? "Upload GLB"}
          </button>
          <Toggle
            label="Enabled"
            checked={editor.modelEnabled}
            disabled={!editor.modelUrl}
            onChange={(modelEnabled) => setEditor({ modelEnabled })}
          />
        </div>

        {editor.screenshotPlatform === "iphone" && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => setEditor((state) => applyAppscreen3DDefaults(state))}
          >
            <Box size={15} />
            iPhone 15 Pro Max model
          </button>
        )}

        {editor.modelEnabled && (
          <>
            <Slider
              label="Rotation Y"
              min={-180}
              max={180}
              step={1}
              value={editor.modelRotationY}
              onChange={(modelRotationY) => setEditor({ modelRotationY })}
            />
            <Slider
              label="Rotation X"
              min={-90}
              max={90}
              step={1}
              value={editor.modelRotationX}
              onChange={(modelRotationX) => setEditor({ modelRotationX })}
            />
            <Slider
              label="Scale"
              min={0.2}
              max={3}
              step={0.01}
              value={editor.modelScale}
              onChange={(modelScale) => setEditor({ modelScale })}
            />
            <Slider
              label="Vertical offset"
              min={-2}
              max={2}
              step={0.01}
              value={editor.modelOffsetY}
              onChange={(modelOffsetY) => setEditor({ modelOffsetY })}
            />

            {editor.screenshotPlatform === "iphone" && (
              <div className="frame-colors">
                {frameColorPresets.map((preset) => (
                  <button
                    key={preset.id}
                    className={preset.id === editor.modelFrameColorID ? "selected" : ""}
                    type="button"
                    title={preset.label}
                    style={{ backgroundColor: preset.swatch }}
                    onClick={() => setEditor({ modelFrameColorID: preset.id })}
                  />
                ))}
              </div>
            )}

            <Slider
              label="Screen height"
              min={0.45}
              max={1}
              step={0.001}
              value={editor.modelScreenWidth}
              onChange={(modelScreenWidth) => setEditor({ modelScreenWidth })}
            />
            <Slider
              label="Screen X"
              min={-0.18}
              max={0.18}
              step={0.001}
              value={editor.modelScreenOffsetX}
              onChange={(modelScreenOffsetX) => setEditor({ modelScreenOffsetX })}
            />
            <Slider
              label="Screen Y"
              min={-0.22}
              max={0.22}
              step={0.001}
              value={editor.modelScreenOffsetY}
              onChange={(modelScreenOffsetY) => setEditor({ modelScreenOffsetY })}
            />
            <Slider
              label="Screen radius"
              min={0.02}
              max={0.18}
              step={0.001}
              value={editor.modelScreenCornerRadius}
              onChange={(modelScreenCornerRadius) => setEditor({ modelScreenCornerRadius })}
            />

            {editor.screenshotPlatform === "iphone" && (
              <>
                {editor.showSimulatedNotch && (
                  <>
                    <Slider
                      label="Island width"
                      min={0.18}
                      max={0.44}
                      step={0.001}
                      value={editor.modelDynamicIslandWidth}
                      onChange={(modelDynamicIslandWidth) =>
                        setEditor({ modelDynamicIslandWidth })
                      }
                    />
                    <Slider
                      label="Island height"
                      min={0.045}
                      max={0.13}
                      step={0.001}
                      value={editor.modelDynamicIslandHeight}
                      onChange={(modelDynamicIslandHeight) =>
                        setEditor({ modelDynamicIslandHeight })
                      }
                    />
                  </>
                )}
              </>
            )}

            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                setEditor({
                  modelUrl: null,
                  modelName: null,
                  modelEnabled: false
                })
              }
            >
              <X size={15} />
              Remove model
            </button>
          </>
        )}
      </Panel>

      <Panel title="Callouts" icon={<Plus size={16} />}>
        <button
          className="secondary-button"
          type="button"
          disabled={!editor.screenshotUrl}
          onClick={() => setEditor((state) => ({ ...state, callouts: [...state.callouts, makeCallout()] }))}
        >
          <Plus size={15} />
          Add callout
        </button>

        {editor.callouts.map((callout, index) => (
          <div className="callout-row" key={callout.id}>
            <div className="row-between">
              <strong>Callout {index + 1}</strong>
              <button
                className="icon-button"
                type="button"
                title="Remove callout"
                onClick={() =>
                  setEditor((state) => ({
                    ...state,
                    callouts: state.callouts.filter((item) => item.id !== callout.id)
                  }))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
            <select
              value={callout.shape}
              onChange={(event) =>
                updateCallout(setEditor, callout.id, {
                  shape: event.target.value as Callout["shape"]
                })
              }
            >
              <option value="circle">Circle</option>
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
            </select>
            <MiniSlider
              label="Zoom"
              min={1.2}
              max={4}
              step={0.05}
              value={callout.zoom}
              onChange={(zoom) => updateCallout(setEditor, callout.id, { zoom })}
            />
            <MiniSlider
              label="Bubble size"
              min={0.15}
              max={0.5}
              step={0.01}
              value={callout.bubbleSize}
              onChange={(bubbleSize) => updateCallout(setEditor, callout.id, { bubbleSize })}
            />
            {callout.shape !== "circle" && (
              <MiniSlider
                label="Aspect"
                min={1}
                max={2.4}
                step={0.01}
                value={callout.bubbleAspect}
                onChange={(bubbleAspect) =>
                  updateCallout(setEditor, callout.id, { bubbleAspect })
                }
              />
            )}
          </div>
        ))}
      </Panel>

      <div className="export-bar">
        <button className="primary-button" type="button" onClick={onExport}>
          <Download size={18} />
          Export {editor.preset.width} x {editor.preset.height} PNG
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-section">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="control-label">{children}</label>;
}

function Segmented({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          className={value === option ? "active" : ""}
          onClick={() => onChange(option)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-control">
      <span>
        {label}
        <b>{formatNumber(value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MiniSlider(props: Parameters<typeof Slider>[0]) {
  return <Slider {...props} />;
}

function ColorControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="color-control">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      <code>{value.toUpperCase()}</code>
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`toggle ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function updateCallout(
  setEditor: (patch: EditorPatch) => void,
  id: string,
  patch: Partial<Callout>
) {
  setEditor((state) => ({
    ...state,
    callouts: state.callouts.map((callout) =>
      callout.id === id ? { ...callout, ...patch } : callout
    )
  }));
}

function findCalloutAtPoint(
  callouts: Callout[],
  point: { x: number; y: number },
  size: { width: number; height: number }
) {
  for (let index = callouts.length - 1; index >= 0; index -= 1) {
    const callout = callouts[index];
    const bubble = bubbleRect(callout, size);
    const nx = (point.x - (bubble.x + bubble.width / 2)) / (bubble.width / 2);
    const ny = (point.y - (bubble.y + bubble.height / 2)) / (bubble.height / 2);

    if (callout.shape === "circle") {
      if (nx * nx + ny * ny <= 1) {
        return callout;
      }
    } else if (
      point.x >= bubble.x &&
      point.x <= bubble.x + bubble.width &&
      point.y >= bubble.y &&
      point.y <= bubble.y + bubble.height
    ) {
      return callout;
    }
  }

  return null;
}

function clampBubbleCenter(position: number, extent: number, total: number) {
  if (extent >= total) {
    return 0.5;
  }
  return clamp(position, extent / 2, total - extent / 2) / total;
}

function sourceRectUnderBubble(
  sourceRect: Rect,
  bubbleCenter: { x: number; y: number },
  shotFrame: Rect,
  size: { width: number; height: number }
): Rect {
  if (!shotFrame.width || !shotFrame.height) {
    return sourceRect;
  }

  const centerX = clamp(
    (bubbleCenter.x * size.width - shotFrame.x) / shotFrame.width,
    sourceRect.width / 2,
    1 - sourceRect.width / 2
  );
  const centerY = clamp(
    (bubbleCenter.y * size.height - shotFrame.y) / shotFrame.height,
    sourceRect.height / 2,
    1 - sourceRect.height / 2
  );

  return {
    ...sourceRect,
    x: centerX - sourceRect.width / 2,
    y: centerY - sourceRect.height / 2
  };
}

function presetSummary(preset: DevicePreset) {
  if (preset.kind === "iphone") {
    return "iPhone App Store";
  }
  if (preset.kind === "ipad") {
    return "iPad App Store";
  }
  return "Mac App Store";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}
