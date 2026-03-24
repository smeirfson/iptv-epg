const axios = require("axios");

async function parseM3U(m3uUrl) {
  try {
    const response = await axios.get(m3uUrl, {
      timeout: 30000,
      responseType: "text",
    });

    const content = response.data;

    if (typeof content !== "string") {
      return {
        epgUrl: null,
        tvgIds: new Set(),
      };
    }

    const lines = content.split(/\r?\n/);
    const headerLine = lines.find((line) => line.startsWith("#EXTM3U")) || "";

    const epgMatch = headerLine.match(/(?:url-tvg|x-tvg-url)="([^"]+)"/i);
    const epgUrl = epgMatch ? epgMatch[1] : null;

    const tvgIds = new Set();

    for (const line of lines) {
      if (!line.startsWith("#EXTINF")) {
        continue;
      }

      const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);

      if (tvgIdMatch && tvgIdMatch[1]) {
        tvgIds.add(tvgIdMatch[1].trim());
      }
    }

    return {
      epgUrl,
      tvgIds,
    };
  } catch (error) {
    console.error("Failed to fetch or parse M3U:", error.message);

    return {
      epgUrl: null,
      tvgIds: new Set(),
    };
  }
}

module.exports = { parseM3U };