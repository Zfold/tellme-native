import {
  ANTHROPIC_KEY,
  ANTHROPIC_URL,
  GOOGLE_VISION_URL,
  NOMINATIM_URL,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  LANDMARKS,
  getCurrentSeason,
} from "../constants";

// ── IMAGE COMPRESSION ─────────────────────────────────────────────────────────
// React Native uses expo-image-manipulator for compression
// This utility takes a local URI and returns a compressed base64 string
export const compressImage = async (uri) => {
  const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
  try {
    // First pass — resize if over 1920px on longest side
    let result = await manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.85, format: SaveFormat.JPEG, base64: true }
    );
    // Check size — if still over 4MB try lower quality
    const bytes = Math.round((result.base64.length * 3) / 4);
    if (bytes > 4 * 1024 * 1024) {
      result = await manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true }
      );
    }
    console.log("Compressed to:", Math.round((result.base64.length * 3) / 4 / 1024), "KB");
    return { base64: result.base64, uri: result.uri, mime: "image/jpeg" };
  } catch (e) {
    throw new Error(`Image compression failed: ${e.message}`);
  }
};

// ── EXIF GPS EXTRACTION ───────────────────────────────────────────────────────
// In React Native we use expo-image-picker which returns exif data directly
// This extracts GPS coordinates from the exif object provided by expo
export const extractGPSFromExif = (exif) => {
  try {
    if (!exif) return null;
    // expo-image-picker returns GPS data in these fields
    const lat = exif.GPSLatitude;
    const lng = exif.GPSLongitude;
    const latRef = exif.GPSLatitudeRef;
    const lngRef = exif.GPSLongitudeRef;
    if (lat == null || lng == null) return null;
    const finalLat = latRef === "S" ? -Math.abs(lat) : Math.abs(lat);
    const finalLng = lngRef === "W" ? -Math.abs(lng) : Math.abs(lng);
    if (isNaN(finalLat) || isNaN(finalLng)) return null;
    return { lat: finalLat, lng: finalLng };
  } catch {
    return null;
  }
};

