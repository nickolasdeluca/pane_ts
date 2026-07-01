/// <reference types="vite/client" />

interface Window {
  kofiWidgetOverlay?: {
    draw: (username: string, options: Record<string, string>) => void;
  };
  paneKofiWidgetDrawn?: boolean;
}
