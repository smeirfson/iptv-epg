const { pool } = require("./db");

async function insertChannels(sourceId, channels) {
    for (const channel of channels) {
        await pool.query(
            `INSERT INTO channels (source_id, xmltv_id, display_name, icon)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source_id, xmltv_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         icon = EXCLUDED.icon,
         updated_at = NOW()`,
            [sourceId, channel.id, channel.displayName, channel.icon]
        );
    }
}

async function getChannelsBySourceIdAndChannelIds(sourceId, channelIds) {
    const result = await pool.query(
        `SELECT id, source_id, xmltv_id, display_name, icon, created_at, updated_at
     FROM channels
     WHERE source_id = $1
       AND xmltv_id = ANY($2)
     ORDER BY display_name NULLS LAST, xmltv_id`,
        [sourceId, channelIds]
    );

    return result.rows;
}

async function countChannelsBySourceId(sourceId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
     FROM channels
     WHERE source_id = $1`,
        [sourceId]
    );

    return result.rows[0].count;
}

module.exports = {
    insertChannels,
    getChannelsBySourceIdAndChannelIds,
    countChannelsBySourceId,
};