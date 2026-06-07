import {
  LANDMARKS,
  getCurrentSeason,
  CATEGORY_ICONS,
} from "../constants";

// ── RAILWAY BACKEND URL ───────────────────────────────────────────────────────
const BACKEND_URL = "https://tellme-backend-production.up.railway.app";

// ── IMAGE COMPRESSION ─────────────────────────────────────────────────────────
export const compressImage = async (uri) => {
  const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
  try {
    let result = await manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.85, format: SaveFormat.JPEG, base64: true }
    );
    const bytes = Math.round((result.base64.length * 3) / 4);
    if (bytes > 4 * 1024 * 1024) {
      result = await manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true }
      );
    }
    return { base64: result.base64, uri: result.uri, mime: "image/jpeg" };
  } catch (e) {
    throw new Error(`Image compression failed: ${e.message}`);
  }
};

// ── EXIF GPS EXTRACTION ───────────────────────────────────────────────────────
export const extractGPSFromExif = (exif) => {
  try {
    if (!exif) return null;
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
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lng=${lng}&format=json`,
      { headers: { "Accept-Language": "en", "User-Agent": "TellMeApp/1.0" } }
    );
    const data = await res.json();
    const a = data.address || {};
    const city = a.city || a.town || a.village || a.county;
    const state = a.state;
    const country = a.country;
    const parts = [city, state, country].filter(Boolean);
    return { full: parts.join(", "), city, state, country, lat, lng };
  } catch {
    return null;
  }
};

// ── LANDMARK MATCHING ─────────────────────────────────────────────────────────
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

// ── GOOGLE VISION — via Railway backend ──────────────────────────────────────
export const callGoogleVision = async (base64) => {
  try {
    const res = await fetch(`${BACKEND_URL}/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mime: "image/jpeg" }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("Vision API failed:", e.message);
    return null;
  }
};

// ── BUILD VISION CONTEXT ──────────────────────────────────────────────────────
export const buildVisionContext = (visionResult) => {
  if (!visionResult) return null;

  const labels       = visionResult.labelAnnotations      || [];
  const landmarks    = visionResult.landmarkAnnotations   || [];
  const web          = visionResult.webDetection          || {};
  const webEntities  = (web.webEntities || []).filter(e => e.description && e.score > 0.3);
  const bestGuesses  = (web.bestGuessLabels || []).map(b => b.label).filter(Boolean);
  const pageMatches  = (web.pagesWithMatchingImages || []).slice(0, 5);
  const fullMatches  = (web.fullMatchingImages || []).slice(0, 3);
  const detectedText = visionResult.textAnnotations?.[0]?.description?.trim() || null;

  const lines = [];

  if (landmarks.length > 0) {
    const lm = landmarks[0];
    const score = Math.round((lm.score || 0) * 100);
    lines.push(`LANDMARK CONFIRMED BY GOOGLE: ${lm.description} (${score}% confidence)`);
    const loc = lm.locations?.[0]?.latLng;
    if (loc) lines.push(`Landmark GPS: ${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`);
    lines.push("Write rich landmark tour guide content. This identification is certain.");
    lines.push("\nCONFIDENCE: VERY HIGH");
    return lines.join("\n");
  }

  if (detectedText && detectedText.length > 2 && detectedText.length < 200) {
    const cleanText = detectedText.replace(/\n/g, " ").trim();
    lines.push(`TEXT DETECTED IN IMAGE: "${cleanText}"`);
    lines.push("Use this text as strong identification evidence.");
  }

  if (bestGuesses.length > 0) {
    lines.push(`\nGOOGLE REVERSE IMAGE SEARCH RESULT:`);
    bestGuesses.forEach(g => lines.push(`  "${g}"`));
    lines.push("Treat this as your PRIMARY identification — equivalent to Google Image Search.");
  }

  if (fullMatches.length > 0) {
    lines.push(`\nEXACT IMAGE MATCHES FOUND ON WEB: ${fullMatches.length} exact matches`);
  }

  if (webEntities.length > 0) {
    const topEntities = webEntities
      .slice(0, 5)
      .map(e => `${e.description} (${Math.round(e.score * 100)}%)`)
      .join(", ");
    lines.push(`\nWEB ENTITIES: ${topEntities}`);
  }

  if (pageMatches.length > 0) {
    const titles = pageMatches.map(p => p.pageTitle).filter(Boolean).slice(0, 3);
    if (titles.length > 0) {
      lines.push(`\nMATCHING PAGE TITLES:`);
      titles.forEach(t => lines.push(`  - ${t}`));
    }
  }

  const hasStrongSignal = bestGuesses.length > 0 || webEntities.length > 0 || detectedText;
  if (!hasStrongSignal && labels.length > 0) {
    const topLabels = labels
      .filter(l => l.score > 0.7)
      .slice(0, 5)
      .map(l => `${l.description} (${Math.round(l.score * 100)}%)`)
      .join(", ");
    if (topLabels) lines.push(`\nVISUAL CLASSIFICATION LABELS (low reliability — shape/color only): ${topLabels}`);
    lines.push("WARNING: These are generic visual labels only. Do NOT treat these as specific identifications.");
  } else if (hasStrongSignal && labels.length > 0) {
    const supporting = labels.filter(l => l.score > 0.8).slice(0, 3).map(l => l.description).join(", ");
    if (supporting) lines.push(`\nSupporting visual context: ${supporting}`);
  }

  if (lines.length === 0) return null;

  lines.push("\n── EVIDENCE SUMMARY AND CONFIDENCE CAP ──");
  if (detectedText && bestGuesses.length > 0) {
    lines.push("EVIDENCE LEVEL: STRONG — text detected in image plus web reverse image match.");
    lines.push("CONFIDENCE RANGE: 85-98% appropriate if text and web result agree.");
  } else if (detectedText) {
    lines.push("EVIDENCE LEVEL: GOOD — text detected in image but no web confirmation.");
    lines.push("CONFIDENCE RANGE: 75-90% appropriate. Read the text carefully.");
  } else if (bestGuesses.length > 0 || fullMatches.length > 0) {
    lines.push("EVIDENCE LEVEL: GOOD — web reverse image match available.");
    lines.push("CONFIDENCE RANGE: 75-92% appropriate. Do NOT let generic labels override the web result.");
  } else if (webEntities.length > 0) {
    lines.push("EVIDENCE LEVEL: MODERATE — named web entities but no exact match.");
    lines.push("CONFIDENCE RANGE: 60-80% appropriate. Use web entities as primary signal.");
  } else {
    lines.push("EVIDENCE LEVEL: WEAK — no web matches, no text detected. Only visual labels available.");
    lines.push("CONFIDENCE CAP: Do NOT exceed 70%. Be explicit about uncertainty in confidenceNote.");
    lines.push("State clearly: 'Identification based on visual appearance only — no web confirmation available.'");
  }

  return lines.join("\n");
};

