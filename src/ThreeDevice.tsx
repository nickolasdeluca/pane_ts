import { MutableRefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { EditorState, FrameColorPreset, Rect } from "./state.ts";
import { frameColorPresets } from "./state.ts";

interface ThreeDeviceProps {
  editor: EditorState;
  screenshotImage: HTMLImageElement | null;
  stage: Rect;
  modelCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
}

interface ModelNormalization {
  center: THREE.Vector3;
}

interface ScreenSurface {
  center: THREE.Vector3;
  height: number;
}

const defaultModelScreenControlValue = 0.826;
const screenSurfaceInsetScale = 0.986;
const screenSurfaceDepthOffset = 0.026;
const overlayLayerDepthOffset = 0.004;
const fallbackScreenSurface: ScreenSurface = {
  center: new THREE.Vector3(0.0015, 0.0007, 0.1363),
  height: 3.5299
};

export function ThreeDevice({
  editor,
  screenshotImage,
  stage,
  modelCanvasRef
}: ThreeDeviceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const normalizerRef = useRef<THREE.Group | null>(null);
  const screenMeshRef = useRef<THREE.Mesh | null>(null);
  const islandMeshRef = useRef<THREE.Mesh | null>(null);
  const screenSurfaceRef = useRef<ScreenSurface>(fallbackScreenSurface);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(Math.max(1, stage.width), Math.max(1, stage.height), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, stage.width / stage.height, 0.01, 200);
    camera.position.set(0, 0, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 3.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2.5, 2, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.4);
    fill.position.set(-3, -2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(-1, 3, -4);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 12;

    hostRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    modelCanvasRef.current = renderer.domElement;

    let animationFrame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      modelCanvasRef.current = null;
      controls.dispose();
      disposeObject(modelRootRef.current);
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      modelRootRef.current = null;
      normalizerRef.current = null;
      screenMeshRef.current = null;
      islandMeshRef.current = null;
      screenSurfaceRef.current = fallbackScreenSurface;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(Math.max(1, stage.width), Math.max(1, stage.height), false);
    camera.aspect = stage.width / stage.height;
    camera.updateProjectionMatrix();
  }, [stage.width, stage.height]);

  useEffect(() => {
    if (!editor.modelUrl || !sceneRef.current) {
      return;
    }

    const scene = sceneRef.current;
    const loader = new GLTFLoader();
    let cancelled = false;

    disposeObject(modelRootRef.current);
    modelRootRef.current?.removeFromParent();
    modelRootRef.current = null;
    normalizerRef.current = null;
    screenMeshRef.current = null;
    islandMeshRef.current = null;
    screenSurfaceRef.current = fallbackScreenSurface;

    loader.load(
      editor.modelUrl,
      (gltf) => {
        if (cancelled) {
          disposeObject(gltf.scene);
          return;
        }

        const modelRoot = new THREE.Group();
        const normalizer = new THREE.Group();
        const sourceScreenSurface = findScreenSurface(gltf.scene);
        normalizer.add(gltf.scene);
        const normalization = normalizeModel(normalizer);
        screenSurfaceRef.current = sourceScreenSurface
          ? normalizeScreenSurface(sourceScreenSurface, normalization)
          : fallbackScreenSurface;
        normalizer.rotation.y = THREE.MathUtils.degToRad(editor.modelImportRotationY);
        modelRoot.add(normalizer);
        scene.add(modelRoot);
        modelRootRef.current = modelRoot;
        normalizerRef.current = normalizer;
        applyModelTransform(editor, modelRoot);
        applyFrameColor(modelRoot, currentFrameColor(editor));
        syncScreenPlane(
          editor,
          screenshotImage,
          normalizerRef,
          screenMeshRef,
          islandMeshRef,
          screenSurfaceRef.current
        );
      },
      undefined,
      (error) => {
        console.error("Failed to load GLB", error);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [editor.modelUrl, editor.modelImportRotationY]);

  useEffect(() => {
    if (modelRootRef.current) {
      applyModelTransform(editor, modelRootRef.current);
      applyFrameColor(modelRootRef.current, currentFrameColor(editor));
    }

    syncScreenPlane(
      editor,
      screenshotImage,
      normalizerRef,
      screenMeshRef,
      islandMeshRef,
      screenSurfaceRef.current
    );
  }, [
    editor.modelRotationX,
    editor.modelRotationY,
    editor.modelScale,
    editor.modelOffsetY,
    editor.modelScreenWidth,
    editor.modelScreenOffsetX,
    editor.modelScreenOffsetY,
    editor.modelScreenCornerRadius,
    editor.modelFrameColorID,
    editor.modelDynamicIslandEnabled,
    editor.modelDynamicIslandWidth,
    editor.modelDynamicIslandHeight,
    editor.modelDynamicIslandOffsetX,
    editor.modelDynamicIslandOffsetY,
    editor.screenshotPlatform,
    editor.preset.width,
    editor.preset.height,
    editor.textColor,
    screenshotImage
  ]);

  return (
    <div
      ref={hostRef}
      className="three-stage"
      style={{
        left: stage.x,
        top: stage.y,
        width: stage.width,
        height: stage.height
      }}
    />
  );
}

function normalizeModel(group: THREE.Group): ModelNormalization {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (maxDimension > 0) {
    const scale = 3.75 / maxDimension;
    group.scale.setScalar(scale);
    group.children.forEach((child) => {
      child.position.sub(center);
    });
  }

  return { center };
}

function findScreenSurface(root: THREE.Object3D): ScreenSurface | null {
  root.updateWorldMatrix(true, true);
  const screenBox = new THREE.Box3();
  let found = false;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material || !isScreenSurfaceMaterial(mesh.material)) {
      return;
    }

    const meshBox = new THREE.Box3().setFromObject(mesh);
    if (meshBox.isEmpty()) {
      return;
    }

    if (found) {
      screenBox.union(meshBox);
    } else {
      screenBox.copy(meshBox);
      found = true;
    }
  });

  if (!found) {
    return null;
  }

  const size = screenBox.getSize(new THREE.Vector3());
  if (size.x <= 0 || size.y <= 0) {
    return null;
  }

  return {
    center: screenBox.getCenter(new THREE.Vector3()),
    height: size.y
  };
}

