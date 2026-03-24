require("dotenv").config();

const express = require("express");
const { getRelevantEpgForPlaylist } = require("./services/epgService");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/epg", async (req, res) => {
    try {
        const { m3uUrl } = req.body;

        if (!m3uUrl || typeof m3uUrl !== "string") {
            return res.status(400).json({
                error: "m3uUrl is required and must be a string",
            });
        }

        const result = await getRelevantEpgForPlaylist(m3uUrl);

        return res.json(result);
    } catch (error) {
        console.error("POST /epg failed:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});