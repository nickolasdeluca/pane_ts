export type CaptionPosition = "top" | "bottom";
export type PaddingMode = "comfy" | "tight" | "xtight";
export type SubtitlePlacement = "above" | "below";
export type ToolMode = "move" | "callouts";
export type BackgroundMode = "solid" | "gradient";
export type ScreenshotPlatform = "iphone" | "macOS";
export type DeviceKind = "iphone" | "ipad" | "mac";
export type CalloutShape = "circle" | "rounded" | "square";

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export function publicAssetPath(assetPath: string) {
  return `${import.meta.env.BASE_URL}${assetPath.replace(/^\/+/, "")}`;
}

export interface DevicePreset extends Size {
  id: string;
  label: string;
  cornerRadius: number;
  kind: DeviceKind;
}

export interface ThemePreset {
  id: string;
  name: string;
  background: string;
  accent: string;
  text: string;
}

export interface GradientStop {
  id: string;
  color: string;
}

export interface FrameColorPreset {
  id: string;
  label: string;
  swatch: string;
  materials: Record<string, string>;
}

export interface Callout {
  id: string;
  sourceRect: Rect;
  bubbleCenter: Point;
  zoom: number;
  bubbleSize: number;
  bubbleAspect: number;
  shape: CalloutShape;
}

export interface EditorState {
  backgroundMode: BackgroundMode;
  background: string;
  accent: string;
  textColor: string;
  backgroundImageUrl: string | null;
  gradientStops: GradientStop[];
  gradientAngle: number;
  captionFont: string;
  screenshotPlatform: ScreenshotPlatform;
  preset: DevicePreset;
  showDeviceFrame: boolean;
  showSimulatedNotch: boolean;
  caption: string;
  captionSize: number;
  captionPosition: CaptionPosition;
  paddingMode: PaddingMode;
  paddingAmount: number;
  subtitle: string;
  subtitlePlacement: SubtitlePlacement;
  screenshotUrl: string | null;
  screenshotName: string | null;
  screenshotScale: number;
  screenshotOffsetX: number;
  screenshotOffsetY: number;
  modelUrl: string | null;
  modelName: string | null;
  modelEnabled: boolean;
  modelRotationY: number;
  modelRotationX: number;
  modelImportRotationY: number;
  modelScale: number;
  modelOffsetY: number;
  modelScreenWidth: number;
  modelScreenOffsetX: number;
  modelScreenOffsetY: number;
  modelScreenCornerRadius: number;
  modelFrameColorID: string;
  modelDynamicIslandWidth: number;
  modelDynamicIslandHeight: number;
  modelDynamicIslandOffsetX: number;
  modelDynamicIslandOffsetY: number;
  callouts: Callout[];
  toolMode: ToolMode;
}

export const paddingDefaults: Record<PaddingMode, number> = {
  comfy: 0.62,
  tight: 0.4,
  xtight: 0.18
};

export const devicePresets = {
  iPhone69: {
    id: "iphone69",
    label: "iPhone 6.9 in - 1320 x 2868",
    width: 1320,
    height: 2868,
    cornerRadius: 225,
    kind: "iphone"
  },
  iPhone67: {
    id: "iphone67",
    label: "iPhone 6.7 in - 1290 x 2796",
    width: 1290,
    height: 2796,
    cornerRadius: 220,
    kind: "iphone"
  },
  iPhone63: {
    id: "iphone63",
    label: "iPhone 6.3 in - 1206 x 2622",
    width: 1206,
    height: 2622,
    cornerRadius: 210,
    kind: "iphone"
  },
  iPhone65: {
    id: "iphone65",
    label: "iPhone 6.5 in - 1284 x 2778",
    width: 1284,
    height: 2778,
    cornerRadius: 210,
    kind: "iphone"
  },
  iPhone55: {
    id: "iphone55",
    label: "iPhone 5.5 in - 1242 x 2208",
    width: 1242,
    height: 2208,
    cornerRadius: 60,
    kind: "iphone"
  },
  iPad13: {
    id: "ipad13",
    label: "iPad Pro 13 in - 2064 x 2752",
    width: 2064,
    height: 2752,
    cornerRadius: 90,
    kind: "ipad"
  },
  iPad129: {
    id: "ipad129",
    label: "iPad Pro 12.9 in - 2048 x 2732",
    width: 2048,
    height: 2732,
    cornerRadius: 50,
    kind: "ipad"
  },
  mac: {
    id: "mac",
    label: "Mac - 2880 x 1800",
    width: 2880,
    height: 1800,
    cornerRadius: 60,
    kind: "mac"
  },
  macWide: {
    id: "macwide",
    label: "Mac 16:10 - 2560 x 1600",
    width: 2560,
    height: 1600,
    cornerRadius: 50,
    kind: "mac"
  }
} satisfies Record<string, DevicePreset>;

