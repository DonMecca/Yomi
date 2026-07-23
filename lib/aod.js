//===============
// YOMI ANIME OFFLINE DATABASE (AOD)
// Free-tier safe: loads a compact AniList→aliases map (~4MB) instead of the
// full 60MB+ offline database (which OOMs on Render's 512MB plan).
//===============

const fs = require("fs");
const path = require("path");

const COMPACT_FILE = path.join(__dirname, "../aod-aliases-compact.json");

let aodData = {
    anilist: new Map(),
    title: new Map()
};

let isReady = false;

async function initAOD() {
    console.log("[AOD] Initializing compact alias map...");
    try {
        if (!fs.existsSync(COMPACT_FILE)) {
            console.warn("[AOD] Compact alias file missing; alias matching disabled.");
            return;
        }

        const compact = JSON.parse(fs.readFileSync(COMPACT_FILE, "utf-8"));
        for (const [anilistId, synonyms] of Object.entries(compact)) {
            if (!Array.isArray(synonyms) || !synonyms.length) continue;
            aodData.anilist.set(String(anilistId), synonyms);
            const primary = synonyms[0];
            if (primary) {
                aodData.title.set(String(primary).toLowerCase(), synonyms);
            }
        }
        isReady = true;
        console.log(`[AOD] Ready (${aodData.anilist.size} AniList alias sets).`);
    } catch (e) {
        console.error("[AOD] FATAL ERROR during database initialization:", e.message);
    }
}

// Trigger background initialization immediately
initAOD();

function getAliasesByAniListId(id) {
    if (!isReady || !id) return [];
    return aodData.anilist.get(id.toString()) || [];
}

function getAliasesByTitle(title) {
    if (!isReady || !title) return [];
    return aodData.title.get(title.toLowerCase()) || [];
}

module.exports = { getAliasesByAniListId, getAliasesByTitle, isReady };
