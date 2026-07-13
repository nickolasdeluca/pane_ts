import type { Callout, EditorState, Rect, Size } from "./state.ts";

export interface RenderAssets {
  screenshot: HTMLImageElement | null;
  backgroundImage: HTMLImageElement | null;
}

export function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function presetSize(editor: EditorState): Size {
  return { width: editor.preset.width, height: editor.preset.height };
}

export function captionBlockHeight(canvasSize: Size, editor: EditorState) {
  const width = canvasSize.width;
  const pad = editor.paddingAmount;
  const hPad = width * (0.05 + pad * 0.1);
  const maxWidth = width - hPad * 2;
  const captionFontSize = Math.max(24, editor.captionSize * width);
  const subtitleFontSize = captionFontSize * 0.34;
  const family = fontFamily(editor.captionFont);
  const captionLines = markupLineCount(editor.caption || " ", {
    maxWidth,
    fontSize: captionFontSize,
    fontFamily: family,
    letterSpacing: 0
  });
  const subtitleLines = editor.subtitle
    ? markupLineCount(editor.subtitle, {
        maxWidth,
        fontSize: subtitleFontSize,
        fontFamily: family,
        letterSpacing: 0
      })
    : 0;
  const captionHeight = captionLines * captionFontSize * 1.25;
  const subtitleHeight = editor.subtitle
    ? subtitleLines * subtitleFontSize * 1.4 + captionFontSize * 0.18
    : 0;
  return captionHeight + subtitleHeight;
}

export function modelStageFrame(canvasSize: Size, editor: EditorState): Rect {
  const width = canvasSize.width;
  const height = canvasSize.height;
  const pad = editor.paddingAmount;
  const capPad = height * (0.04 + pad * 0.05);
  const gap = height * (0.02 + pad * 0.05);
  const blockHeight = captionBlockHeight(canvasSize, editor);
  const stageHeight = Math.max(1, height - capPad - blockHeight - gap);
  const y = editor.captionPosition === "top" ? capPad + blockHeight + gap : 0;

  return { x: 0, y, width, height: stageHeight };
}

export function modelScreenFrame(stageSize: Size, editor: EditorState): Rect {
  const aspect = editor.preset.width / editor.preset.height;
  let width = stageSize.width * editor.modelScreenWidth;
  let height = width / aspect;
  const maxHeight = stageSize.height * 0.86;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }

  const centerX = stageSize.width * (0.5 + editor.modelScreenOffsetX);
  const centerY = stageSize.height * (0.5 + editor.modelScreenOffsetY);
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}

