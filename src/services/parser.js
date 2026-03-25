const sax = require("sax");

function parseXMLStream(stream, { onChannel, onProgramme }) {
    return new Promise((resolve, reject) => {
        const parser = sax.createStream(true, { trim: true });

        let currentText = "";
        let currentChannel = null;
        let currentProgramme = null;

        let channelCount = 0;
        let programmeCount = 0;

        let chain = Promise.resolve();
        let failed = false;

        function enqueue(task) {
            chain = chain.then(task).catch((error) => {
                failed = true;
                reject(error);
            });
        }

        parser.on("opentag", (node) => {
            currentText = "";

            if (node.name === "channel") {
                currentChannel = {
                    id: node.attributes.id || null,
                    displayName: null,
                    icon: null,
                };
            }

            if (node.name === "programme") {
                currentProgramme = {
                    channel: node.attributes.channel || null,
                    start: node.attributes.start || null,
                    stop: node.attributes.stop || null,
                    title: null,
                    desc: null,
                };
            }

            if (node.name === "icon" && currentChannel) {
                currentChannel.icon = node.attributes.src || null;
            }
        });

        parser.on("text", (text) => {
            currentText += text;
        });

        parser.on("closetag", (tagName) => {
            if (failed) return;

            if (tagName === "display-name" && currentChannel) {
                if (!currentChannel.displayName) {
                    currentChannel.displayName = currentText;
                }
            }

            if (tagName === "title" && currentProgramme) {
                currentProgramme.title = currentText;
            }

            if (tagName === "desc" && currentProgramme) {
                currentProgramme.desc = currentText;
            }

            if (tagName === "channel" && currentChannel) {
                const channel = currentChannel;
                currentChannel = null;
                channelCount++;

                enqueue(async () => {
                    await onChannel(channel);
                });
            }

            if (tagName === "programme" && currentProgramme) {
                const programme = currentProgramme;
                currentProgramme = null;
                programmeCount++;

                enqueue(async () => {
                    await onProgramme(programme);
                });
            }

            currentText = "";
        });

        parser.on("end", () => {
            chain
                .then(() => {
                    if (failed) return;

                    resolve({
                        channelCount,
                        programmeCount,
                    });
                })
                .catch(reject);
        });

        parser.on("error", reject);
        stream.on("error", reject);

        stream.pipe(parser);
    });
}

module.exports = { parseXMLStream };