export const allDevicePresets = Object.values(devicePresets);

export function presetsForPlatform(platform: ScreenshotPlatform) {
  return allDevicePresets.filter((preset) =>
    platform === "iphone" ? preset.kind !== "mac" : preset.kind === "mac"
  );
}

export function presetSupportsPlatform(preset: DevicePreset, platform: ScreenshotPlatform) {
  return platform === "iphone" ? preset.kind !== "mac" : preset.kind === "mac";
}

export const captionFonts = [
  "Fraunces",
  "SF Rounded",
  "SF Pro",
  "New York",
  "Helvetica Neue",
  "Avenir Next",
  "Georgia",
  "Optima"
];

export const themePresets: ThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    background: "#0A0D14",
    accent: "#BE6446",
    text: "#F5F5F5"
  },
  {
    id: "porcelain",
    name: "Porcelain",
    background: "#F5F2ED",
    accent: "#1A1F2E",
    text: "#1A1F2E"
  },
  {
    id: "ocean",
    name: "Ocean",
    background: "#0D2E57",
    accent: "#8CD9FF",
    text: "#F7F7F7"
  },
  {
    id: "violet",
    name: "Violet",
    background: "#211233",
    accent: "#C780FF",
    text: "#F7F7F7"
  },
  {
    id: "ember",
    name: "Ember",
    background: "#260D0A",
    accent: "#FF8C4D",
    text: "#F7F7F7"
  },
  {
    id: "moss",
    name: "Moss",
    background: "#0F211A",
    accent: "#8CF2A6",
    text: "#F5F5F5"
  }
];

export const frameColorPresets: FrameColorPreset[] = [
  {
    id: "natural",
    label: "Natural Titanium",
    swatch: "#9D927F",
    materials: { backpanel: "#9D927F", metalframe: "#5F5950", gray: "#221F1B" }
  },
  {
    id: "blue",
    label: "Blue Titanium",
    swatch: "#3D4D5C",
    materials: { backpanel: "#394D5F", metalframe: "#3A4553", gray: "#1A1F24" }
  },
  {
    id: "white",
    label: "White Titanium",
    swatch: "#E3DDD4",
    materials: { backpanel: "#E3DDD4", metalframe: "#C4BDB4", gray: "#2A2825" }
  },
  {
    id: "black",
    label: "Black Titanium",
    swatch: "#3A3632",
    materials: { backpanel: "#3A3632", metalframe: "#2A2725", gray: "#1A1918" }
  },
  {
    id: "desert",
    label: "Desert Titanium",
    swatch: "#C4A882",
    materials: { backpanel: "#C4A882", metalframe: "#8A7560", gray: "#2A2218" }
  },
  {
    id: "deep-purple",
    label: "Deep Purple",
    swatch: "#5B4A6E",
    materials: { backpanel: "#5B4A6E", metalframe: "#3D3348", gray: "#1E1825" }
  },
  {
    id: "gold",
    label: "Gold",
    swatch: "#E3C8A0",
    materials: { backpanel: "#E3C8A0", metalframe: "#C9A96E", gray: "#2A2418" }
  },
  {
    id: "red",
    label: "Product Red",
    swatch: "#C1272D",
    materials: { backpanel: "#C1272D", metalframe: "#8A1C20", gray: "#1A0A0A" }
  }
];

