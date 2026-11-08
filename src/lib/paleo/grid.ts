import raw from "./land-grid.json";
import { latLonToVec } from "./plates";

type RawGrid = { step: number; cells: number[][] };

const data = raw as RawGrid;

export type EarthGrid = {
  count: number;
  step: number;
  plate: Uint8Array;
  interior: Float32Array;
  elev: Int16Array;
  orogen: Uint8Array;
  odist: Float32Array;
  bear: Uint8Array;
  oeast: Uint8Array;
  lat: Float32Array;
  lon: Float32Array;
  cx: Float32Array;
  cy: Float32Array;
  cz: Float32Array;
  /** 4 corners × xyz, present-day unit vectors. */
  corners: Float32Array;
};

let cached: EarthGrid | null = null;

export function getGrid(): EarthGrid {
  if (cached) return cached;
  const cells = data.cells;
  const n = cells.length;
  const step = data.step;
  const g: EarthGrid = {
    count: n,
    step,
    plate: new Uint8Array(n),
    interior: new Float32Array(n),
    elev: new Int16Array(n),
    orogen: new Uint8Array(n),
    odist: new Float32Array(n),
    bear: new Uint8Array(n),
    oeast: new Uint8Array(n),
    lat: new Float32Array(n),
    lon: new Float32Array(n),
    cx: new Float32Array(n),
    cy: new Float32Array(n),
    cz: new Float32Array(n),
    corners: new Float32Array(n * 12),
  };
  const half = step / 2;
  for (let k = 0; k < n; k++) {
    const [i, j, plate, interior, elev, orogen, odist, bear, oeast] = cells[k];
    const lon = -180 + (i + 0.5) * step;
    const lat = -90 + (j + 0.5) * step;
    g.plate[k] = plate;
    g.interior[k] = interior / 255;
    g.elev[k] = elev;
    g.orogen[k] = orogen;
    g.odist[k] = odist / 255;
    g.bear[k] = bear;
    g.oeast[k] = oeast;
    g.lat[k] = lat;
    g.lon[k] = lon;
    const c = latLonToVec(lat, lon);
    g.cx[k] = c[0];
    g.cy[k] = c[1];
    g.cz[k] = c[2];
    const corners: [number, number][] = [
      [lat - half, lon - half],
      [lat - half, lon + half],
      [lat + half, lon + half],
      [lat + half, lon - half],
    ];
    for (let t = 0; t < 4; t++) {
      const v = latLonToVec(corners[t][0], corners[t][1]);
      const o = k * 12 + t * 3;
      g.corners[o] = v[0];
      g.corners[o + 1] = v[1];
      g.corners[o + 2] = v[2];
    }
  }
  cached = g;
  return g;
}
