// Templates read from `papers2026` — this file's output.
//
// Hand-edit:
//   - papers2026-source.json  → paper-intrinsic data (title, authors, abstract, links, etc.)
//   - schedule2026.json       → ALL timing / which paper is in which session
//                                (each paper-session block has a `talks: [slug, ...]` array)
//
// This file joins them at build time. You shouldn't normally edit it.

const fs = require('fs');
const path = require('path');

function addMinutes(timeStr, mins) {
    const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return timeStr;
    let h = parseInt(m[1], 10) % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0);
    let mm = parseInt(m[2], 10) + mins;
    h += Math.floor(mm / 60);
    mm = ((mm % 60) + 60) % 60;
    h = ((h % 24) + 24) % 24;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = (h % 12) || 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

// Exported as a function so Eleventy re-evaluates on every build —
// otherwise edits to schedule2026.json wouldn't propagate without
// also touching this file or restarting the dev server.
module.exports = function () {
    const papersSource = JSON.parse(fs.readFileSync(path.join(__dirname, 'papers2026-source.json'), 'utf8'));
    const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'schedule2026.json'), 'utf8'));

    // Match a paper's slug against either a paper-session OR an ops block's
    // talks array. The block type also becomes the paper's category, so the
    // listing/detail templates can branch on research vs. ops without an
    // explicit field in the source JSON.
    function findPaperSession(slug) {
        for (const [dayKey, day] of Object.entries(schedule)) {
            for (const block of day.blocks || []) {
                if (!Array.isArray(block.talks)) continue;
                if (block.type !== 'paper-session' && block.type !== 'ops') continue;
                const idx = block.talks.indexOf(slug);
                if (idx >= 0) return { block, dayKey, order: idx + 1 };
            }
        }
        return null;
    }

    return papersSource.map(paper => {
        const found = findPaperSession(paper.slug);
        if (!found) return paper;
        const { block, dayKey, order } = found;
        return {
            ...paper,
            category: block.type === 'ops' ? 'ops' : 'research',
            talk: {
                sessionId: block.id,
                day: dayKey,
                order,
                start: addMinutes(block.start, (order - 1) * block.slotMinutes),
                end: addMinutes(block.start, order * block.slotMinutes),
                sessionName: block.session,
                sessionTheme: block.theme,
                room: block.room,
            },
        };
    });
};
