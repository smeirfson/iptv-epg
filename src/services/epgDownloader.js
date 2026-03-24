const axios = require("axios");
const zlib = require("zlib");

async function downloadEpgStream(epgUrl) {
    const response = await axios({
        method: "get",
        url: epgUrl,
        responseType: "stream",
        timeout: 30000,
    });

    const stream = response.data;

    if (epgUrl.toLowerCase().endsWith(".gz")) {
        return stream.pipe(zlib.createGunzip());
    }

    return stream;
}

module.exports = { downloadEpgStream };