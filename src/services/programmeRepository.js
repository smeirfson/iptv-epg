const { pool } = require("./db");

async function deleteProgrammesForSource(sourceId) {
    await pool.query(
        `DELETE FROM programmes
     WHERE source_id = $1`,
        [sourceId]
    );
}

async function insertProgrammeBatch(sourceId, programmes) {
    if (!programmes || programmes.length === 0) {
        return;
    }

    const values = [];
    const placeholders = [];

    programmes.forEach((programme, index) => {
        const base = index * 6;

        placeholders.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
        );

        values.push(
            sourceId,
            programme.channel,
            programme.startTime,
            programme.endTime,
            programme.title,
            programme.description
        );
    });

    await pool.query(
        `INSERT INTO programmes
     (source_id, channel_xmltv_id, start_time, end_time, title, description)
     VALUES ${placeholders.join(", ")}`,
        values
    );
}

async function getProgrammesBySourceIdAndChannelIds(sourceId, channelIds) {
    const result = await pool.query(
        `SELECT id, source_id, channel_xmltv_id, start_time, end_time, title, description
     FROM programmes
     WHERE source_id = $1
       AND channel_xmltv_id = ANY($2)
       AND start_time >= NOW()
       AND start_time <= NOW() + INTERVAL '6 hours'
     ORDER BY channel_xmltv_id, start_time`,
        [sourceId, channelIds]
    );

    return result.rows;
}

async function countProgrammesBySourceId(sourceId) {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS count
     FROM programmes
     WHERE source_id = $1`,
        [sourceId]
    );

    return result.rows[0].count;
}

module.exports = {
    deleteProgrammesForSource,
    insertProgrammeBatch,
    getProgrammesBySourceIdAndChannelIds,
    countProgrammesBySourceId,
};