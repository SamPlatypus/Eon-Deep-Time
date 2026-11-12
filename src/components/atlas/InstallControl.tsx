const APK_URL = "https://github.com/SamPlatypus/Eon-Deep-Time/releases/download/v0.2.0/Eon.apk";

function runningInApp() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Downloads the Android package. Hidden once Eon is already running as the installed app. */
export function InstallControl() {
  if (typeof window !== "undefined" && runningInApp()) return null;
  return (
    <a
      href={APK_URL}
      className="inline-flex min-h-11 items-center rounded-full bg-surface px-3 text-sm text-fg shadow-panel"
    >
      Install app
    </a>
  );
}
