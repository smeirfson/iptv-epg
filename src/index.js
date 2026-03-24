require("dotenv").config();

const { getRelevantEpgForPlaylist } = require("./services/epgService");

async function run() {
    const m3uUrl = process.env.M3U_URL;

    if (!m3uUrl) {
        console.error("Missing M3U_URL in .env");
        return;
    }

    const result = await getRelevantEpgForPlaylist(m3uUrl);

    if (!result.hasEpg) {
        console.log("No EPG URL found in playlist");
        return;
    }

    console.log("\n=== SUMMARY ===");
    console.log("EPG URL:", result.epgUrl);
    console.log("tvg-id count in playlist:", result.tvgIdsCount);
    console.log("Matched channels:", result.channels.length);
    console.log("Matched programmes:", result.programmes.length);

    console.log("\n=== FIRST MATCHED CHANNELS ===");
    result.channels.slice(0, 10).forEach((channel) => {
        console.log(channel);
    });

    console.log("\n=== FIRST MATCHED PROGRAMMES ===");
    result.programmes.slice(0, 10).forEach((programme) => {
        console.log(programme);
    });
}

run().catch((err) => {
    console.error("Job failed:", err.message);
});