// ── BUILD CLAUDE PROMPT ───────────────────────────────────────────────────────
export const buildPrompt = (locationContext, visionContext) => `You are the AI engine for "Tell ME" — a visual identification and information app. When given an image, respond ONLY with a valid JSON object (no markdown, no backticks, no preamble).

Your goal: identify accurately, then inform richly. You are a knowledgeable tour guide and expert companion.

IDENTIFICATION HIERARCHY — follow this order strictly:
1. TEXT DETECTED IN IMAGE — brand names and labels in the image are highly reliable
2. GOOGLE REVERSE IMAGE SEARCH RESULT — treat as ground truth
3. WEB ENTITIES — named subjects from matching web pages
4. PAGE TITLES — extract product/subject names from matching pages
5. VISUAL LABELS — only use as last resort

NEVER let generic shape or color labels override a specific web identification.

${visionContext ? `GOOGLE VISION DATA:\n${visionContext}` : "No Google Vision data — identify from visual evidence only."}

${locationContext ? `LOCATION CONTEXT:\n${locationContext}\n\nLOCATION INTELLIGENCE RULES:\n- ACTIVELY USE your knowledge of this location. If you know of famous parks, preserves, waterfalls, trails, monuments, or natural features near the GPS coordinates, consider them as likely identifications.\n- A waterfall photo taken at coordinates near Turkey Creek Nature Preserve should be identified as Turkey Creek Falls, not "mountain stream."\n- A rock formation near a well-known geological site should be named specifically.\n- Combine visual evidence WITH location knowledge for the best identification.\n- Cultivated environments may have non-native species. Replicas exist far from originals. Imported food is global.\n- Identify what you see — use location to ADD SPECIFICITY, never to override clear visual evidence.` : "No location data available."}

Return this exact JSON:
{
  "subject": "Specific identification — brand name, species, landmark, dish etc.",
  "tagline": "One evocative sentence capturing the essence",
  "confidence": 0-100,
  "confidenceNote": "Brief honest note about certainty and evidence",
  "subjectCategory": "One of: Landmark, Architecture, Artwork, Spider, Insect, Bird, Mammal, Reptile, Mushroom, Plant, Flower, Tree, Food, Product, Animal, Object, Other",
  "richDetail": true or false,
  "safetyFlag": true or false,
  "safetyNote": "Only if safetyFlag true — specific safety warning",
  "sections": [
    { "icon": "emoji", "title": "Section title", "body": "2-3 sentences max." }
  ],
  "quickFacts": [
    { "label": "label", "value": "value" }
  ],
  "didYouKnow": "One surprising memorable fact.",
  "followUpSuggestions": ["Question 1?", "Question 2?", "Question 3?"]
}

SECTION GUIDELINES:
- Products/brands: What It Is, History and Brand Story, How It Is Used, Where to Buy
- Landmarks: History, Architect and Style, What Is Inside, Visitor Tips
- Spiders/insects: Species and Range, Behaviour, Venom or Safety, Interesting Adaptation
- Plants/flowers: Species and Habitat, Growing Season, Uses, Lookalikes
- Mushrooms: Species and Habitat, Edibility WARNING, Lookalikes, Ecological Role
- Animals: Species and Habitat, Behaviour, Conservation Status, Interesting Adaptation
- Food: Origin and Culture, Key Ingredients, Regional Variations, How to Eat
- Everyday objects: 1-2 sections, richDetail false
- quickFacts: 3-5 items max
- safetyFlag true for mushrooms, spiders, snakes, plant berries, venomous creatures
- BREVITY: 2-3 sentences per section max
- Be specific. Be accurate. Read any visible text before guessing.`;

