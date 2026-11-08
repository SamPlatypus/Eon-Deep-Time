import { create } from "zustand";
import { ageToSlider, sliderToAge } from "@/lib/paleo/science";
import type { Mode, PinSnap } from "@/lib/paleo/types";
import type { FramePayload, SeriesPoint } from "@/lib/globe/protocol";

type OceanPick = { lat: number; lon: number };

type AtlasState = {
  slider: number;
  age: number;
  mode: Mode;
  playing: boolean;
  spin: boolean;
  scrubbing: boolean;
  focusId: string | null;
  pinCell: number | null;
  pin: PinSnap | null;
  ocean: OceanPick | null;
  glance: OceanPick | null;
  frame: FramePayload | null;
  series: SeriesPoint[];
  error: string | null;
  viewNonce: number;
  menuOpen: boolean;
  setSlider: (slider: number) => void;
  setMode: (mode: Mode) => void;
  setPlaying: (playing: boolean) => void;
  setSpin: (spin: boolean) => void;
  setScrubbing: (scrubbing: boolean) => void;
  selectPlace: (id: string) => void;
  selectPin: (cell: number, pin: PinSnap) => void;
  selectOcean: (lat: number, lon: number) => void;
  glanceAt: (lat: number, lon: number) => void;
  clearSelection: () => void;
  applyFrame: (frame: FramePayload) => void;
  pushSeries: (point: SeriesPoint) => void;
  setError: (error: string | null) => void;
  resetView: () => void;
  setMenuOpen: (open: boolean) => void;
};

let quietUntil = 0;

export function holdSpin(ms: number) {
  quietUntil = performance.now() + ms;
}

export function spinHeld() {
  return performance.now() < quietUntil;
}

export const useAtlas = create<AtlasState>((set, get) => ({
  slider: ageToSlider(0),
  age: 0,
  mode: "biomes",
  playing: false,
  spin: true,
  scrubbing: false,
  focusId: null,
  pinCell: null,
  pin: null,
  ocean: null,
  glance: null,
  frame: null,
  series: [],
  error: null,
  viewNonce: 0,
  menuOpen: true,
  setSlider: (slider) => {
    const clamped = Math.min(1000, Math.max(0, slider));
    set({ slider: clamped, age: sliderToAge(clamped) });
  },
  setMode: (mode) => set({ mode }),
  setPlaying: (playing) => set({ playing }),
  setSpin: (spin) => set({ spin }),
  setScrubbing: (scrubbing) => set({ scrubbing }),
  selectPlace: (id) =>
    set({ focusId: id, pinCell: null, pin: null, ocean: null, glance: null }),
  selectPin: (cell, pin) =>
    set({ focusId: null, pinCell: cell, pin, ocean: null, glance: null }),
  selectOcean: (lat, lon) =>
    set({ focusId: null, pinCell: null, pin: null, ocean: { lat, lon }, glance: null }),
  glanceAt: (lat, lon) =>
    set({ focusId: null, pinCell: null, pin: null, ocean: null, glance: { lat, lon } }),
  clearSelection: () =>
    set({ focusId: null, pinCell: null, pin: null, ocean: null, glance: null }),
  applyFrame: (frame) => {
    const pinCell = get().pinCell;
    set({
      frame,
      error: null,
      pin: pinCell != null && frame.pinCell === pinCell && frame.pin ? frame.pin : get().pin,
    });
  },
  pushSeries: (point) =>
    set((state) => {
      const series = state.series.filter((p) => Math.abs(p.age - point.age) > 1e-4);
      series.push(point);
      series.sort((a, b) => a.age - b.age);
      return { series };
    }),
  setError: (error) => set({ error }),
  resetView: () =>
    set((state) => ({
      viewNonce: state.viewNonce + 1,
      focusId: null,
      pinCell: null,
      pin: null,
      ocean: null,
      glance: null,
      spin: true,
    })),
  setMenuOpen: (menuOpen) => {
    set({ menuOpen });
    try {
      localStorage.setItem("eon-menu", menuOpen ? "1" : "0");
    } catch {
      /* private mode */
    }
  },
}));
