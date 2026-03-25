const { pool } = require("./db");

async function replaceAllProgrammesForSource(sourceId, programmes) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `DELETE FROM programmes
       WHERE source_id = $1`,
            [sourceId]
        );

        const batchSize = 1000;

        for (let i = 0; i < programmes.length; i += batchSize) {
            const batch = programmes.slice(i, i + batchSize);

            const values = [];
            const placeholders = [];

            batch.forEach((programme, index) => {
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

            await client.query(
                `INSERT INTO programmes
         (source_id, channel_xmltv_id, start_time, end_time, title, description)
         VALUES ${placeholders.join(", ")}`,
                values
            );
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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
    replaceAllProgrammesForSource,
    getProgrammesBySourceIdAndChannelIds,
    countProgrammesBySourceId,
};