/// <reference types="vite/client" />

interface Window {
  pane?: {
    savePng: (
      suggestedName: string,
      dataUrl: string
    ) => Promise<{ ok: boolean; cancelled?: boolean; path?: string }>;
  };
}
