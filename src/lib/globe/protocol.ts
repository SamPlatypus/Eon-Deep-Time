import type { PinSnap, PlaceSnap } from "@/lib/paleo/types";

export type RangeSnap = { name: string; meters: number };

export type FramePayload = {
  age: number;
  co2: number;
  solar: number;
  forcing: number;
  sea: number;
  landPct: number;
  gmst: number;
  eqTemp: number;
  poleN: number;
  poleS: number;
  iceN: number;
  iceS: number;
  thermalEq: number;
  grad: number;
  era: string;
  period: string;
  stage: string;
  chapter: string;
  climateLine: string;
  places: PlaceSnap[];
  shares: number[];
  ranges: RangeSnap[];
  pin: PinSnap | null;
  pinCell: number | null;
};

export type SeriesPoint = { age: number; gmst: number; sea: number };
