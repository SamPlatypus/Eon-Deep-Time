export const landVertex = /* glsl */ `
attribute float aPlate;
attribute float aElev;
attribute float aOrogen;
attribute float aOdist;
attribute float aInterior;
attribute float aBear;
attribute float aOeast;
attribute float aLat;
attribute float aLon;
attribute vec3 aCenter;

uniform vec4 uQ[12];
uniform float uTemp[36];
uniform float uOrogen[8];
uniform float uSea;
uniform float uTeq;
uniform float uGrad;
uniform float uMode;
uniform float uCo2;
uniform vec3 uBiome[11];
uniform vec3 uPlateCol[12];
uniform vec3 uRelief[6];

varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;

vec3 rotq(vec4 q, vec3 v) {
  vec3 t = 2.0 * cross(q.xyz, v);
  return v + q.w * t + cross(q.xyz, t);
}

vec3 fromLatLon(float lat, float lon) {
  float p = radians(lat);
  float l = radians(lon);
  float cl = cos(p);
  return vec3(cl * sin(l), sin(p), cl * cos(l));
}

void oceanShift(float lat, float lon, float bearingByte, out float oLat, out float oLon) {
  float brg = (bearingByte / 255.0) * 6.28318530718;
  float delta = 0.05235987756;
  float phi1 = radians(lat);
  float lam1 = radians(lon);
  float phi2 = asin(sin(phi1) * cos(delta) + cos(phi1) * sin(delta) * cos(brg));
  float lam2 = lam1 + atan(sin(brg) * sin(delta) * cos(phi1), cos(delta) - sin(phi1) * sin(phi2));
  oLat = degrees(phi2);
  oLon = degrees(lam2);
}

int classifyB(float T, float P, float elev, float sea) {
  if (elev < sea) return 10;
  float km = max(elev, 0.0) / 1000.0;
  float seaLevelT = T + 6.5 * km;
  if (km > 2.2 && seaLevelT > 0.0 && T < 8.0) return 8;
  if (T < -8.0) return 0;
  if (km > 1.6 && T < 0.0) return 0;
  if (T < 0.0) return P < 160.0 ? 0 : 1;
  if (T < 5.0) return P < 220.0 ? 6 : 2;
  if (T >= 18.0 && P >= 1700.0) return 4;
  if (T < 16.0) {
    if (P < 220.0) return 7;
    if (P < 480.0) return 6;
    return 3;
  }
  if (T < 23.0) {
    if (P < 280.0) return 7;
    if (P < 620.0) return 9;
    if (P < 1500.0) return 5;
    return 3;
  }
  if (P < 280.0) return 7;
  if (P < 780.0) return 5;
  if (P < 1600.0) return 9;
  return 4;
}

vec3 reliefOf(float elev, float sea) {
  if (elev < sea) return uRelief[0];
  float hh = elev - sea;
  if (hh < 150.0) return uRelief[1];
  if (hh < 600.0) return uRelief[2];
  if (hh < 1500.0) return uRelief[3];
  if (hh < 2800.0) return uRelief[4];
  return uRelief[5];
}

void main() {
  int plate = int(aPlate + 0.5);
  vec4 q = uQ[plate];
  float elev = aElev;
  int oid = int(aOrogen + 0.5);
  if (oid > 0) {
    float w = 1.0 - aOdist;
    float s = w * w;
    elev = elev * (1.0 - 0.88 * s) + uOrogen[oid] * s;
  }

  bool hide = false;
  float radius = 1.0;

  vec3 center = rotq(q, aCenter);
  vec3 corner = rotq(q, position);
  float cy = clamp(center.y, -1.0, 1.0);
  float paleoLat = degrees(asin(cy));
  float paleoLon = degrees(atan(center.x, center.z));
  float absLat = abs(paleoLat);

  if (uSea > 45.0 && uCo2 > 560.0 && (plate == 1 || plate == 10)) {
    elev = min(elev, 650.0);
  }
  if (elev < uSea) {
    if (uSea - elev > 240.0) hide = true;
    radius = 0.972;
  } else {
    radius = 1.0 + max(elev, 0.0) / 1000.0 * 0.0085;
  }

  float x = (paleoLat + 87.5) / 5.0;
  float biF = clamp(floor(x), 0.0, 34.0);
  int bi = int(biF);
  float tf = x - biF;
  float Tzon = uTemp[bi] * (1.0 - tf) + uTemp[bi + 1] * tf;
  float km = elev > 0.0 ? elev / 1000.0 : 0.0;
  float T = Tzon - 6.5 * km;
  if (absLat < 14.0) T += 1.15 + aInterior * 0.45;
  else if (absLat < 35.0) T += 3.4 + aInterior * 4.8;
  else if (aInterior < 0.45 && absLat > 45.0 && absLat < 68.0) T += 9.2 * (1.0 - aInterior / 0.45);
  else if (absLat >= 35.0) T -= aInterior * min(6.0, (absLat - 34.0) * 0.18);

  float zx = paleoLat - uTeq;
  float ax = abs(zx);
  float P = 2900.0 * exp(-(zx * zx) / 67.24);
  float sub = exp(-((ax - 26.0) * (ax - 26.0)) / 51.84);
  P *= 1.0 - 0.97 * sub;
  float storm = 0.8 + 0.35 * clamp(uGrad / 48.0, 0.45, 1.3);
  P += 980.0 * storm * exp(-((ax - 48.0) * (ax - 48.0)) / 256.0);
  P += 140.0 * exp(-((ax - 72.0) * (ax - 72.0)) / 144.0);
  P += 45.0;
  P = max(25.0, P);

  float itcz = exp(-((paleoLat - uTeq) * (paleoLat - uTeq)) / 121.0);
  float horse = exp(-((absLat - 25.0) * (absLat - 25.0)) / 81.0);
  float midb = exp(-((absLat - 50.0) * (absLat - 50.0)) / 256.0);
  float dry = aInterior * (0.18 * itcz + 0.96 * horse + 0.42 * midb * (1.0 - itcz));
  P *= 1.0 - 0.82 * min(1.0, dry);

  float oceanEast = 0.0;
  if (aBear > 0.5) {
    float oLat;
    float oLon;
    oceanShift(aLat, aLon, aBear, oLat, oLon);
    vec3 op = rotq(q, fromLatLon(oLat, oLon));
    float olon = degrees(atan(op.x, op.z));
    float d = olon - paleoLon;
    if (d > 180.0) d -= 360.0;
    else if (d < -180.0) d += 360.0;
    oceanEast = sin(radians(d));
  }
  bool west = oceanEast < -0.01;
  bool east = oceanEast > 0.01;
  if (absLat > 20.0 && absLat < 34.0 && !east && !west) P *= 0.5;

  float him = uOrogen[1];
  float orogenMeters = oid > 0 ? uOrogen[oid] : 0.0;
  if (aInterior < 0.5 && abs(oceanEast) > 0.000001) {
    bool monsoon = him > 1800.0 && plate == 7 && west && absLat > 8.0 && absLat < 25.0;
    if (monsoon) {
      float m = clamp((him - 1800.0) / 3200.0, 0.0, 1.0);
      P += 2100.0 * m * exp(-((absLat - 18.0) * (absLat - 18.0)) / 64.0);
    } else if (west && absLat > 6.0 && absLat < 30.0) {
      P *= 0.14;
    } else if (west && absLat >= 30.0 && absLat < 43.0) {
      P = P * 0.7 + 240.0;
    } else if (east && absLat > 12.0 && absLat < 52.0) {
      P *= 1.9;
    } else if (!west && absLat > 33.0 && absLat < 58.0) {
      P *= 1.28;
    }
  }

  bool tall = oid > 0 && aOdist < 0.48 && orogenMeters > 1700.0;
  if (tall) {
    float signv = aOeast > 0.5 ? 1.0 : -1.0;
    vec3 mp = rotq(q, fromLatLon(aLat, aLon + signv * 2.2));
    float mlon = degrees(atan(mp.x, mp.z));
    float dlon = mlon - paleoLon;
    if (dlon > 180.0) dlon -= 360.0;
    else if (dlon < -180.0) dlon += 360.0;
    bool eastSide = dlon > 0.0;
    if (absLat > 32.0) P *= eastSide ? 0.62 : 1.28;
    else if (absLat < 24.0) P *= eastSide ? 0.5 : 1.4;
    if (aOdist < 0.12) P *= 1.12;
  }

  if (him > 2000.0 && oid == 1 && aOdist < 0.4 && absLat > 6.0 && absLat < 32.0) {
    float m = clamp((him - 2000.0) / 3500.0, 0.0, 1.0);
    float belt = exp(-((absLat - 26.0) * (absLat - 26.0)) / 49.0);
    P += 700.0 * m * belt;
  }
  P = clamp(P, 15.0, 5400.0);

  int biome = classifyB(T, P, elev, uSea);
  vec3 col = uBiome[biome];
  if (uMode > 1.5) {
    col = elev < uSea ? uBiome[10] : uPlateCol[plate];
  } else if (uMode > 0.5) {
    col = reliefOf(elev, uSea);
  }
  vColor = col;

  vec3 nrm = normalize(corner);
  if (hide) {
    vNormalW = vec3(0.0, 1.0, 0.0);
    vWorld = vec3(0.0);
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    return;
  }

  vec3 displaced = nrm * radius;
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const landFragment = /* glsl */ `
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(vec3(0.32, 0.74, 0.46));
  float ndl = dot(N, L);
  float wrap = clamp(ndl * 0.42 + 0.7, 0.0, 1.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 col = vColor * (0.62 + 0.55 * wrap);
  col += vColor * vec3(1.08, 0.98, 0.86) * max(ndl, 0.0) * 0.18;
  col += vec3(0.62, 0.8, 0.9) * rim * 0.16;
  gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
}
`;

export const oceanVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const oceanFragment = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(vec3(0.32, 0.74, 0.46));
  float ndl = dot(N, L);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 1.7);
  vec3 col = mix(uDeep, uShallow, 0.22 + fres * 0.78);
  col *= 0.72 + 0.45 * clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
  col += vec3(0.85, 0.92, 0.95) * spec * 0.45;
  col += vec3(0.55, 0.75, 0.85) * fres * 0.18;
  gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
}
`;

export const atmosVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const atmosFragment = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.45);
  float alpha = fres * 0.85;
  vec3 col = vec3(0.42, 0.66, 0.78) * (0.35 + fres);
  gl_FragColor = vec4(linearToOutputTexel(vec4(col, 1.0)).rgb, alpha);
}
`;
