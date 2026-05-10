// ── API KEYS ──────────────────────────────────────────────────────────────────
// Keys stored locally only — never committed to GitHub (see .gitignore)
// Phase 3: These move to Railway backend — app will call your server instead
export const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || "";
export const GOOGLE_VISION_KEY = process.env.GOOGLE_VISION_KEY || "";

// ── API ENDPOINTS ─────────────────────────────────────────────────────────────
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const GOOGLE_VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`;
export const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

// ── MODEL CONFIG ──────────────────────────────────────────────────────────────
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
export const CLAUDE_MAX_TOKENS = 4096;

// ── FREEMIUM LIMITS ───────────────────────────────────────────────────────────
export const FREE_SCANS_PER_DAY = 9999;
export const FREE_FOLLOWUPS_PER_SCAN = 3;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
export const COLORS = {
  bg:           "#0F0D0B",
  surface:      "#171410",
  surfaceAlt:   "#1A1714",
  accent:       "#E8C547",
  accentDim:    "rgba(232,197,71,0.15)",
  accentBorder: "rgba(232,197,71,0.3)",
  white:        "#FFFFFF",
  textPrimary:  "rgba(255,255,255,0.9)",
  textSecondary:"rgba(255,255,255,0.55)",
  textMuted:    "rgba(255,255,255,0.3)",
  border:       "rgba(255,255,255,0.08)",
  green:        "#6FCF97",
  greenDim:     "rgba(111,207,151,0.15)",
  red:          "#EB5757",
  redDim:       "rgba(235,87,87,0.12)",
  blue:         "#56CCF2",
  blueDim:      "rgba(86,204,242,0.15)",
};

export const FONTS = {
  serif: "Georgia",
  mono:  "Courier New",
  sans:  "System",
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
};

// ── LANDMARK DATABASE ─────────────────────────────────────────────────────────
export const LANDMARKS = [
  { name: "Great Pyramid of Giza",         lat: 29.9792,  lng:  31.1342,  r: 0.8 },
  { name: "Eiffel Tower",                  lat: 48.8584,  lng:   2.2945,  r: 0.4 },
  { name: "Statue of Liberty",             lat: 40.6892,  lng: -74.0445,  r: 0.3 },
  { name: "Gateway Arch",                  lat: 38.6247,  lng: -90.1848,  r: 0.4 },
  { name: "Taj Mahal",                     lat: 27.1751,  lng:  78.0421,  r: 0.5 },
  { name: "Colosseum",                     lat: 41.8902,  lng:  12.4922,  r: 0.3 },
  { name: "Machu Picchu",                  lat: -13.1631, lng: -72.5450,  r: 0.8 },
  { name: "Chichen Itza",                  lat: 20.6843,  lng: -88.5678,  r: 0.6 },
  { name: "Christ the Redeemer",           lat: -22.9519, lng: -43.2105,  r: 0.4 },
  { name: "Great Wall of China",           lat: 40.4319,  lng: 116.5704,  r: 2.0 },
  { name: "Stonehenge",                    lat: 51.1789,  lng:  -1.8262,  r: 0.4 },
  { name: "Acropolis of Athens",           lat: 37.9715,  lng:  23.7267,  r: 0.4 },
  { name: "Angkor Wat",                    lat: 13.4125,  lng: 103.8670,  r: 1.0 },
  { name: "Sydney Opera House",            lat: -33.8568, lng: 151.2153,  r: 0.3 },
  { name: "Big Ben",                       lat: 51.5007,  lng:  -0.1246,  r: 0.2 },
  { name: "Sagrada Familia",               lat: 41.4036,  lng:   2.1744,  r: 0.3 },
  { name: "Notre-Dame Cathedral",          lat: 48.8530,  lng:   2.3499,  r: 0.3 },
  { name: "Louvre Museum",                 lat: 48.8606,  lng:   2.3376,  r: 0.3 },
  { name: "Buckingham Palace",             lat: 51.5014,  lng:  -0.1419,  r: 0.3 },
  { name: "Tower of London",               lat: 51.5081,  lng:  -0.0759,  r: 0.2 },
  { name: "Vatican Museums",               lat: 41.9065,  lng:  12.4536,  r: 0.3 },
  { name: "Trevi Fountain",                lat: 41.9009,  lng:  12.4833,  r: 0.2 },
  { name: "Pantheon Rome",                 lat: 41.8986,  lng:  12.4769,  r: 0.2 },
  { name: "Leaning Tower of Pisa",         lat: 43.7230,  lng:  10.3966,  r: 0.3 },
  { name: "Alhambra",                      lat: 37.1760,  lng:  -3.5881,  r: 0.5 },
  { name: "Hagia Sophia",                  lat: 41.0086,  lng:  28.9802,  r: 0.3 },
  { name: "Blue Mosque",                   lat: 41.0054,  lng:  28.9768,  r: 0.2 },
  { name: "Petra",                         lat: 30.3285,  lng:  35.4444,  r: 1.5 },
  { name: "Burj Khalifa",                  lat: 25.1972,  lng:  55.2744,  r: 0.3 },
  { name: "Empire State Building",         lat: 40.7484,  lng: -73.9857,  r: 0.2 },
  { name: "One World Trade Center",        lat: 40.7127,  lng: -74.0134,  r: 0.2 },
  { name: "Golden Gate Bridge",            lat: 37.8199,  lng: -122.4783, r: 0.5 },
  { name: "Hollywood Sign",                lat: 34.1341,  lng: -118.3215, r: 0.5 },
  { name: "Space Needle",                  lat: 47.6205,  lng: -122.3493, r: 0.3 },
  { name: "Mount Rushmore",                lat: 43.8791,  lng: -103.4591, r: 0.8 },
  { name: "Niagara Falls",                 lat: 43.0962,  lng: -79.0377,  r: 1.0 },
  { name: "Grand Canyon South Rim",        lat: 36.0544,  lng: -112.1401, r: 2.0 },
  { name: "Hoover Dam",                    lat: 36.0160,  lng: -114.7377, r: 0.4 },
  { name: "Lincoln Memorial",              lat: 38.8893,  lng: -77.0502,  r: 0.3 },
  { name: "Washington Monument",           lat: 38.8895,  lng: -77.0353,  r: 0.2 },
  { name: "US Capitol Building",           lat: 38.8899,  lng: -77.0091,  r: 0.3 },
  { name: "White House",                   lat: 38.8977,  lng: -77.0366,  r: 0.2 },
  { name: "CN Tower",                      lat: 43.6426,  lng: -79.3871,  r: 0.3 },
  { name: "Forbidden City Beijing",        lat: 39.9163,  lng: 116.3972,  r: 0.8 },
  { name: "Tiananmen Square",              lat: 39.9055,  lng: 116.3976,  r: 0.5 },
  { name: "Mount Fuji",                    lat: 35.3606,  lng: 138.7274,  r: 5.0 },
  { name: "Fushimi Inari Shrine",          lat: 34.9671,  lng: 135.7727,  r: 0.5 },
  { name: "Senso-ji Temple Tokyo",         lat: 35.7148,  lng: 139.7967,  r: 0.3 },
  { name: "Tokyo Tower",                   lat: 35.6586,  lng: 139.7454,  r: 0.3 },
  { name: "Shibuya Crossing",              lat: 35.6595,  lng: 139.7004,  r: 0.2 },
  { name: "Marina Bay Sands",              lat:  1.2838,  lng: 103.8607,  r: 0.3 },
  { name: "Petronas Towers",               lat:  3.1579,  lng: 101.7116,  r: 0.3 },
  { name: "Sydney Harbour Bridge",         lat: -33.8523, lng: 151.2108,  r: 0.4 },
  { name: "Table Mountain Cape Town",      lat: -33.9628, lng:  18.4098,  r: 1.5 },
  { name: "Victoria Falls",                lat: -17.9243, lng:  25.8572,  r: 1.5 },
  { name: "Uluru Ayers Rock",              lat: -25.3444, lng: 131.0369,  r: 2.0 },
  { name: "Iguazu Falls Argentina",        lat: -25.6953, lng: -54.4367,  r: 1.5 },
  { name: "Easter Island Moai",            lat: -27.1127, lng: -109.3497, r: 5.0 },
  { name: "Red Square Moscow",             lat: 55.7539,  lng:  37.6208,  r: 0.4 },
  { name: "Saint Basils Cathedral",        lat: 55.7525,  lng:  37.6231,  r: 0.2 },
  { name: "Neuschwanstein Castle",         lat: 47.5576,  lng:  10.7498,  r: 0.5 },
  { name: "Brandenburg Gate",              lat: 52.5163,  lng:  13.3777,  r: 0.2 },
  { name: "Cologne Cathedral",             lat: 50.9413,  lng:   6.9583,  r: 0.3 },
  { name: "Prague Castle",                 lat: 50.0904,  lng:  14.4001,  r: 0.6 },
  { name: "Schonbrunn Palace",             lat: 48.1845,  lng:  16.3122,  r: 0.6 },
  { name: "Santorini Oia",                 lat: 36.4618,  lng:  25.3753,  r: 1.0 },
  { name: "Dubrovnik Old Town",            lat: 42.6507,  lng:  18.0944,  r: 0.8 },
  { name: "Angkor Thom",                   lat: 13.4412,  lng: 103.8590,  r: 1.0 },
  { name: "Borobudur Temple",              lat: -7.6079,  lng: 110.2038,  r: 0.8 },
  { name: "Bali Tanah Lot Temple",         lat: -8.6215,  lng: 115.0866,  r: 0.4 },
  { name: "Gyeongbokgung Palace Seoul",    lat: 37.5796,  lng: 126.9770,  r: 0.6 },
  { name: "Terracotta Army Xian",          lat: 34.3847,  lng: 109.2733,  r: 1.0 },
  { name: "Kilimanjaro",                   lat: -3.0674,  lng:  37.3556,  r: 5.0 },
  { name: "Birmingham Statue of Liberty",  lat: 33.5186,  lng: -86.8104,  r: 0.3 },
  { name: "Las Vegas Eiffel Tower",        lat: 36.1126,  lng: -115.1720, r: 0.3 },
  { name: "Navy Pier Chicago",             lat: 41.8919,  lng: -87.6051,  r: 0.4 },
  { name: "Millennium Park Chicago",       lat: 41.8827,  lng: -87.6233,  r: 0.4 },
  { name: "French Quarter New Orleans",    lat: 29.9584,  lng: -90.0644,  r: 0.8 },
  { name: "Alamo San Antonio",             lat: 29.4260,  lng: -98.4861,  r: 0.2 },
  { name: "Graceland Memphis",             lat: 35.0456,  lng: -90.0230,  r: 0.3 },
  { name: "Freedom Trail Boston",          lat: 42.3601,  lng: -71.0589,  r: 1.0 },
  { name: "Fenway Park Boston",            lat: 42.3467,  lng: -71.0972,  r: 0.3 },
  { name: "Pike Place Market Seattle",     lat: 47.6097,  lng: -122.3422, r: 0.3 },
  { name: "Walt Disney World",             lat: 28.4177,  lng: -81.5812,  r: 0.8 },
  { name: "Kennedy Space Center",          lat: 28.5728,  lng: -80.6490,  r: 1.5 },
];

// ── SUBJECT CATEGORY MAP ──────────────────────────────────────────────────────
export const CATEGORY_ICONS = {
  Spider:       "🕷️",
  Insect:       "🦋",
  Bird:         "🐦",
  Mammal:       "🦁",
  Reptile:      "🦎",
  Mushroom:     "🍄",
  Plant:        "🌿",
  Flower:       "🌸",
  Tree:         "🌳",
  Landmark:     "🏛️",
  Architecture: "🏗️",
  Artwork:      "🎨",
  Food:         "🍽️",
  Animal:       "🦁",
  Object:       "📦",
  Other:        "📍",
};

// ── SEASON HELPER ─────────────────────────────────────────────────────────────
export const getCurrentSeason = () => {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "Spring";
  if (m >= 5 && m <= 7) return "Summer";
  if (m >= 8 && m <= 10) return "Autumn";
  return "Winter";
};