export function screenshotFrame(canvasSize: Size, editor: EditorState): Rect {
  if (editor.modelEnabled) {
    const stage = modelStageFrame(canvasSize, editor);
    const screen = modelScreenFrame(stage, editor);
    return {
      x: stage.x + screen.x,
      y: stage.y + screen.y,
      width: screen.width,
      height: screen.height
    };
  }

  const width = canvasSize.width;
  const height = canvasSize.height;
  const pad = editor.paddingAmount;
  const hPad = width * (0.05 + pad * 0.1);
  const capPad = height * (0.04 + pad * 0.05);
  const gap = height * (0.02 + pad * 0.05);
  const blockHeight = captionBlockHeight(canvasSize, editor);
  const deviceAreaHeight = Math.max(0, height - capPad - blockHeight - gap);
  const deviceAreaY = editor.captionPosition === "top" ? capPad + blockHeight + gap : 0;
  const maxWidth = width - hPad * 2;
  const maxHeight = deviceAreaHeight - hPad * 2;
  const aspect = editor.preset.width / editor.preset.height;

  if (maxWidth <= 0 || maxHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const fitByHeight = maxWidth / maxHeight > aspect;
  const frameHeight = fitByHeight ? maxHeight : maxWidth / aspect;
  const frameWidth = fitByHeight ? frameHeight * aspect : maxWidth;
  return {
    x: (width - frameWidth) / 2,
    y: deviceAreaY + (deviceAreaHeight - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight
  };
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  editor: EditorState,
  assets: RenderAssets
) {
  const size = presetSize(editor);
  ctx.clearRect(0, 0, size.width, size.height);

  if (editor.backgroundMode === "gradient") {
    const radians = (editor.gradientAngle * Math.PI) / 180;
    const x0 = (0.5 - Math.cos(radians) * 0.5) * size.width;
    const y0 = (0.5 - Math.sin(radians) * 0.5) * size.height;
    const x1 = (0.5 + Math.cos(radians) * 0.5) * size.width;
    const y1 = (0.5 + Math.sin(radians) * 0.5) * size.height;
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    const stops = editor.gradientStops.length
      ? editor.gradientStops
      : [
          { id: "background", color: editor.background },
          { id: "accent", color: editor.accent }
        ];
    stops.forEach((stop, index) => {
      gradient.addColorStop(stops.length === 1 ? 0 : index / (stops.length - 1), stop.color);
    });
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = editor.background;
  }

  ctx.fillRect(0, 0, size.width, size.height);

  if (assets.backgroundImage) {
    drawImageCover(ctx, assets.backgroundImage, 0, 0, size.width, size.height);
  }
}

export function drawForeground(
  ctx: CanvasRenderingContext2D,
  editor: EditorState,
  assets: RenderAssets
) {
  const size = presetSize(editor);

  drawCaption(ctx, editor, size);

  if (!editor.modelEnabled) {
    drawDevice(ctx, editor, assets, size);
  }

  drawCallouts(ctx, editor, assets, size);
}

export function renderExportCanvas(
  editor: EditorState,
  assets: RenderAssets,
  modelCanvas: HTMLCanvasElement | null
) {
  const size = presetSize(editor);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create export canvas.");
  }

  drawBackground(ctx, editor, assets);

  if (editor.modelEnabled && modelCanvas) {
    const stage = modelStageFrame(size, editor);
    ctx.drawImage(modelCanvas, stage.x, stage.y, stage.width, stage.height);
  }

  drawForeground(ctx, editor, assets);
  return canvas;
}

function drawCaption(ctx: CanvasRenderingContext2D, editor: EditorState, size: Size) {
  const width = size.width;
  const height = size.height;
  const pad = editor.paddingAmount;
  const hPad = width * (0.05 + pad * 0.1);
  const capPad = height * (0.04 + pad * 0.05);
  const maxWidth = width - hPad * 2;
  const captionFontSize = Math.max(24, editor.captionSize * width);
  const subtitleFontSize = captionFontSize * 0.34;
  const family = fontFamily(editor.captionFont);
  const captionTextOptions = {
    maxWidth,
    fontSize: captionFontSize,
    fontFamily: family,
    letterSpacing: 0
  };
  const subtitleTextOptions = {
    maxWidth,
    fontSize: subtitleFontSize,
    fontFamily: family,
    letterSpacing: 0
  };
  const captionLines = wrapMarkupLines(ctx, parseMarkup(editor.caption || " "), captionTextOptions);
  const subtitleLines = wrapMarkupLines(ctx, parseMarkup(editor.subtitle || ""), subtitleTextOptions);
  const lineGap = captionFontSize * 0.18;
  const captionHeight = captionLines.length * captionFontSize * 1.25;
  const subtitleHeight = editor.subtitle ? subtitleLines.length * subtitleFontSize * 1.4 : 0;
  const blockHeight =
    captionHeight + (editor.subtitle ? lineGap + subtitleHeight : 0);
  let y = editor.captionPosition === "top" ? capPad : height - capPad - blockHeight;

  if (editor.subtitle && editor.subtitlePlacement === "above") {
    y = drawMarkupLines(ctx, subtitleLines, y, {
      x: hPad,
      maxWidth,
      fontSize: subtitleFontSize,
      fontFamily: family,
      color: alpha(editor.textColor, 0.85),
      accent: editor.accent,
      lineHeight: subtitleFontSize * 1.4,
      letterSpacing: 0
    });
    y += lineGap;
  }

  y = drawMarkupLines(ctx, captionLines, y, {
    x: hPad,
    maxWidth,
    fontSize: captionFontSize,
    fontFamily: family,
    color: editor.textColor,
    accent: editor.accent,
    lineHeight: captionFontSize * 1.25,
    letterSpacing: 0
  });

  if (editor.subtitle && editor.subtitlePlacement === "below") {
    y += lineGap;
    drawMarkupLines(ctx, subtitleLines, y, {
      x: hPad,
      maxWidth,
      fontSize: subtitleFontSize,
      fontFamily: family,
      color: alpha(editor.textColor, 0.85),
      accent: editor.accent,
      lineHeight: subtitleFontSize * 1.4,
      letterSpacing: 0
    });
  }
}

function drawDevice(
  ctx: CanvasRenderingContext2D,
  editor: EditorState,
  assets: RenderAssets,
  size: Size
) {
  const frame = screenshotFrame(size, editor);
  const scaledFrame = {
    x: frame.x + editor.screenshotOffsetX * frame.width,
    y: frame.y + editor.screenshotOffsetY * frame.height,
    width: frame.width * editor.screenshotScale,
    height: frame.height * editor.screenshotScale
  };
  scaledFrame.x -= (scaledFrame.width - frame.width) / 2;
  scaledFrame.y -= (scaledFrame.height - frame.height) / 2;

  const radius = editor.preset.cornerRadius * (scaledFrame.width / editor.preset.width);
  const bezel =
    editor.preset.kind === "mac"
      ? Math.max(2, scaledFrame.width * 0.006)
      : Math.max(2, scaledFrame.width * 0.012);

  if (editor.showDeviceFrame) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = bezel * 8;
    ctx.shadowOffsetY = bezel * 3;
    roundedRect(
      ctx,
      scaledFrame.x - bezel,
      scaledFrame.y - bezel,
      scaledFrame.width + bezel * 2,
      scaledFrame.height + bezel * 2,
      radius + bezel
    );
    ctx.fillStyle = editor.preset.kind === "mac" ? "#090A0D" : "#000000";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  roundedRect(ctx, scaledFrame.x, scaledFrame.y, scaledFrame.width, scaledFrame.height, radius);
  ctx.clip();
  if (assets.screenshot) {
    drawImageCover(
      ctx,
      assets.screenshot,
      scaledFrame.x,
      scaledFrame.y,
      scaledFrame.width,
      scaledFrame.height
    );
  } else {
    ctx.fillStyle = alpha(editor.textColor, 0.08);
    ctx.fillRect(scaledFrame.x, scaledFrame.y, scaledFrame.width, scaledFrame.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = alpha(editor.textColor, 0.55);
    ctx.font = `700 ${scaledFrame.width * 0.045}px ${fontFamily(editor.captionFont)}`;
    ctx.fillText("Drop your screenshot here", scaledFrame.x + scaledFrame.width / 2, scaledFrame.y + scaledFrame.height / 2 - scaledFrame.width * 0.03);
    ctx.fillStyle = alpha(editor.textColor, 0.35);
    ctx.font = `700 ${scaledFrame.width * 0.022}px "Segoe UI", sans-serif`;
    ctx.fillText("OR CLICK - OR PASTE", scaledFrame.x + scaledFrame.width / 2, scaledFrame.y + scaledFrame.height / 2 + scaledFrame.width * 0.04);
  }
  ctx.restore();

  if (!editor.showDeviceFrame) {
    return;
  }

  if (editor.preset.kind === "mac") {
    drawMacChrome(ctx, scaledFrame, radius);
  } else if (
    editor.preset.kind === "iphone" &&
    editor.preset.cornerRadius > 100 &&
    editor.showSimulatedNotch
  ) {
    const islandWidth = scaledFrame.width * 0.3;
    const islandHeight = scaledFrame.width * 0.082;
    roundedRect(
      ctx,
      scaledFrame.x + scaledFrame.width / 2 - islandWidth / 2,
      scaledFrame.y + scaledFrame.width * 0.06,
      islandWidth,
      islandHeight,
      islandHeight / 2
    );
    ctx.fillStyle = "#000000";
    ctx.fill();
  }
}

function drawMacChrome(ctx: CanvasRenderingContext2D, frame: Rect, radius: number) {
  const titleHeight = Math.max(18, Math.min(42, frame.height * 0.055));
  ctx.save();
  roundedRect(ctx, frame.x, frame.y, frame.width, frame.height, radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, frame.y, 0, frame.y + titleHeight);
  gradient.addColorStop(0, "rgba(255,255,255,0.38)");
  gradient.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(frame.x, frame.y, frame.width, titleHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frame.x, frame.y + titleHeight);
  ctx.lineTo(frame.x + frame.width, frame.y + titleHeight);
  ctx.stroke();

  const dotSize = titleHeight * 0.3;
  const dotY = frame.y + titleHeight * 0.5;
  const firstX = frame.x + titleHeight * 0.64;
  ["#FF5F57", "#FFBD2E", "#28C840"].forEach((color, index) => {
    ctx.beginPath();
    ctx.arc(firstX + index * dotSize * 1.8, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.restore();
}

function drawCallouts(
  ctx: CanvasRenderingContext2D,
  editor: EditorState,
  assets: RenderAssets,
  size: Size
) {
  if (!editor.callouts.length) {
    return;
  }

  const shotFrame = screenshotFrame(size, editor);

  for (const callout of editor.callouts) {
    const bubble = bubbleRect(callout, size);
    const lineThickness = Math.max(2, size.width * 0.0035);
    const cornerRadius = Math.min(bubble.width, bubble.height) * 0.08;

    ctx.save();
    calloutPath(ctx, bubble, callout.shape, cornerRadius);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.shadowColor = "rgba(0,0,0,0.32)";
    ctx.shadowBlur = Math.min(bubble.width, bubble.height) * 0.1;
    ctx.shadowOffsetY = Math.min(bubble.width, bubble.height) * 0.04;
    ctx.fill();
    ctx.restore();

    ctx.save();
    calloutPath(ctx, bubble, callout.shape, cornerRadius);
    ctx.clip();
    if (assets.screenshot) {
      const zoom = callout.zoom;
      const zoomedWidth = shotFrame.width * zoom;
      const zoomedHeight = shotFrame.height * zoom;
      const tx = bubble.width / 2 - (callout.sourceRect.x + callout.sourceRect.width / 2) * zoomedWidth;
      const ty = bubble.height / 2 - (callout.sourceRect.y + callout.sourceRect.height / 2) * zoomedHeight;
      ctx.drawImage(
        assets.screenshot,
        bubble.x + tx,
        bubble.y + ty,
        zoomedWidth,
        zoomedHeight
      );
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(bubble.x, bubble.y, bubble.width, bubble.height);
    }
    ctx.restore();

    ctx.save();
    calloutPath(ctx, bubble, callout.shape, cornerRadius);
    ctx.strokeStyle = "rgba(0,0,0,0.92)";
    ctx.lineWidth = lineThickness * 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

export function bubbleRect(callout: Callout, size: Size): Rect {
  const height = Math.max(40, callout.bubbleSize * size.width);
  const width = callout.shape === "circle" ? height : height * callout.bubbleAspect;
  return {
    x: callout.bubbleCenter.x * size.width - width / 2,
    y: callout.bubbleCenter.y * size.height - height / 2,
    width,
    height
  };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (sourceWidth - sw) / 2;
  const sy = (sourceHeight - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

interface MarkupChunk {
  text: string;
  accent: boolean;
}

interface TextMeasureOptions {
  maxWidth: number;
  fontSize: number;
  fontFamily: string;
  letterSpacing: number;
}

let measurementCanvas: HTMLCanvasElement | null = null;

function parseMarkup(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/[|\n]/).map((line) => {
    const chunks: MarkupChunk[] = [];
    let accent = false;
    let buffer = "";

    const flush = () => {
      if (buffer) {
        chunks.push({ text: buffer, accent });
        buffer = "";
      }
    };

    for (const char of line) {
      if (char === "*") {
        flush();
        accent = !accent;
      } else {
        buffer += char;
      }
    }

    flush();
    return chunks.length ? chunks : [{ text: " ", accent: false }];
  });
}

function markupLineCount(text: string, options: TextMeasureOptions) {
  const ctx = measurementContext();
  if (!ctx) {
    return Math.max(1, parseMarkup(text).length);
  }

  return wrapMarkupLines(ctx, parseMarkup(text), options).length;
}

function measurementContext() {
  if (typeof document === "undefined") {
    return null;
  }

  measurementCanvas ??= document.createElement("canvas");
  return measurementCanvas.getContext("2d");
}

function wrapMarkupLines(
  ctx: CanvasRenderingContext2D,
  hardLines: MarkupChunk[][],
  options: TextMeasureOptions
) {
  const lines: MarkupChunk[][] = [];

  for (const hardLine of hardLines) {
    const tokens = tokenizeMarkupLine(hardLine);
    let current: MarkupChunk[] = [];
    let currentWidth = 0;

    const pushCurrent = () => {
      const trimmed = trimLineEnd(current);
      lines.push(trimmed.length ? trimmed : [{ text: " ", accent: false }]);
      current = [];
      currentWidth = 0;
    };

    for (const token of tokens) {
      const isSpace = /^\s+$/.test(token.text);
      const normalized = isSpace ? { ...token, text: " " } : token;
      const tokenWidth = measureChunk(ctx, normalized, options);

      if (isSpace) {
        if (current.length > 0 && currentWidth + tokenWidth <= options.maxWidth) {
          current = appendChunk(current, normalized);
          currentWidth += tokenWidth;
        }
        continue;
      }

      if (current.length > 0 && currentWidth + tokenWidth > options.maxWidth) {
        pushCurrent();
      }

      if (tokenWidth > options.maxWidth) {
        for (const char of normalized.text) {
          const charChunk = { text: char, accent: normalized.accent };
          const charWidth = measureChunk(ctx, charChunk, options);
          if (current.length > 0 && currentWidth + charWidth > options.maxWidth) {
            pushCurrent();
          }
          current = appendChunk(current, charChunk);
          currentWidth += charWidth;
        }
      } else {
        current = appendChunk(current, normalized);
        currentWidth += tokenWidth;
      }
    }

    pushCurrent();
  }

  return lines;
}

function tokenizeMarkupLine(line: MarkupChunk[]) {
  const tokens: MarkupChunk[] = [];

  for (const chunk of line) {
    const parts = chunk.text.match(/\s+|[^\s]+/g) ?? [];
    for (const part of parts) {
      tokens.push({ text: part, accent: chunk.accent });
    }
  }

  return tokens;
}

function appendChunk(line: MarkupChunk[], chunk: MarkupChunk) {
  if (!chunk.text) {
    return line;
  }

  const last = line.at(-1);
  if (last && last.accent === chunk.accent) {
    return [...line.slice(0, -1), { ...last, text: last.text + chunk.text }];
  }

  return [...line, chunk];
}

function trimLineEnd(line: MarkupChunk[]) {
  const next = [...line];

  while (next.length > 0) {
    const last = next[next.length - 1];
    const trimmed = last.text.replace(/\s+$/g, "");
    if (trimmed) {
      next[next.length - 1] = { ...last, text: trimmed };
      break;
    }
    next.pop();
  }

  return next;
}

function measureChunk(
  ctx: CanvasRenderingContext2D,
  chunk: MarkupChunk,
  options: TextMeasureOptions
) {
  ctx.font = chunkFont(chunk, options);
  return ctx.measureText(chunk.text).width + Math.max(0, chunk.text.length - 1) * options.letterSpacing;
}

function chunkFont(chunk: MarkupChunk, options: TextMeasureOptions) {
  return `${chunk.accent ? "italic " : ""}800 ${options.fontSize}px ${options.fontFamily}`;
}

function drawMarkupLines(
  ctx: CanvasRenderingContext2D,
  lines: MarkupChunk[][],
  y: number,
  options: {
    x: number;
    maxWidth: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    accent: string;
    lineHeight: number;
    letterSpacing: number;
  }
) {
  ctx.textBaseline = "top";

  for (const line of lines) {
    const widths = line.map((chunk) => {
      ctx.font = chunkFont(chunk, options);
      return ctx.measureText(chunk.text).width;
    });
    const lineWidth = widths.reduce((sum, width) => sum + width, 0);
    let x = options.x + Math.max(0, (options.maxWidth - lineWidth) / 2);

    line.forEach((chunk, index) => {
      ctx.font = chunkFont(chunk, options);
      ctx.fillStyle = chunk.accent ? options.accent : options.color;
      ctx.fillText(chunk.text, x, y);
      x += widths[index] + options.letterSpacing;
    });

    y += options.lineHeight;
  }

  return y;
}

function fontFamily(name: string) {
  switch (name) {
    case "SF Rounded":
      return `"Arial Rounded MT Bold", "Segoe UI", sans-serif`;
    case "SF Pro":
      return `"Segoe UI", system-ui, sans-serif`;
    case "New York":
      return `"Georgia", serif`;
    case "Helvetica Neue":
      return `"Helvetica Neue", "Arial", sans-serif`;
    case "Avenir Next":
      return `"Avenir Next", "Segoe UI", sans-serif`;
    case "Optima":
      return `"Optima", "Segoe UI", sans-serif`;
    case "Georgia":
      return `"Georgia", serif`;
    default:
      return `"Fraunces", "Georgia", serif`;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function calloutPath(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  shape: Callout["shape"],
  radius: number
) {
  if (shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width / 2,
      rect.height / 2,
      0,
      0,
      Math.PI * 2
    );
    return;
  }

  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, shape === "square" ? 0 : radius);
}

function alpha(hex: string, opacity: number) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  if (Number.isNaN(value) || clean.length !== 6) {
    return hex;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
