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
            // Index EVERY synonym, not just synonyms[0]. The compact file already
            // ships ~6x more aliases than were being registered, so torrent names
            // that use an alternate romanisation missed entirely — e.g. "B Gata H
            // Kei" failed to match while its synonyms[0] "B-gata H-kei" did.
            // Memory cost is bounded: this builds keys over data already loaded.
            for (const synonym of synonyms) {
                if (!synonym) continue;
                const key = String(synonym).toLowerCase();
                if (!aodData.title.has(key)) {
                    aodData.title.set(key, synonyms);
                }
            }
        }
        isReady = true;
        console.log(`[AOD] Ready (${aodData.anilist.size} AniList alias sets, ${aodData.title.size} title keys).`);
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

// `isReady` is a `let` that flips to true once initAOD() finishes, so exporting
// the bare value would snapshot `false` for any module that reads it before
// init completes. Export a getter instead so callers always see current state.
module.exports = {
    getAliasesByAniListId,
    getAliasesByTitle,
    get isReady() { return isReady; }
};
