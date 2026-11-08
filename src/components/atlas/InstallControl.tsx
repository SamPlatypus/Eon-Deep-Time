import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function standaloneNow() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

function iosNow() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function InstallControl() {
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(standaloneNow());
    setIos(iosNow());

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
      setHelp(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed) return;
    if (promptEvent) {
      setBusy(true);
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPromptEvent(null);
      } catch {
        setHelp(true);
      } finally {
        setBusy(false);
      }
      return;
    }
    setHelp((open) => !open);
  }

  return (
    <div className="max-w-sm">
      <button
        type="button"
        onClick={() => void install()}
        disabled={installed || busy}
        aria-expanded={help}
        className={
          "min-h-11 rounded-full px-3 text-sm " +
          (installed ? "text-muted" : "bg-surface text-fg shadow-panel")
        }
      >
        {installed ? "Installed" : busy ? "Installing…" : "Install app"}
      </button>
      {help && !installed ? (
        <p className="mt-2 text-pretty text-sm text-muted">
          {ios
            ? "In Safari, tap Share, then Add to Home Screen. Eon opens full screen from the icon and keeps its timeline on this device."
            : "If the install dialog did not open, use the browser menu and choose Install app or Add to Home Screen. Eon then opens from its icon, on this device."}
        </p>
      ) : null}
    </div>
  );
}
