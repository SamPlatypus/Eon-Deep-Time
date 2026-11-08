import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { InstallControl } from "@/components/atlas/InstallControl";
import { holdSpin, useAtlas } from "@/lib/atlas-store";
import { PLACES } from "@/lib/paleo/locations";
import {
  BIOME_META,
  BIOME_ORDER,
  PRESETS,
  ageToSlider,
  chapterFor,
  formatAge,
  formatAgeShort,
} from "@/lib/paleo/science";
import type { SeriesPoint } from "@/lib/globe/protocol";
import type { PlaceSnap } from "@/lib/paleo/types";

function fmtSea(m: number) {
  const r = Math.round(m);
  if (Math.abs(r) < 2) return "0 m";
  return `${r > 0 ? "+" : "−"}${Math.abs(r)} m`;
}

function fmtTemp(n: number) {
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}°`;
}

function presetOn(age: number, target: number) {
  return Math.abs(age - target) <= Math.max(0.004, Math.abs(target) * 0.035);
}

function Spark({ series, age }: { series: SeriesPoint[]; age: number }) {
  if (series.length < 2) return <div className="h-12" />;
  const w = 280;
  const h = 52;
  const pad = 4;
  const t0 = series[0]?.age ?? -540;
  const t1 = series[series.length - 1]?.age ?? 250;
  const gs = series.map((p) => p.gmst);
  const g0 = Math.min(...gs);
  const g1 = Math.max(...gs);
  const x = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (w - pad * 2);
  const y = (g: number) => h - pad - ((g - g0) / (g1 - g0 || 1)) * (h - pad * 2);
  const d = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.age).toFixed(1)} ${y(p.gmst).toFixed(1)}`)
    .join(" ");
  const nx = x(Math.min(t1, Math.max(t0, age)));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full text-accent" role="img" aria-label="Global temperature across the timeline">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1={nx} x2={nx} y1="2" y2={h - 2} stroke="currentColor" strokeOpacity="0.45" />
    </svg>
  );
}

function PlaceButton({
  place,
  active,
  onPick,
}: {
  place: { id: string; name: string; region: string; biomeLabel?: string; temp?: number; color?: string };
  active: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(place.id)}
      aria-pressed={active}
      className={
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left " +
        (active ? "bg-bg shadow-panel" : "hover:bg-bg/70")
      }
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: place.color ?? "var(--color-muted)" }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-fg">{place.name}</span>
        <span className="block truncate text-sm text-muted">
          {place.biomeLabel ?? place.region}
        </span>
      </span>
      {place.temp != null && Number.isFinite(place.temp) ? (
        <span className="shrink-0 text-sm tabular-nums text-muted">{fmtTemp(place.temp)}</span>
      ) : null}
    </button>
  );
}

function Selection({
  place,
  onClose,
}: {
  place: PlaceSnap | null;
  onClose: () => void;
}) {
  const pin = useAtlas((s) => s.pin);
  const ocean = useAtlas((s) => s.ocean);
  const focusId = useAtlas((s) => s.focusId);
  if (!focusId && !pin && !ocean) return null;
  const title = place?.name ?? (pin ? pin.plate : "Open ocean");
  const biome = place?.biomeLabel ?? pin?.biomeLabel ?? "Deep water";
  const color = place?.color ?? pin?.color ?? "var(--color-sea)";
  const temp = place?.temp ?? pin?.temp;
  const precip = place?.precip ?? pin?.precip;
  const elev = place?.elev ?? pin?.elev;
  const lat = place?.paleoLat ?? pin?.paleoLat ?? ocean?.lat;
  const lon = place?.paleoLon ?? pin?.paleoLon ?? ocean?.lon;
  const note = place?.note ?? (pin?.flooded ? "This crust is below sea level." : null);
  const latTxt =
    lat == null ? "" : `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon ?? 0).toFixed(0)}°${(lon ?? 0) >= 0 ? "E" : "W"}`;
  return (
    <article className="rounded-2xl bg-bg p-3 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl leading-tight text-fg">{title}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="size-2 rounded-full" style={{ background: color }} />
            {biome}
            {place ? <span>· {place.plate}</span> : null}
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 px-2 text-sm text-muted">
          Close
        </button>
      </div>
      {temp != null && precip != null && elev != null ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-muted">Temp</dt>
            <dd className="tabular-nums text-fg">{fmtTemp(temp)}C</dd>
          </div>
          <div>
            <dt className="text-muted">Rain</dt>
            <dd className="tabular-nums text-fg">{Math.round(precip)} mm</dd>
          </div>
          <div>
            <dt className="text-muted">Height</dt>
            <dd className="tabular-nums text-fg">{Math.round(elev)} m</dd>
          </div>
        </dl>
      ) : null}
      <p className="mt-2 text-sm tabular-nums text-muted">{latTxt}</p>
      {note ? <p className="mt-2 text-sm text-pretty text-fg">{note}</p> : null}
    </article>
  );
}