// ── QUICK SUBJECT CHECK — via Railway backend ─────────────────────────────────
export const quickSubjectCheck = async (base64, mime = "image/jpeg") => {
  try {
    const res = await fetch(`${BACKEND_URL}/subject-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mime }),
    });
    const data = await res.json();
    return data.isNature ?? true;
  } catch {
    return true;
  }
};

// ── IMAGE TRIAGE ──────────────────────────────────────────────────────────────
export const triageImage = async (base64, mime, coords, exifPresent) => {
  // No EXIF — Vision required
  if (!exifPresent) {
    return { useVision: true, route: "no_exif", nearbyLandmark: null };
  }
  // GPS matches known landmark — only case where we skip Vision
  const nearbyLandmark = findNearbyLandmark(coords);
  if (nearbyLandmark) {
    return { useVision: false, route: "landmark_confirmed", nearbyLandmark };
  }
  // All other cases — always use Vision for best accuracy
  return { useVision: true, route: "vision_with_gps", nearbyLandmark: null };
};

// ── CALL CLAUDE — via Railway backend ─────────────────────────────────────────
export const callClaude = async (messages, system, locationContext, visionContext) => {
  const res = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      system: system || undefined,
      locationContext: locationContext || undefined,
      visionContext: visionContext || undefined,
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

  j = j.replace(/,\s*([\]\}])/g, "$1");

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
  j = j.replace(/[\u2018\u2019]/g, "'");
  j = j.replace(/[\u201C\u201D]/g, '"');
  j = j.replace(/\u2014/g, "-");
  j = j.replace(/\u2013/g, "-");

  return j;
};

// ── LOCATION CONTEXT ──────────────────────────────────────────────────────────
export const buildLocationContext = (locData) => {
  if (!locData) return null;
  const season = getCurrentSeason();
  return `- Location: ${locData.full}
- GPS Coordinates: ${locData.lat?.toFixed(4)}, ${locData.lng?.toFixed(4)}
- Season: ${season} (Northern Hemisphere)
- IMPORTANT: Consider well-known parks, nature preserves, landmarks, trails, waterfalls, and points of interest in or near ${locData.city || locData.state || locData.country}. If the image shows a natural feature (waterfall, rock formation, scenic overlook, trail) and you know of a famous or notable natural area at this location, identify it specifically rather than generically.`;
};

// ── COLLECTION SUGGESTIONS ────────────────────────────────────────────────────
export const suggestCollections = (result, locationData) => {
  const suggestions = [];
  const cat = result.subjectCategory || "";

  if (locationData) {
    const locName = locationData.city
      ? `${locationData.city}${locationData.state ? ", " + locationData.state : ""}`
      : locationData.country || locationData.full;
    if (locName) suggestions.push({ type: "location", name: locName, icon: "📍" });
  }

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
    Product:      { name: "Products",         icon: "📦" },
    Animal:       { name: "Wildlife",         icon: CATEGORY_ICONS.Animal },
  };

  const mapped = categoryMap[cat];
  if (mapped) suggestions.push({ type: "subject", name: mapped.name, icon: mapped.icon });

  return suggestions;
};
