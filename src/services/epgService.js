const { parseM3U } = require("./m3uParser");
const { downloadEpgStream } = require("./epgDownloader");
const { parseXMLStream } = require("./parser");
const epgSourceRepo = require("./epgSourceRepository");
const channelRepo = require("./channelRepository");
const programmeRepo = require("./programmeRepository");
const { isStale } = require("./epgSourceRepository");
const { parseXmltvDate, isWithinNextHours } = require("../utils/xmltvDate");

const PROGRAMME_BATCH_SIZE = 1000;
const PROGRAMME_STORE_WINDOW_HOURS = 24;

async function getRelevantEpgForPlaylist(m3uUrl) {
    console.log("Parsing M3U...");

    const { epgUrl, tvgIds } = await parseM3U(m3uUrl);

    console.log(`Found ${tvgIds.size} tvg-id values in M3U.`);

    if (!epgUrl) {
        return {
            hasEpg: false,
            epgUrl: null,
            tvgIdsCount: tvgIds.size,
            channels: [],
            programmes: [],
        };
    }

    console.log("EPG URL found:", epgUrl);

    let source = await epgSourceRepo.findByUrl(epgUrl);
    let shouldRefresh = false;

    if (!source) {
        console.log("New EPG source, inserting...");
        source = await epgSourceRepo.create(epgUrl);
        shouldRefresh = true;
    } else {
        const channelsCount = await channelRepo.countChannelsBySourceId(source.id);
        const programmesCount = await programmeRepo.countProgrammesBySourceId(source.id);

        const hasData = channelsCount > 0 && programmesCount > 0;

        if (!hasData) {
            console.log("EPG source exists but has no data, needs refresh...");
            shouldRefresh = true;
        } else if (isStale(source)) {
            console.log("EPG source is stale, needs refresh...");
            shouldRefresh = true;
        } else {
            console.log("EPG source is fresh, reuse existing data");
        }
    }

    const requestedChannelIds = Array.from(tvgIds);

    if (shouldRefresh) {
        console.log("Downloading and parsing full EPG...");

        const epgStream = await downloadEpgStream(epgUrl);

        const parsedChannels = [];
        let programmeBuffer = [];
        let savedProgrammeCount = 0;

        await programmeRepo.deleteProgrammesForSource(source.id);
        console.log("Deleted old programmes for source");

        const result = await parseXMLStream(epgStream, {
            onChannel(channel) {
                parsedChannels.push(channel);
            },

            async onProgramme(programme) {
                const startTime = parseXmltvDate(programme.start);
                const endTime = parseXmltvDate(programme.stop);

                if (!programme.channel || !startTime || !endTime) {
                    return;
                }

                if (!isWithinNextHours(startTime, PROGRAMME_STORE_WINDOW_HOURS)) {
                    return;
                }

                programmeBuffer.push({
                    channel: programme.channel,
                    startTime,
                    endTime,
                    title: programme.title || null,
                    description: programme.desc || null,
                });

                if (programmeBuffer.length >= PROGRAMME_BATCH_SIZE) {
                    const batch = programmeBuffer;
                    programmeBuffer = [];

                    await programmeRepo.insertProgrammeBatch(source.id, batch);
                    savedProgrammeCount += batch.length;

                    console.log(`Saved programme batch. Total saved so far: ${savedProgrammeCount}`);
                }
            },
        });

        if (programmeBuffer.length > 0) {
            await programmeRepo.insertProgrammeBatch(source.id, programmeBuffer);
            savedProgrammeCount += programmeBuffer.length;
            console.log(`Saved final programme batch. Total saved: ${savedProgrammeCount}`);
        }

        console.log(`Parsed ${result.channelCount} channels`);
        console.log(`Parsed ${result.programmeCount} programmes`);

        await channelRepo.insertChannels(source.id, parsedChannels);
        await epgSourceRepo.markSynced(source.id);

        console.log("Channels saved to DB");
        console.log("EPG source marked as synced");
    }

    console.log("Loading channels from DB...");

    const dbChannels = await channelRepo.getChannelsBySourceIdAndChannelIds(
        source.id,
        requestedChannelIds
    );

    const channels = dbChannels.map((channel) => ({
        id: channel.xmltv_id,
        displayName: channel.display_name,
        icon: channel.icon,
    }));

    console.log(`Loaded ${channels.length} matched channels from DB`);

    console.log("Loading programmes from DB...");

    const dbProgrammes = await programmeRepo.getProgrammesBySourceIdAndChannelIds(
        source.id,
        requestedChannelIds
    );

    const programmes = dbProgrammes.map((programme) => ({
        channel: programme.channel_xmltv_id,
        startTime: programme.start_time,
        endTime: programme.end_time,
        title: programme.title,
        description: programme.description,
    }));

    console.log(`Loaded ${programmes.length} matched programmes from DB`);

    return {
        hasEpg: true,
        epgUrl,
        tvgIdsCount: tvgIds.size,
        channels,
        programmes,
    };
}

module.exports = { getRelevantEpgForPlaylist };