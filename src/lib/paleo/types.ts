export type Mode = "biomes" | "relief" | "plates";

export type BiomeId =
  | "ice"
  | "tundra"
  | "boreal"
  | "tempForest"
  | "rainforest"
  | "savanna"
  | "grass"
  | "desert"
  | "alpine"
  | "shrub"
  | "shallow";

export type PlaceSnap = {
  id: string;
  name: string;
  region: string;
  biome: BiomeId;
  biomeLabel: string;
  color: string;
  paleoLat: number;
  paleoLon: number;
  temp: number;
  precip: number;
  elev: number;
  note: string;
  plate: string;
};

export type PinSnap = {
  paleoLat: number;
  paleoLon: number;
  biome: BiomeId;
  biomeLabel: string;
  color: string;
  temp: number;
  precip: number;
  elev: number;
  plate: string;
  flooded: boolean;
};

export type SeriesPoint = { t: number; gmst: number; sea: number };

export type Snap = {
  age: number;
  playing: boolean;
  mode: Mode;
  co2: number;
  solar: number;
  forcing: number;
  sea: number;
  gmst: number;
  eqTemp: number;
  poleN: number;
  poleS: number;
  iceN: number;
  iceS: number;
  landPct: number;
  era: string;
  period: string;
  stage: string;
  chapter: string;
  climateLine: string;
  places: PlaceSnap[];
  focusId: string | null;
  pin: PinSnap | null;
  series: SeriesPoint[] | null;
  slider: number;
};