export function Hud() {
  const slider = useAtlas((s) => s.slider);
  const age = useAtlas((s) => s.age);
  const mode = useAtlas((s) => s.mode);
  const playing = useAtlas((s) => s.playing);
  const spin = useAtlas((s) => s.spin);
  const focusId = useAtlas((s) => s.focusId);
  const frame = useAtlas((s) => s.frame);
  const series = useAtlas((s) => s.series);
  const error = useAtlas((s) => s.error);
  const menuOpen = useAtlas((s) => s.menuOpen);
  const chapter = chapterFor(age);
  const places: Array<PlaceSnap | (typeof PLACES)[number]> = frame?.places ?? PLACES;
  const focused = frame?.places.find((p) => p.id === focusId) ?? null;

  useEffect(() => {
    try {
      if (localStorage.getItem("eon-menu") === "0") useAtlas.getState().setMenuOpen(false);
    } catch {
      /* ignore */
    }
  }, []);

  function pickPlace(id: string) {
    const st = useAtlas.getState();
    if (st.focusId === id) st.clearSelection();
    else st.selectPlace(id);
    holdSpin(2600);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        id="eon-menu"
        inert={menuOpen ? undefined : true}
        className={"eon-menu absolute inset-0 flex flex-col " + (menuOpen ? "is-open" : "is-closed")}
      >
      <header className="pointer-events-auto flex items-start justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
        <div className="min-w-0 max-w-xl">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-2xl italic leading-none text-fg">Eon</p>
            <p className="truncate text-xs tracking-widest text-muted uppercase">
              {chapter.era} · {chapter.period}
            </p>
          </div>
          <p className="eon-chapter mt-2 line-clamp-2 text-sm text-pretty text-muted md:line-clamp-3">{chapter.text}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl leading-none tabular-nums text-fg md:text-4xl">{formatAgeShort(age)}</p>
          <p className="mt-1 text-sm text-muted">{chapter.stage}</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              aria-pressed={spin}
              onClick={() => {
                const st = useAtlas.getState();
                if (!st.spin) st.clearSelection();
                st.setSpin(!st.spin);
              }}
              className={
                "min-h-11 rounded-full px-3 text-sm " +
                (spin ? "bg-accent text-accent-ink" : "bg-surface text-fg shadow-panel")
              }
            >
              {spin ? "Spinning" : "Spin off"}
            </button>
            <button
              type="button"
              onClick={() => useAtlas.getState().resetView()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface text-fg shadow-panel"
              aria-label="Reset the view"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="pointer-events-auto mt-4 mb-3 ml-4 hidden w-80 flex-col gap-3 overflow-hidden md:flex">
          <Selection place={focused} onClose={() => useAtlas.getState().clearSelection()} />
          <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-2xl bg-surface/90 p-2 shadow-panel">
            <p className="px-3 pt-1 pb-1 text-xs tracking-widest text-muted uppercase">Places</p>
            {places.map((place) => (
              <PlaceButton
                key={place.id}
                place={{
                  id: place.id,
                  name: place.name,
                  region: "region" in place ? place.region : "",
                  biomeLabel: "biomeLabel" in place ? place.biomeLabel : place.region,
                  temp: "temp" in place ? place.temp : undefined,
                  color: "color" in place ? place.color : undefined,
                }}
                active={focusId === place.id}
                onPick={pickPlace}
              />
            ))}
          </div>
        </aside>
      </div>

      <div className="pointer-events-auto px-4 md:hidden">
        <Selection place={focused} onClose={() => useAtlas.getState().clearSelection()} />
        <div className="scroll-thin mt-2 flex gap-2 overflow-x-auto pb-2">
          {places.map((place) => {
            const active = focusId === place.id;
            const color = "color" in place ? place.color : "var(--color-muted)";
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => pickPlace(place.id)}
                aria-pressed={active}
                className={
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm " +
                  (active ? "bg-accent text-accent-ink" : "bg-surface text-fg shadow-panel")
                }
              >
                <span className="size-2 rounded-full" style={{ background: color }} />
                {place.name}
              </button>
            );
          })}
        </div>
      </div>

      <footer className="pointer-events-auto border-t border-line bg-surface/95 px-4 pt-3 pb-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.75rem))] md:bg-surface/88">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Stat label="GMST" value={frame ? `${frame.gmst.toFixed(1)}°C` : "…"} />
              <Stat label="CO₂" value={frame ? `${Math.round(frame.co2)} ppm` : "…"} />
              <Stat label="Sea" value={frame ? fmtSea(frame.sea) : "…"} />
              <Stat label="Sun" value={frame ? `${frame.solar.toFixed(3)}×` : "…"} />
              <Stat label="Land" value={frame ? `${frame.landPct.toFixed(0)}%` : "…"} />
            </div>
            <p className="line-clamp-2 max-w-md text-sm text-pretty text-muted">
              {error ? error : frame ? frame.climateLine : "Solving the zonal energy balance…"}
            </p>
          </div>

          {frame && frame.shares.some((n) => n > 0) ? (
            <div>
              <div className="flex h-2 overflow-hidden rounded-full bg-bg">
                {BIOME_ORDER.map((id, i) =>
                  id === "shallow" || (frame.shares[i] ?? 0) < 0.008 ? null : (
                    <div
                      key={id}
                      title={`${BIOME_META[id].label} ${Math.round((frame.shares[i] ?? 0) * 100)}%`}
                      style={{ width: `${(frame.shares[i] ?? 0) * 100}%`, background: BIOME_META[id].color }}
                    />
                  ),
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted">
                {BIOME_ORDER.map((id, i) => ({ id, v: frame.shares[i] ?? 0 }))
                  .filter((b) => b.id !== "shallow" && b.v > 0.04)
                  .sort((a, b) => b.v - a.v)
                  .slice(0, 4)
                  .map((b) => `${BIOME_META[b.id].label} ${Math.round(b.v * 100)}%`)
                  .join("  ·  ")}
                {frame.ranges.length
                  ? `  ·  ${frame.ranges
                      .slice(0, 2)
                      .map((r) => `${r.name.split("–")[0]} ${Math.round(r.meters / 100) / 10} km`)
                      .join(" · ")}`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const st = useAtlas.getState();
                if (!st.playing && st.slider >= 999) st.setSlider(0);
                st.setPlaying(!st.playing);
              }}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink"
              aria-label={playing ? "Pause time" : "Play through time"}
            >
              {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>−540 Ma</span>
                <span className="tabular-nums">{formatAge(age)}</span>
                <span>+250 Ma</span>
              </div>
              <input
                className="time-slider w-full"
                type="range"
                min={0}
                max={1000}
                step={1}
                value={Math.round(slider)}
                aria-label="Geological time"
                aria-valuetext={formatAge(age)}
                onPointerDown={() => {
                  useAtlas.getState().setPlaying(false);
                  useAtlas.getState().setScrubbing(true);
                  holdSpin(20000);
                }}
                onPointerUp={() => {
                  useAtlas.getState().setScrubbing(false);
                  holdSpin(1400);
                }}
                onPointerCancel={() => useAtlas.getState().setScrubbing(false)}
                onChange={(ev) => useAtlas.getState().setSlider(Number(ev.target.value))}
              />
            </div>
          </div>

          <div className="eon-presets scroll-thin flex gap-2 overflow-x-auto">
            {PRESETS.map((preset) => {
              const on = presetOn(age, preset.age);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    useAtlas.getState().setPlaying(false);
                    useAtlas.getState().setSlider(ageToSlider(preset.age));
                    holdSpin(1200);
                  }}
                  aria-pressed={on}
                  className={
                    "min-h-11 shrink-0 rounded-full px-3 text-sm " +
                    (on ? "bg-accent text-accent-ink" : "text-muted")
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-full bg-bg p-1 shadow-panel" role="group" aria-label="Map style">
              {(
                [
                  ["biomes", "Biomes"],
                  ["relief", "Relief"],
                  ["plates", "Plates"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  onClick={() => useAtlas.getState().setMode(id)}
                  className={
                    "min-h-11 rounded-full px-3 text-sm " +
                    (mode === id ? "bg-surface text-fg" : "text-muted")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hidden w-56 md:block">
              <Spark series={series} age={age} />
            </div>
            <details className="text-sm text-muted">
              <summary className="min-h-11 cursor-pointer list-none py-2">How it is calculated</summary>
              <p className="max-w-md pb-2 text-pretty">
                Plates are rigid rotations anchored to published paleolatitudes. The future follows Scotese’s Pangea Proxima, not Arctic Amasia. Sea level is a Haq–Miller composite. Ranges rise on a smoothstep and erode exponentially. Climate is a Budyko–Sellers energy-balance model with Myhre CO₂ forcing, a Gough faint sun, and ice–albedo feedback. Biomes are a Whittaker diagram plus rain shadows. It all runs on this device.
              </p>
            </details>
            <InstallControl />
          </div>
        </div>
      </footer>
      </div>
      <MenuGrip open={menuOpen} />
    </div>
  );
}

function MenuGrip({ open }: { open: boolean }) {
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  return (
    <button
      type="button"
      className="eon-grip pointer-events-auto absolute left-1/2 z-30 flex min-h-11 min-w-16 -translate-x-1/2 items-center justify-center rounded-full bg-surface px-5 text-fg shadow-panel"
      aria-expanded={open}
      aria-controls="eon-menu"
      aria-label={open ? "Drop the menu" : "Bring up the menu"}
      onPointerDown={(event) => {
        drag.current = { y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start) return;
        if (Math.abs(event.clientY - start.y) > 12) start.moved = true;
      }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        if (!start?.moved) return;
        const dy = event.clientY - start.y;
        suppressClick.current = true;
        if (dy <= -28) useAtlas.getState().setMenuOpen(true);
        else if (dy >= 28) useAtlas.getState().setMenuOpen(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        useAtlas.getState().setMenuOpen(!useAtlas.getState().menuOpen);
      }}
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="size-1.5 rounded-full bg-accent" />
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <p className="tabular-nums">
      <span className="text-muted">{label} </span>
      <span className="text-fg">{value}</span>
    </p>
  );
}
