import { useEffect } from "react";

const scriptID = "kofi-overlay-widget-script";
const scriptSource = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";

export function KofiWidget() {
  useEffect(() => {
    const drawWidget = () => {
      if (window.paneKofiWidgetDrawn || !window.kofiWidgetOverlay) {
        return;
      }

      window.kofiWidgetOverlay.draw("nickolasdeluca", {
        type: "floating-chat",
        "floating-chat.donateButton.text": "Support Us",
        "floating-chat.donateButton.background-color": "#fcbf47",
        "floating-chat.donateButton.text-color": "#323842"
      });
      window.paneKofiWidgetDrawn = true;
    };

    let script = document.getElementById(scriptID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptID;
      script.src = scriptSource;
      script.async = true;
      document.body.appendChild(script);
    }

    if (window.kofiWidgetOverlay) {
      drawWidget();
    } else {
      script.addEventListener("load", drawWidget, { once: true });
    }

    return () => script?.removeEventListener("load", drawWidget);
  }, []);

  return null;
}
