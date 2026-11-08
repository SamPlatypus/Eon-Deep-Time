import { useEffect } from "react";
import { GlobeView } from "@/components/atlas/GlobeView";
import { Hud } from "@/components/atlas/Hud";
import { useAtlas } from "@/lib/atlas-store";

export function AtlasApp() {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const st = useAtlas.getState();
      if (ev.key === " ") {
        ev.preventDefault();
        if (!st.playing && st.slider >= 999) st.setSlider(0);
        st.setPlaying(!st.playing);
      } else if (ev.key === "Escape") {
        st.clearSelection();
      } else if (ev.key === "ArrowRight") {
        st.setPlaying(false);
        st.setSlider(st.slider + 12);
      } else if (ev.key === "ArrowLeft") {
        st.setPlaying(false);
        st.setSlider(st.slider - 12);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg select-none">
      <h1 className="sr-only">Eon, a deep-time atlas of plates, seas, and biomes</h1>
      <GlobeView />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_46%,var(--color-bg)_82%)]" />
      <Hud />
    </main>
  );
}
