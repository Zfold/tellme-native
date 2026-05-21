import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

// Convert a local image URI to base64 for embedding in HTML
const imageToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
};

// Build the hero overlay image as HTML (mimics the app's result screen)
const buildHeroHTML = (entry, base64) => {
  if (!base64) return "";
  const r = entry.result || {};
  const conf = r.confidence || 0;
  const confColor = conf > 85 ? "#6FCF97" : conf > 60 ? "#E8C547" : "#EB5757";

  return `
    <div style="position:relative;width:100%;height:280px;border-radius:12px;overflow:hidden;margin-bottom:8px;">
      <img src="${base64}" style="width:100%;height:100%;object-fit:cover;" />
      <div style="position:absolute;bottom:0;left:0;right:0;padding:20px;background:linear-gradient(transparent,rgba(15,13,11,0.85));">
        <div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px;">${r.subject || "Unknown"}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div style="font-size:11px;color:rgba(255,255,255,0.6);font-style:italic;flex:1;padding-right:10px;">${r.tagline || ""}</div>
          <div style="font-size:10px;color:${confColor};border:1px solid ${confColor};border-radius:20px;padding:2px 8px;white-space:nowrap;">${conf}% match</div>
        </div>
      </div>
    </div>`;
};

// Build the clean photo as HTML
const buildCleanPhotoHTML = (base64) => {
  if (!base64) return "";
  return `
    <div style="width:100%;border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <img src="${base64}" style="width:100%;height:auto;display:block;" />
    </div>`;
};

// Build entry content HTML
const buildEntryHTML = (entry) => {
  const r = entry.result || {};
  const date = new Date(entry.savedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let html = "";

  // Date and location
  html += `<div style="color:#999;font-size:11px;font-style:italic;margin-bottom:6px;">${date}</div>`;
  if (entry.location) {
    html += `<div style="display:inline-block;background:rgba(111,207,151,0.15);border-radius:20px;padding:3px 10px;margin-bottom:12px;">
      <span style="color:#6FCF97;font-size:10px;font-family:monospace;">📍 ${entry.location}</span>
    </div>`;
  }

  // Safety banner
  if (r.safetyFlag && r.safetyNote) {
    html += `
      <div style="background:rgba(235,87,87,0.12);border:1px solid #EB5757;border-radius:10px;padding:12px;margin-bottom:12px;">
        <div style="color:#EB5757;font-size:9px;font-family:monospace;letter-spacing:2px;margin-bottom:4px;">⚠️ SAFETY NOTICE</div>
        <div style="color:rgba(255,255,255,0.9);font-size:12px;line-height:1.5;">${r.safetyNote}</div>
      </div>`;
  }

  // Quick facts
  if (r.quickFacts?.length > 0) {
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">`;
    for (const f of r.quickFacts) {
      html += `
        <div style="background:rgba(232,197,71,0.15);border:1px solid rgba(232,197,71,0.3);border-radius:10px;padding:10px;width:46%;">
          <div style="color:rgba(232,197,71,0.5);font-size:8px;font-family:monospace;letter-spacing:1.5px;margin-bottom:3px;">${(f.label || "").toUpperCase()}</div>
          <div style="color:rgba(255,255,255,0.9);font-size:12px;">${f.value || ""}</div>
        </div>`;
    }
    html += `</div>`;
  }

  // Sections
  if (r.sections?.length > 0) {
    for (const s of r.sections) {
      html += `
        <div style="background:#171410;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:8px;">
          <div style="color:#E8C547;font-size:14px;font-weight:700;margin-bottom:6px;">${s.icon || ""} ${s.title || ""}</div>
          <div style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">${s.body || ""}</div>
        </div>`;
    }
  }

  // Did you know
  if (r.didYouKnow) {
    html += `
      <div style="background:rgba(232,197,71,0.15);border:1px solid rgba(232,197,71,0.3);border-radius:10px;padding:14px;margin-bottom:14px;">
        <div style="color:#E8C547;font-size:9px;font-family:monospace;letter-spacing:2px;margin-bottom:6px;">✦ DID YOU KNOW?</div>
        <div style="color:rgba(255,255,255,0.9);font-size:12px;font-style:italic;line-height:1.5;">${r.didYouKnow}</div>
      </div>`;
  }

  return html;
};

// ── MAIN EXPORT FUNCTION ──────────────────────────────────────────────────────
export const exportCollectionPDF = async (collection, entries) => {
  const collEntries = entries.filter(e =>
    e.collections?.includes(collection.name)
  );

  if (collEntries.length === 0) {
    throw new Error("No entries in this collection to export.");
  }

  // Convert all images to base64 (for embedding in HTML)
  const imageData = [];
  for (const entry of collEntries) {
    const b64 = await imageToBase64(entry.imageUri);
    imageData.push(b64);
  }

  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Build full HTML document
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 20px; }
        * { box-sizing: border-box; }
        body {
          background: #0F0D0B;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 20px;
        }
        .cover {
          text-align: center;
          padding: 40px 20px 30px;
          margin-bottom: 20px;
        }
        .cover-icon { font-size: 40px; margin-bottom: 12px; }
        .cover-title { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .cover-count { font-size: 12px; color: rgba(255,255,255,0.4); font-style: italic; margin-bottom: 8px; }
        .cover-date { font-size: 11px; color: rgba(255,255,255,0.3); }
        .cover-line { width: 120px; height: 2px; background: rgba(232,197,71,0.4); margin: 16px auto; }
        .entry { margin-bottom: 30px; page-break-inside: avoid; }
        .entry-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin-top: 30px;
        }
        .footer-brand { font-size: 18px; font-weight: 700; }
        .footer-white { color: #fff; }
        .footer-gold { color: #E8C547; }
        .footer-tag { font-size: 11px; color: rgba(255,255,255,0.3); font-style: italic; margin-top: 4px; }
      </style>
    </head>
    <body>

    <div class="cover">
      <div class="cover-icon">${collection.icon || "📁"}</div>
      <div class="cover-title">${collection.name}</div>
      <div class="cover-count">${collEntries.length} ${collEntries.length === 1 ? "discovery" : "discoveries"}</div>
      <div class="cover-line"></div>
      <div class="cover-date">Generated ${date}</div>
    </div>
  `;

  // Add each entry
  for (let i = 0; i < collEntries.length; i++) {
    const entry = collEntries[i];
    const b64 = imageData[i];

    html += `<div class="entry">`;

    // Hero overlay image
    html += buildHeroHTML(entry, b64);

    // Clean standalone photo
    html += buildCleanPhotoHTML(b64);

    // Text content
    html += buildEntryHTML(entry);

    if (i < collEntries.length - 1) {
      html += `<hr class="entry-divider" />`;
    }

    html += `</div>`;
  }

  // Footer branding
  html += `
    <div class="footer">
      <div class="footer-brand">
        <span class="footer-white">Tell</span><span class="footer-gold">ME</span>
      </div>
      <div class="footer-tag">Your world, explained.</div>
    </div>
    </body>
    </html>
  `;

  // Generate PDF
  const { uri } = await Print.printToFileAsync({
    html,
    width: 612,
    height: 792,
  });

  // Rename to something meaningful
  const newUri = `${FileSystem.cacheDirectory}${collection.name.replace(/[^a-zA-Z0-9]/g, "_")}_TellME.pdf`;
  await FileSystem.moveAsync({ from: uri, to: newUri });

  // Open share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(newUri, {
      mimeType: "application/pdf",
      dialogTitle: `Share "${collection.name}" collection`,
    });
  }

  return newUri;
};