function isScreenSurfaceMaterial(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  return materials.some((item) => {
    const name = item.name.toLowerCase();
    return name === "material.001" || name.includes("screen") || name.includes("display");
  });
}

function normalizeScreenSurface(
  surface: ScreenSurface,
  normalization: ModelNormalization
): ScreenSurface {
  return {
    center: surface.center.clone().sub(normalization.center),
    height: surface.height
  };
}

function applyModelTransform(editor: EditorState, modelRoot: THREE.Group) {
  modelRoot.rotation.x = THREE.MathUtils.degToRad(editor.modelRotationX);
  modelRoot.rotation.y = THREE.MathUtils.degToRad(editor.modelRotationY);
  const scale = Math.max(0.05, editor.modelScale);
  modelRoot.scale.set(scale, scale, scale);
  modelRoot.position.set(0, editor.modelOffsetY, 0);
}

function syncScreenPlane(
  editor: EditorState,
  screenshotImage: HTMLImageElement | null,
  normalizerRef: MutableRefObject<THREE.Group | null>,
  screenMeshRef: MutableRefObject<THREE.Mesh | null>,
  islandMeshRef: MutableRefObject<THREE.Mesh | null>,
  screenSurface: ScreenSurface
) {
  const normalizer = normalizerRef.current;
  if (!normalizer) {
    return;
  }

  const aspect = editor.preset.width / editor.preset.height;
  const screenScale = Math.max(0.05, editor.modelScreenWidth / defaultModelScreenControlValue);
  const planeHeight = screenSurface.height * screenScale * screenSurfaceInsetScale;
  const planeWidth = planeHeight * aspect;

  if (!screenMeshRef.current) {
    const mesh = new THREE.Mesh();
    mesh.name = "screenshotPlane";
    mesh.renderOrder = 10;
    normalizer.add(mesh);
    screenMeshRef.current = mesh;
  }

  const screenMesh = screenMeshRef.current;
  screenMesh.geometry.dispose();
  screenMesh.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  screenMesh.position.set(
    screenSurface.center.x + editor.modelScreenOffsetX,
    screenSurface.center.y + editor.modelScreenOffsetY,
    screenSurface.center.z + screenSurfaceDepthOffset
  );
  disposeMaterial(screenMesh.material);
  const screenTexture = screenshotImage
    ? makeRoundedTexture(screenshotImage, editor.modelScreenCornerRadius)
    : makePlaceholderTexture(editor);
  screenMesh.material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: screenTexture,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  syncDynamicIsland(editor, normalizer, islandMeshRef, screenSurface, planeWidth, planeHeight);
}

