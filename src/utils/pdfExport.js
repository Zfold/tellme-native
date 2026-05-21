import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

// Convert a local image URI to base64 for embedding in HTML
const imageToBase64 = async (uri) => {
  try {
    if (!uri) return null;
    // Handle content:// URIs on Android by copying to cache first
    let fileUri = uri;
    if (uri.startsWith("content://") || uri.startsWith("ph://")) {
      const filename = `tellme_temp_${Date.now()}.jpg`;
      fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
    }
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.warn("Image to base64 failed:", e.message);
    return null;
  }
};

// ── MAIN EXPORT FUNCTION ──────────────────────────────────────────────────────
export const exportCollectionPDF = async (collection, entries) => {
  const collEntries = entries.filter(e =>
    e.collections?.includes(collection.name)
  );

  if (collEntries.length === 0) {
    throw new Error("No entries in this collection to export.");
  }

  // Convert all images to base64
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

  // Build HTML with PRINT-FRIENDLY light theme
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 24px; size: letter; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #ffffff;
          color: #1a1a1a;
          font-family: Georgia, "Times New Roman", serif;
          padding: 20px;
          font-size: 13px;
          line-height: 1.5;
        }
        .cover {
          text-align: center;
          padding: 30px 20px 20px;
          margin-bottom: 24px;
          border-bottom: 2px solid #E8C547;
        }
        .cover-icon { font-size: 36px; margin-bottom: 8px; }
        .cover-title { font-size: 26px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; font-family: Georgia, serif; }
        .cover-count { font-size: 12px; color: #888; font-style: italic; margin-bottom: 4px; }
        .cover-date { font-size: 10px; color: #aaa; }
        .cover-brand { margin-top: 12px; font-size: 16px; font-weight: 700; }
        .brand-tell { color: #1a1a1a; }
        .brand-me { color: #C9A730; }
        .cover-tagline { font-size: 10px; color: #999; font-style: italic; margin-top: 2px; }

        .entry { margin-bottom: 28px; page-break-inside: avoid; }
        .entry-divider { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }

        .hero-wrap {
          position: relative;
          width: 100%;
          height: 240px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .hero-img { width: 100%; height: 100%; object-fit: cover; }
        .hero-overlay {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          padding: 16px;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
        }
        .hero-subject { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 3px; }
        .hero-tagline { font-size: 11px; color: rgba(255,255,255,0.7); font-style: italic; }
        .hero-conf {
          display: inline-block;
          font-size: 10px;
          border: 1px solid #E8C547;
          color: #E8C547;
          border-radius: 12px;
          padding: 2px 8px;
          margin-top: 6px;
        }

        .clean-photo {
          width: 100%;
          border-radius: 8px;
          margin-bottom: 14px;
        }

        .meta { color: #888; font-size: 11px; font-style: italic; margin-bottom: 6px; }
        .location {
          display: inline-block;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 12px;
          padding: 2px 10px;
          font-size: 10px;
          font-family: monospace;
          margin-bottom: 10px;
        }

        .safety {
          background: #fde8e8;
          border: 1px solid #e57373;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .safety-label { color: #c62828; font-size: 9px; font-family: monospace; letter-spacing: 2px; margin-bottom: 3px; }
        .safety-text { color: #333; font-size: 12px; line-height: 1.5; }

        .facts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .fact {
          background: #fffde7;
          border: 1px solid #E8C547;
          border-radius: 8px;
          padding: 8px 10px;
          width: 47%;
        }
        .fact-label { color: #C9A730; font-size: 8px; font-family: monospace; letter-spacing: 1.5px; margin-bottom: 2px; text-transform: uppercase; }
        .fact-value { color: #333; font-size: 12px; }

        .section {
          background: #fafafa;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 8px;
        }
        .section-title { color: #C9A730; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .section-body { color: #444; font-size: 12px; line-height: 1.6; }

        .dyk {
          background: #fffde7;
          border: 1px solid #E8C547;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 12px;
        }
        .dyk-label { color: #C9A730; font-size: 9px; font-family: monospace; letter-spacing: 2px; margin-bottom: 4px; }
        .dyk-text { color: #333; font-size: 12px; font-style: italic; line-height: 1.5; }

        .footer {
          text-align: center;
          padding: 16px;
          border-top: 2px solid #E8C547;
          margin-top: 24px;
        }
        .footer-brand { font-size: 18px; font-weight: 700; }
        .footer-tag { font-size: 10px; color: #999; font-style: italic; margin-top: 2px; }
      </style>
    </head>
    <body>

    <div class="cover">
      <div class="cover-icon">${collection.icon || "📁"}</div>
      <div class="cover-title">${collection.name}</div>
      <div class="cover-count">${collEntries.length} ${collEntries.length === 1 ? "discovery" : "discoveries"}</div>
      <div class="cover-date">Generated ${date}</div>
      <div class="cover-brand">
        <span class="brand-tell">Tell</span><span class="brand-me">ME</span>
      </div>
      <div class="cover-tagline">Your world, explained.</div>
    </div>
  `;

  // Add each entry
  for (let i = 0; i < collEntries.length; i++) {
    const entry = collEntries[i];
    const b64 = imageData[i];
    const r = entry.result || {};
    const conf = r.confidence || 0;

    const entryDate = new Date(entry.savedAt).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    html += `<div class="entry">`;

    // Hero overlay image
    if (b64) {
      html += `
        <div class="hero-wrap">
          <img class="hero-img" src="${b64}" />
          <div class="hero-overlay">
            <div class="hero-subject">${r.subject || "Unknown"}</div>
            <div class="hero-tagline">${r.tagline || ""}</div>
            <div class="hero-conf">${conf}% match</div>
          </div>
        </div>`;

      // Clean standalone photo
      html += `<img class="clean-photo" src="${b64}" />`;
    }

    // Date and location
    html += `<div class="meta">${entryDate}</div>`;
    if (entry.location) {
      html += `<div class="location">📍 ${entry.location}</div>`;
    }

    // Safety banner
    if (r.safetyFlag && r.safetyNote) {
      html += `
        <div class="safety">
          <div class="safety-label">⚠️ SAFETY NOTICE</div>
          <div class="safety-text">${r.safetyNote}</div>
        </div>`;
    }

    // Quick facts
    if (r.quickFacts?.length > 0) {
      html += `<div class="facts">`;
      for (const f of r.quickFacts) {
        html += `
          <div class="fact">
            <div class="fact-label">${(f.label || "").toUpperCase()}</div>
            <div class="fact-value">${f.value || ""}</div>
          </div>`;
      }
      html += `</div>`;
    }

    // Sections
    if (r.sections?.length > 0) {
      for (const s of r.sections) {
        html += `
          <div class="section">
            <div class="section-title">${s.icon || ""} ${s.title || ""}</div>
            <div class="section-body">${s.body || ""}</div>
          </div>`;
      }
    }

    // Did you know
    if (r.didYouKnow) {
      html += `
        <div class="dyk">
          <div class="dyk-label">✦ DID YOU KNOW?</div>
          <div class="dyk-text">${r.didYouKnow}</div>
        </div>`;
    }

    if (i < collEntries.length - 1) {
      html += `<hr class="entry-divider" />`;
    }

    html += `</div>`;
  }

  // Footer
  html += `
    <div class="footer">
      <div class="footer-brand">
        <span class="brand-tell">Tell</span><span class="brand-me">ME</span>
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

  // Rename to meaningful filename
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
