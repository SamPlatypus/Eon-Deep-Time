import { getGrid } from "@/lib/paleo/grid";
import {
  computeFrame,
  landBiomeShares,
  pickCell,
  pinAt,
  placeSnapshots,
  summary,
  type Frame,
} from "@/lib/paleo/frame";
import { OROGENS, sliderToAge } from "@/lib/paleo/science";
import type { FramePayload } from "@/lib/globe/protocol";

type InMsg =
  | { type: "boot" }
  | { type: "age"; id: number; age: number; pinCell: number | null }
  | { type: "pick"; id: number; age: number; lat: number; lon: number }
  | { type: "series"; slider: number };

const scope = self as unknown as {
  onmessage: ((ev: MessageEvent<InMsg>) => void) | null;
  postMessage: (data: unknown, transfer?: Transferable[]) => void;
};

let lastFrame: Frame | null = null;

function frameAt(age: number): Frame {
  if (lastFrame && Math.abs(lastFrame.age - age) < 1e-6) return lastFrame;
  lastFrame = computeFrame(age);
  return lastFrame;
}

function pack(frame: Frame, id: number, pinCell: number | null): { msg: unknown; transfer: Transferable[] } {
  const sum = summary(frame);
  const places = placeSnapshots(frame);
  const shares = landBiomeShares(frame);
  const ranges = OROGENS.map((o) => ({ name: o.name, meters: frame.orogenH[o.id] ?? 0 }))
    .filter((r) => r.meters > 500)
    .sort((a, b) => b.meters - a.meters);
  const pin = pinCell != null && pinCell >= 0 ? pinAt(frame, pinCell) : null;
  const payload: FramePayload = {
    age: frame.age,
    co2: frame.co2,
    solar: frame.solar,
    forcing: frame.forcing,
    sea: frame.sea,
    landPct: frame.landPct,
    gmst: sum.gmst,
    eqTemp: sum.eqTemp,
    poleN: sum.poleN,
    poleS: sum.poleS,
    iceN: sum.iceN,
    iceS: sum.iceS,
    thermalEq: frame.ebm.thermalEq,
    grad: frame.ebm.grad,
    era: sum.era,
    period: sum.period,
    stage: sum.stage,
    chapter: sum.chapter,
    climateLine: sum.climateLine,
    places,
    shares,
    ranges,
    pin,
    pinCell,
  };
  const qs = new Float32Array(48);
  for (let i = 0; i < 12; i++) {
    const q = frame.qs[i];
    qs[i * 4] = q[0];
    qs[i * 4 + 1] = q[1];
    qs[i * 4 + 2] = q[2];
    qs[i * 4 + 3] = q[3];
  }
  const temp = new Float32Array(frame.ebm.temp);
  const orogen = new Float32Array(frame.orogenH);
  return {
    msg: { type: "frame", id, payload, qs, temp, orogen },
    transfer: [qs.buffer, temp.buffer, orogen.buffer],
  };
}

function buildMesh() {
  const g = getGrid();
  const n = g.count;
  const pos = new Float32Array(n * 12);
  const center = new Float32Array(n * 12);
  const plate = new Float32Array(n * 4);
  const elev = new Float32Array(n * 4);
  const orogen = new Float32Array(n * 4);
  const odist = new Float32Array(n * 4);
  const interior = new Float32Array(n * 4);
  const bear = new Float32Array(n * 4);
  const oeast = new Float32Array(n * 4);
  const lat = new Float32Array(n * 4);
  const lon = new Float32Array(n * 4);
  const index = new Uint32Array(n * 6);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < 4; t++) {
      const o = k * 12 + t * 3;
      pos[o] = g.corners[o];
      pos[o + 1] = g.corners[o + 1];
      pos[o + 2] = g.corners[o + 2];
      center[o] = g.cx[k];
      center[o + 1] = g.cy[k];
      center[o + 2] = g.cz[k];
      const vi = k * 4 + t;
      plate[vi] = g.plate[k];
      elev[vi] = g.elev[k];
      orogen[vi] = g.orogen[k];
      odist[vi] = g.odist[k];
      interior[vi] = g.interior[k];
      bear[vi] = g.bear[k];
      oeast[vi] = g.oeast[k];
      lat[vi] = g.lat[k];
      lon[vi] = g.lon[k];
    }
    const v0 = k * 4;
    const ib = k * 6;
    index[ib] = v0;
    index[ib + 1] = v0 + 1;
    index[ib + 2] = v0 + 2;
    index[ib + 3] = v0;
    index[ib + 4] = v0 + 2;
    index[ib + 5] = v0 + 3;
  }
  const buffers = { pos, center, plate, elev, orogen, odist, interior, bear, oeast, lat, lon, index };
  scope.postMessage(
    { type: "mesh", count: n, ...buffers },
    [
      pos.buffer,
      center.buffer,
      plate.buffer,
      elev.buffer,
      orogen.buffer,
      odist.buffer,
      interior.buffer,
      bear.buffer,
      oeast.buffer,
      lat.buffer,
      lon.buffer,
      index.buffer,
    ],
  );
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  scope.postMessage({ type: "error", message });
}

let booted = false;

scope.onmessage = (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === "boot") {
      if (!booted) {
        booted = true;
        buildMesh();
      }
      return;
    }
    if (msg.type === "age") {
      const frame = frameAt(msg.age);
      const packed = pack(frame, msg.id, msg.pinCell);
      scope.postMessage(packed.msg, packed.transfer);
      return;
    }
    if (msg.type === "pick") {
      const frame = frameAt(msg.age);
      const hit = pickCell(frame, msg.lat, msg.lon);
      if (hit.ang > 3) {
        scope.postMessage({
          type: "pick",
          id: msg.id,
          kind: "ocean",
          lat: msg.lat,
          lon: msg.lon,
          ang: hit.ang,
        });
        return;
      }
      const pin = pinAt(frame, hit.index);
      scope.postMessage({
        type: "pick",
        id: msg.id,
        kind: "land",
        cell: hit.index,
        ang: hit.ang,
        pin,
      });
      return;
    }
    if (msg.type === "series") {
      const age = sliderToAge(msg.slider);
      const frame = computeFrame(age);
      scope.postMessage({
        type: "series",
        age,
        gmst: frame.ebm.gmst,
        sea: frame.sea,
      });
    }
  } catch (err) {
    fail(err);
  }
};
