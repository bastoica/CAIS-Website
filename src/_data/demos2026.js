// Templates read from `demos2026` — this file's output.
//
// Hand-edit:
//   - demos2026-source.json   → demo-intrinsic data (title, authors, abstract, links, etc.)
//   - schedule2026.json       → which day each demo is on
//                                (each demo-poster block has a `demos: [slug, ...]` array)
//
// This file joins them at build time. You shouldn't normally edit it.

const fs = require('fs');
const path = require('path');

// Exported as a function so Eleventy re-evaluates on every build.
module.exports = function () {
    const demosSource = JSON.parse(fs.readFileSync(path.join(__dirname, 'demos2026-source.json'), 'utf8'));
    const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'schedule2026.json'), 'utf8'));

    function findDemoDay(slug) {
        for (const [dayKey, day] of Object.entries(schedule)) {
            for (const block of day.blocks || []) {
                if (block.type === 'demo-poster' && Array.isArray(block.demos) && block.demos.includes(slug)) {
                    return dayKey;
                }
            }
        }
        return null;
    }

    return demosSource.map(demo => ({
        ...demo,
        day: findDemoDay(demo.slug),
    }));
};