function syncDynamicIsland(
  editor: EditorState,
  normalizer: THREE.Group,
  islandMeshRef: MutableRefObject<THREE.Mesh | null>,
  screenSurface: ScreenSurface,
  planeWidth: number,
  planeHeight: number
) {
  const enabled = editor.screenshotPlatform === "iphone" && editor.modelDynamicIslandEnabled;

  if (!enabled) {
    islandMeshRef.current?.removeFromParent();
    disposeObject(islandMeshRef.current);
    islandMeshRef.current = null;
    return;
  }

  if (!islandMeshRef.current) {
    const mesh = new THREE.Mesh();
    mesh.name = "dynamicIsland";
    mesh.renderOrder = 100;
    normalizer.add(mesh);
    islandMeshRef.current = mesh;
  }

  const islandWidth = planeWidth * editor.modelDynamicIslandWidth;
  const islandHeight = planeWidth * editor.modelDynamicIslandHeight;
  const mesh = islandMeshRef.current;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.PlaneGeometry(islandWidth, islandHeight);
  disposeMaterial(mesh.material);
  mesh.material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });

  const planeX = screenSurface.center.x + editor.modelScreenOffsetX;
  const planeY = screenSurface.center.y + editor.modelScreenOffsetY;
  const topInset = planeWidth * 0.065;
  mesh.position.set(
    planeX + editor.modelDynamicIslandOffsetX,
    planeY + planeHeight / 2 - topInset - islandHeight / 2 + editor.modelDynamicIslandOffsetY,
    screenSurface.center.z + screenSurfaceDepthOffset + overlayLayerDepthOffset
  );
}

function makeRoundedTexture(image: HTMLImageElement, cornerRadiusFactor: number) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const radius = canvas.width * cornerRadiusFactor;
    roundedRect(ctx, 0, 0, canvas.width, canvas.height, radius);
    ctx.clip();
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function makePlaceholderTexture(editor: EditorState) {
  const canvas = document.createElement("canvas");
  canvas.width = editor.preset.width;
  canvas.height = editor.preset.height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const radius = canvas.width * editor.modelScreenCornerRadius;
    roundedRect(ctx, 0, 0, canvas.width, canvas.height, radius);
    ctx.clip();
    ctx.fillStyle = "#090A0D";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = alpha(editor.textColor, 0.58);
    ctx.font = `700 ${canvas.width * 0.045}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText("Drop your screenshot here", canvas.width / 2, canvas.height / 2 - canvas.width * 0.03);
    ctx.fillStyle = alpha(editor.textColor, 0.34);
    ctx.font = `700 ${canvas.width * 0.022}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText("OR CLICK - OR PASTE", canvas.width / 2, canvas.height / 2 + canvas.width * 0.04);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function applyFrameColor(root: THREE.Object3D, preset: FrameColorPreset | null) {
  if (!preset) {
    return;
  }

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const key = (material.name || "").toLowerCase();
      const color = preset.materials[key];
      if (!color) {
        continue;
      }

      const standardMaterial = material as THREE.MeshStandardMaterial;
      if (standardMaterial.color) {
        standardMaterial.color.set(color);
      }
      if (standardMaterial.emissive) {
        standardMaterial.emissive.set("#000000");
      }
      standardMaterial.needsUpdate = true;
    }
  });
}

function currentFrameColor(editor: EditorState) {
  if (editor.screenshotPlatform !== "iphone") {
    return null;
  }

  return frameColorPresets.find((preset) => preset.id === editor.modelFrameColorID) ?? null;
}

function disposeObject(object: THREE.Object3D | null) {
  if (!object) {
    return;
  }

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }
    mesh.geometry?.dispose();
    disposeMaterial(mesh.material);
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | null | undefined) {
  if (!material) {
    return;
  }

  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    for (const value of Object.values(item)) {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }
    }
    item.dispose();
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
