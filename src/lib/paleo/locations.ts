import type { BiomeId } from "./types";

export type Place = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  plate: number;
  line: string;
};

export const PLACES: Place[] = [
  {
    id: "manaus",
    name: "Manaus",
    region: "Amazon",
    lat: -3.1,
    lon: -60,
    plate: 2,
    line: "Equatorial rainforest — unless the latitude or the rains move.",
  },
  {
    id: "sahara",
    name: "Central Sahara",
    region: "Africa",
    lat: 24.5,
    lon: 2.5,
    plate: 3,
    line: "Subtropical desert today. A shallow seaway crossed this crust in the mid-Cretaceous.",
  },
  {
    id: "everest",
    name: "Everest",
    region: "Himalaya",
    lat: 28,
    lon: 86.9,
    plate: 6,
    line: "Seafloor of the Tethys until India met Asia.",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    region: "India",
    lat: 19.1,
    lon: 72.9,
    plate: 7,
    line: "Rode the fastest continental journey of the Phanerozoic.",
  },
  {
    id: "london",
    name: "London",
    region: "Europe",
    lat: 51.5,
    lon: -0.12,
    plate: 4,
    line: "Coal measures formed when this crust sat near the equator.",
  },
  {
    id: "newyork",
    name: "New York",
    region: "North America",
    lat: 40.71,
    lon: -74,
    plate: 0,
    line: "The Atlantic margin here did not exist in the Triassic.",
  },
  {
    id: "capetown",
    name: "Cape Town",
    region: "Africa",
    lat: -33.9,
    lon: 18.4,
    plate: 3,
    line: "Under ice when Gondwana covered the south pole.",
  },
  {
    id: "sydney",
    name: "Sydney",
    region: "Australia",
    lat: -33.87,
    lon: 151.2,
    plate: 9,
    line: "Leaves Antarctica behind and heads for Asia.",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    region: "Asia",
    lat: 35.68,
    lon: 139.69,
    plate: 6,
    line: "A Pacific margin of Eurasia.",
  },
  {
    id: "mcmurdo",
    name: "McMurdo",
    region: "Antarctica",
    lat: -77.84,
    lon: 166.67,
    plate: 10,
    line: "Ice now. Coastal Antarctica grew forests in the Cretaceous.",
  },
  {
    id: "nuuk",
    name: "Nuuk",
    region: "Greenland",
    lat: 64.18,
    lon: -51.7,
    plate: 1,
    line: "The ice sheet is young. The rock under it is not.",
  },
  {
    id: "lima",
    name: "Lima",
    region: "Andes",
    lat: -12.05,
    lon: -77.04,
    plate: 2,
    line: "Desert in the lee of the rising Andes and a cold coastal current.",
  },
  {
    id: "cairo",
    name: "Cairo",
    region: "North Africa",
    lat: 30.04,
    lon: 31.24,
    plate: 3,
    line: "A Tethys shoreline in the deep Mesozoic, a desert after.",
  },
  {
    id: "yellowstone",
    name: "Yellowstone",
    region: "Cordillera",
    lat: 44.4,
    lon: -110.6,
    plate: 0,
    line: "High country since the Laramide orogeny.",
  },
];

export function placeNote(
  place: Place,
  age: number,
  paleoLat: number,
  biome: BiomeId,
  biomeLabel: string,
): string {
  const latTxt = `${Math.abs(paleoLat).toFixed(0)}°${paleoLat >= 0 ? "N" : "S"}`;
  if (place.id === "everest") {
    if (age < -55) return `Still Tethys crust at ${latTxt}. The Himalaya have not started.`;
    if (age < -15) return `India is colliding. The range is climbing through ${biomeLabel.toLowerCase()} elevations.`;
    if (age > 40) return "Convergence has slowed in this scenario and erosion is lowering the plateau.";
  }
  if (place.id === "mumbai") {
    if (age < -120) return `Still with Madagascar and Africa, near ${latTxt}.`;
    if (age < -40) return `An island continent crossing ${latTxt} on the way to Asia.`;
    if (age > -40 && age < 0) return "The collision is underway. The monsoon strengthens as Tibet rises.";
  }
  if (place.id === "sahara" && age < -90 && age > -120) {
    return "High Cretaceous seas push a shallow seaway across this low crust.";
  }
  if (place.id === "mcmurdo" && age < -40 && age > -110) {
    return "Greenhouse paleolatitude. Coasts can carry forest while the plateau stays frozen.";
  }
  if (place.id === "london" && age < -280 && age > -340) {
    return "Near the equator, in the coal-swamp belt of assembling Pangea.";
  }
  if (place.id === "newyork" && age < -180 && age > -250) {
    return "Pressed against northwest Africa. There is no Atlantic yet.";
  }
  return `${place.line} Now at ${latTxt}, ${biomeLabel.toLowerCase()}.`;
}