// ── REVERSE GEOCODING ─────────────────────────────────────────────────────────
export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?lat=${lat}&lng=${lng}&format=json`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "TellMeApp/1.0",
        },
      }
    );
    const data = await res.json();
    const a = data.address || {};
    const city = a.city || a.town || a.village || a.county;
    const state = a.state;
    const country = a.country;
    const parts = [city, state, country].filter(Boolean);
    return {
      full: parts.join(", "),
      city,
      state,
      country,
      lat,
      lng,
    };
  } catch {
    return null;
  }
};

// ── LANDMARK MATCHING ─────────────────────────────────────────────────────────
// Haversine distance formula for accurate GPS distance in km
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const findNearbyLandmark = (coords) => {
  if (!coords?.lat || !coords?.lng) return null;
  for (const lm of LANDMARKS) {
    const dist = haversineKm(coords.lat, coords.lng, lm.lat, lm.lng);
    if (dist <= lm.r) return { ...lm, distKm: dist };
  }
  return null;
};

// ── GOOGLE VISION API ─────────────────────────────────────────────────────────
export const callGoogleVision = async (base64) => {
  try {
    const res = await fetch(GOOGLE_VISION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [
              { type: "LABEL_DETECTION",    maxResults: 10 },
              { type: "LANDMARK_DETECTION", maxResults: 3  },
              { type: "WEB_DETECTION",      maxResults: 10 },
            ],
            imageContext: {
              webDetectionParams: { includeGeoResults: true },
            },
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn("Vision API error:", data);
      return null;
    }
    return data.responses?.[0] || null;
  } catch (e) {
    console.warn("Vision API failed:", e.message);
    return null;
  }
};

// ── BUILD VISION CONTEXT ──────────────────────────────────────────────────────
export const buildVisionContext = (visionResult) => {
  if (!visionResult) return null;

  const labels      = visionResult.labelAnnotations    || [];
  const landmarks   = visionResult.landmarkAnnotations || [];
  const web         = visionResult.webDetection        || {};
  const webEntities = (web.webEntities || []).filter(e => e.description && e.score > 0.4);
  const bestGuesses = (web.bestGuessLabels || []).map(b => b.label).filter(Boolean);
  const pageMatches = (web.pagesWithMatchingImages || [])
    .slice(0, 3)
    .map(p => p.pageTitle)
    .filter(Boolean);

  const lines = [];

  // Priority 1: Landmark detection
  if (landmarks.length > 0) {
    const lm = landmarks[0];
    const score = Math.round((lm.score || 0) * 100);
    lines.push(`LANDMARK CONFIRMED: ${lm.description} (${score}% confidence)`);
    const loc = lm.locations?.[0]?.latLng;
    if (loc) lines.push(`GPS: ${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`);
    lines.push("This is a confirmed landmark. Write landmark tour guide content.");
    lines.push("\nCONFIDENCE: VERY HIGH — landmark detection is extremely reliable.");
    return lines.join("\n");
  }

  // Priority 2: Web best guess (most like Google Image Search)
  if (bestGuesses.length > 0) {
    lines.push("WEB IDENTIFICATION (Google Image Search equivalent):");
    bestGuesses.forEach(g => lines.push(`  - ${g}`));
    lines.push("Treat the web identification as your PRIMARY identification source.");
  }

  // Priority 3: Web entities
  if (webEntities.length > 0) {
    const topEntities = webEntities
      .slice(0, 5)
      .map(e => `${e.description} (${Math.round(e.score * 100)}%)`)
      .join(", ");
    lines.push(`WEB ENTITIES: ${topEntities}`);
  }

  // Priority 4: Page titles
  if (pageMatches.length > 0) {
    lines.push(`MATCHING PAGE TITLES: ${pageMatches.join(" | ")}`);
  }

  // Priority 5: Label classification
  if (labels.length > 0) {
    const topLabels = labels
      .filter(l => l.score > 0.6)
      .slice(0, 6)
      .map(l => `${l.description} (${Math.round(l.score * 100)}%)`)
      .join(", ");
    if (topLabels) lines.push(`CLASSIFICATION LABELS: ${topLabels}`);
  }

  if (lines.length === 0) return null;

  const hasWebID = bestGuesses.length > 0 || webEntities.length > 0;
  const topScore = labels[0]?.score || 0;

  if (hasWebID) {
    lines.push("\nCONFIDENCE GUIDANCE: Web identification is available — highly reliable for species names. Use as ground truth.");
  } else if (topScore > 0.85) {
    lines.push("\nCONFIDENCE GUIDANCE: Label confidence is high. Use as strong guidance.");
  } else if (topScore > 0.65) {
    lines.push("\nCONFIDENCE GUIDANCE: Moderate confidence. Apply visual judgment alongside suggestions.");
  } else {
    lines.push("\nCONFIDENCE GUIDANCE: Low confidence. Be transparent about uncertainty.");
  }

  return lines.join("\n");
};

// ── BUILD CLAUDE PROMPT ───────────────────────────────────────────────────────
export const buildPrompt = (locationContext, visionContext) => `You are the AI engine for "Tell ME" — a visual identification and information app. When given an image, respond ONLY with a valid JSON object (no markdown, no backticks, no preamble).

Your goal is to be genuinely informative — like a knowledgeable expert standing next to the user. Go beyond simple labels.

${visionContext
  ? `GOOGLE VISION PRE-IDENTIFICATION (use as primary ground truth):\n${visionContext}`
  : "Google Vision identification not available — use visual evidence only."}

${locationContext
  ? `LOCATION CONTEXT FROM PHOTO METADATA:\n${locationContext}\n\nUse location as helpful context, not as a hard filter:\n- WILDLIFE IN NATURAL SETTINGS: Location strongly narrows candidates.\n- CULTIVATED ENVIRONMENTS: Plants in gardens or zoos may be non-native. Identify what it actually is.\n- REPLICAS AND MONUMENTS: Identify the subject accurately — GPS away from origin suggests replica.\n- FOOD AND IMPORTS: Grocery produce is global. Identify correctly and note origin.\n- GENERAL RULE: Identify what you see. Use location to add nuance, never to override visual evidence.`
  : "No location metadata available — base identification on visual evidence only."}

Return this exact JSON shape:
{
  "subject": "Specific identification — species name, landmark name, dish name etc.",
  "tagline": "One evocative sentence that captures the essence",
  "confidence": 0-100,
  "confidenceNote": "Brief honest note about certainty",
  "subjectCategory": "One of: Landmark, Architecture, Artwork, Spider, Insect, Bird, Mammal, Reptile, Mushroom, Plant, Flower, Tree, Food, Animal, Object, Other",
  "richDetail": true or false,
  "safetyFlag": true or false,
  "safetyNote": "Only if safetyFlag is true — specific safety warning",
  "sections": [
    { "icon": "single emoji", "title": "Section title", "body": "2-3 sentences max." }
  ],
  "quickFacts": [
    { "label": "Fact label", "value": "Fact value" }
  ],
  "didYouKnow": "One surprising memorable fact.",
  "followUpSuggestions": ["Question 1?", "Question 2?", "Question 3?"]
}

SECTION GUIDELINES:
- Landmarks/architecture: History, Architect and Style, What is Inside, Visitor Tips
- Spiders/insects: Species and Range, Behaviour, Venom or Safety, Interesting Adaptation
- Plants/flowers: Species and Habitat, Growing Season, Medicinal Uses, Lookalikes
- Mushrooms: Species and Habitat, Edibility WARNING if relevant, Lookalikes, Ecological Role
- Animals: Species and Habitat, Behaviour, Conservation Status, Interesting Adaptation
- Food: Origin and Culture, Key Ingredients, Regional Variations, How to Eat It
- Everyday objects: 1-2 sections only, set richDetail to false
- quickFacts: 3-5 items maximum
- Set safetyFlag true for any mushroom, spider, snake, plant berry, or venomous creature
- BREVITY: sections body max 3 sentences. Never pad or repeat information.
- Be specific. Be accurate. Never guess a species with false confidence.`;

// ── QUICK SUBJECT CHECK ───────────────────────────────────────────────────────
// Single-word Claude call to determine if Vision API is needed
// Costs ~$0.0001 vs $0.035 for Vision — only runs when GPS is present
export const quickSubjectCheck = async (base64, mime = "image/jpeg") => {
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mime, data: base64 } },
              {
                type: "text",
                text: "Reply with ONE word only. Reply NATURE if this shows wildlife, insects, spiders, plants, mushrooms, fungi, flowers, trees, birds, reptiles, or any living organism in nature. Reply OTHER if this shows landmarks, buildings, architecture, food, artwork, sculptures, products, or everyday objects.",
              },
            ],
          },
        ],
      }),
    });
    const data = await res.json();
    const word = data.content?.[0]?.text?.trim().toUpperCase() || "NATURE";
    return word.includes("NATURE");
  } catch {
    return true; // fail safe — use Vision if check fails
  }
};

// ── IMAGE TRIAGE ──────────────────────────────────────────────────────────────
export const triageImage = async (base64, mime, coords, exifPresent) => {
  // Case 1: No EXIF — Vision required for best accuracy
  if (!exifPresent) {
    console.log("Triage: No EXIF -> Vision required");
    return { useVision: true, route: "no_exif", nearbyLandmark: null };
  }

  // Case 2: GPS matches known landmark — skip Vision
  const nearbyLandmark = findNearbyLandmark(coords);
  if (nearbyLandmark) {
    console.log(`Triage: Landmark GPS confirmed (${nearbyLandmark.name}) -> skipping Vision`);
    return { useVision: false, route: "landmark_confirmed", nearbyLandmark };
  }

  // Case 3: Has GPS — quick subject check
  const isNature = await quickSubjectCheck(base64, mime);
  if (isNature) {
    console.log("Triage: Nature subject -> Vision required");
    return { useVision: true, route: "nature_with_gps", nearbyLandmark: null };
  }

  // Case 4: Non-nature with GPS — skip Vision
  console.log("Triage: Non-nature with location -> skipping Vision");
  return { useVision: false, route: "non_nature_with_gps", nearbyLandmark: null };
};

// ── CALL CLAUDE ───────────────────────────────────────────────────────────────
export const callClaude = async (messages, system) => {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: system || undefined,
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data.content?.find(b => b.type === "text")?.text || "";
};

// ── JSON REPAIR ───────────────────────────────────────────────────────────────
export const extractAndRepairJSON = (text) => {
  let cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");
  let j = cleaned.slice(start);
  const lastBrace = j.lastIndexOf("}");
  if (lastBrace !== -1) j = j.slice(0, lastBrace + 1);

  // Fix trailing commas
  j = j.replace(/,\s*([\]\}])/g, "$1");

  // Recover from truncated response
  const fixTruncated = (str) => {
    let openBraces = 0, openBrackets = 0, inString = false, esc = false;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === "{") openBraces++;
      else if (c === "}") openBraces--;
      else if (c === "[") openBrackets++;
      else if (c === "]") openBrackets--;
    }
    if (inString) str += '"';
    while (openBrackets > 0) { str += "]"; openBrackets--; }
    while (openBraces > 0) { str += "}"; openBraces--; }
    return str;
  };

  j = fixTruncated(j);
  j = j.replace(/,\s*([\]\}])/g, "$1");

  // Fix typography characters
  j = j.replace(/[\u2018\u2019]/g, "'");
  j = j.replace(/[\u201C\u201D]/g, '"');
  j = j.replace(/\u2014/g, "-");
  j = j.replace(/\u2013/g, "-");

  return j;
};

// ── LOCATION CONTEXT STRING ───────────────────────────────────────────────────
export const buildLocationContext = (locData) => {
  if (!locData) return null;
  const season = getCurrentSeason();
  return `- Location: ${locData.full}\n- Season: ${season} (Northern Hemisphere)`;
};

// ── COLLECTION SUGGESTIONS ────────────────────────────────────────────────────
import { CATEGORY_ICONS } from "../constants";

export const suggestCollections = (result, locationData) => {
  const suggestions = [];
  const cat = result.subjectCategory || "";

  // Location-based suggestion
  if (locationData) {
    const locName = locationData.city
      ? `${locationData.city}${locationData.state ? ", " + locationData.state : ""}`
      : locationData.country || locationData.full;
    if (locName) suggestions.push({ type: "location", name: locName, icon: "📍" });
  }

  // Subject-based suggestion
  const categoryMap = {
    Spider:       { name: "Spiders",          icon: CATEGORY_ICONS.Spider },
    Insect:       { name: "Insects",          icon: CATEGORY_ICONS.Insect },
    Bird:         { name: "Birds",            icon: CATEGORY_ICONS.Bird },
    Mammal:       { name: "Mammals",          icon: CATEGORY_ICONS.Mammal },
    Reptile:      { name: "Reptiles",         icon: CATEGORY_ICONS.Reptile },
    Mushroom:     { name: "Mushrooms",        icon: CATEGORY_ICONS.Mushroom },
    Plant:        { name: "Plants",           icon: CATEGORY_ICONS.Plant },
    Flower:       { name: "Flowers",          icon: CATEGORY_ICONS.Flower },
    Tree:         { name: "Trees",            icon: CATEGORY_ICONS.Tree },
    Landmark:     { name: "Landmarks",        icon: CATEGORY_ICONS.Landmark },
    Architecture: { name: "Architecture",     icon: CATEGORY_ICONS.Architecture },
    Artwork:      { name: "Art and Culture",  icon: CATEGORY_ICONS.Artwork },
    Food:         { name: "Food and Cuisine", icon: CATEGORY_ICONS.Food },
    Animal:       { name: "Wildlife",         icon: CATEGORY_ICONS.Animal },
  };

  const mapped = categoryMap[cat];
  if (mapped) suggestions.push({ type: "subject", name: mapped.name, icon: mapped.icon });

  return suggestions;
};
