const { pool } = require("./db");

async function findByUrl(url) {
    const result = await pool.query(
        "SELECT * FROM epg_sources WHERE url = $1",
        [url]
    );

    return result.rows[0] || null;
}

async function create(url) {
    const result = await pool.query(
        `INSERT INTO epg_sources (url, last_synced_at)
     VALUES ($1, NOW())
     RETURNING *`,
        [url]
    );

    return result.rows[0];
}

function isStale(source) {
    if (!source.last_synced_at) return true;

    const ONE_HOUR = 1000 * 60 * 60;
    const lastSync = new Date(source.last_synced_at).getTime();
    const now = Date.now();

    return now - lastSync > ONE_HOUR;
}

async function markSynced(sourceId) {
    const result = await pool.query(
        `UPDATE epg_sources
     SET last_synced_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
        [sourceId]
    );

    return result.rows[0];
}

module.exports = {
    findByUrl,
    create,
    isStale,
    markSynced,
};  