export const defaultState: EditorState = {
  backgroundMode: "solid",
  background: themePresets[0].background,
  accent: themePresets[0].accent,
  textColor: themePresets[0].text,
  backgroundImageUrl: null,
  gradientStops: [
    { id: "g1", color: "#294AC2" },
    { id: "g2", color: "#8C2E9E" },
    { id: "g3", color: "#0F142E" }
  ],
  gradientAngle: 135,
  captionFont: "Fraunces",
  screenshotPlatform: "iphone",
  preset: devicePresets.iPhone69,
  showDeviceFrame: true,
  showSimulatedNotch: false,
  caption: "Add text *here*",
  captionSize: 0.085,
  captionPosition: "top",
  paddingMode: "comfy",
  paddingAmount: paddingDefaults.comfy,
  subtitle: "",
  subtitlePlacement: "above",
  screenshotUrl: null,
  screenshotName: null,
  screenshotScale: 1,
  screenshotOffsetX: 0,
  screenshotOffsetY: 0,
  modelUrl: null,
  modelName: null,
  modelEnabled: false,
  modelRotationY: 0,
  modelRotationX: 0,
  modelImportRotationY: 0,
  modelScale: 1,
  modelOffsetY: 0,
  modelScreenWidth: 0.826,
  modelScreenOffsetX: 0,
  modelScreenOffsetY: 0,
  modelScreenCornerRadius: 0.1,
  modelFrameColorID: frameColorPresets[0].id,
  modelDynamicIslandWidth: 0.3,
  modelDynamicIslandHeight: 0.085,
  modelDynamicIslandOffsetX: 0,
  modelDynamicIslandOffsetY: 0,
  callouts: [],
  toolMode: "move"
};

export function makeCallout(): Callout {
  return {
    id: crypto.randomUUID(),
    sourceRect: { x: 0.3, y: 0.3, width: 0.4, height: 0.18 },
    bubbleCenter: { x: 0.78, y: 0.5 },
    zoom: 1.2,
    bubbleSize: 0.5,
    bubbleAspect: 1.65,
    shape: "rounded"
  };
}

export function applyAppscreen3DDefaults(state: EditorState): EditorState {
  return {
    ...state,
    modelUrl: publicAssetPath("models/iphone-15-pro-max.glb"),
    modelName: "iphone-15-pro-max.glb",
    modelEnabled: true,
    modelRotationY: -90,
    modelRotationX: 0,
    modelImportRotationY: 90,
    modelScale: 1,
    modelOffsetY: 0,
    modelScreenWidth: 0.826,
    modelScreenOffsetX: 0,
    modelScreenOffsetY: 0,
    modelScreenCornerRadius: 0.16,
    modelFrameColorID: frameColorPresets[0].id,
    modelDynamicIslandWidth: 0.3,
    modelDynamicIslandHeight: 0.085,
    modelDynamicIslandOffsetX: 0,
    modelDynamicIslandOffsetY: 0
  };
}

export function applyCustomModelDefaults(
  state: EditorState,
  modelUrl: string,
  modelName: string
): EditorState {
  const mac = state.screenshotPlatform === "macOS";
  return {
    ...state,
    modelUrl,
    modelName,
    modelEnabled: true,
    modelRotationY: 0,
    modelRotationX: 0,
    modelImportRotationY: 0,
    modelScale: 1,
    modelOffsetY: 0,
    modelScreenWidth: mac ? 0.82 : 0.826,
    modelScreenOffsetX: 0,
    modelScreenOffsetY: 0,
    modelScreenCornerRadius: mac ? 0.035 : 0.1,
    modelDynamicIslandWidth: 0.3,
    modelDynamicIslandHeight: 0.085,
    modelDynamicIslandOffsetX: 0,
    modelDynamicIslandOffsetY: 0
  };
}
