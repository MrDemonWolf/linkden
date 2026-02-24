module.exports = [
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/search-BBwdBAje.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "t",
    ()=>createContentHighlighter
]);
//#region src/search/index.ts
function escapeRegExp(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildRegexFromQuery(q) {
    const trimmed = q.trim();
    if (trimmed.length === 0) return null;
    const terms = Array.from(new Set(trimmed.split(/\s+/).map((t)=>t.trim()).filter(Boolean)));
    if (terms.length === 0) return null;
    const escaped = terms.map(escapeRegExp).join("|");
    return new RegExp(`(${escaped})`, "gi");
}
function createContentHighlighter(query) {
    const regex = typeof query === "string" ? buildRegexFromQuery(query) : query;
    return {
        highlight (content) {
            if (!regex) return [
                {
                    type: "text",
                    content
                }
            ];
            const out = [];
            let i = 0;
            for (const match of content.matchAll(regex)){
                if (i < match.index) out.push({
                    type: "text",
                    content: content.substring(i, match.index)
                });
                out.push({
                    type: "text",
                    content: match[0],
                    styles: {
                        highlight: true
                    }
                });
                i = match.index + match[0].length;
            }
            if (i < content.length) out.push({
                type: "text",
                content: content.substring(i)
            });
            return out;
        }
    };
}
;
}),
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/algolia-DCfk4Vr4.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "searchDocs",
    ()=>searchDocs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/search-BBwdBAje.js [app-ssr] (ecmascript)");
;
//#region src/search/client/algolia.ts
function groupResults(hits) {
    const grouped = [];
    const scannedUrls = /* @__PURE__ */ new Set();
    for (const hit of hits){
        if (!scannedUrls.has(hit.url)) {
            scannedUrls.add(hit.url);
            grouped.push({
                id: hit.url,
                type: "page",
                breadcrumbs: hit.breadcrumbs,
                url: hit.url,
                content: hit.title
            });
        }
        grouped.push({
            id: hit.objectID,
            type: hit.content === hit.section ? "heading" : "text",
            url: hit.section_id ? `${hit.url}#${hit.section_id}` : hit.url,
            content: hit.content
        });
    }
    return grouped;
}
async function searchDocs(query, { indexName, onSearch, client, locale, tag }) {
    if (query.trim().length === 0) return [];
    const result = onSearch ? await onSearch(query, tag, locale) : await client.searchForHits({
        requests: [
            {
                type: "default",
                indexName,
                query,
                distinct: 5,
                hitsPerPage: 10,
                filters: tag ? `tag:${tag}` : void 0
            }
        ]
    });
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["t"])(query);
    return groupResults(result.results[0].hits).flatMap((hit)=>{
        if (hit.type === "page") return {
            ...hit,
            contentWithHighlights: hit.contentWithHighlights ?? highlighter.highlight(hit.content)
        };
        return [];
    });
}
;
}),
];

//# sourceMappingURL=403c8_fumadocs-core_dist_6e5dda9b._.js.map