(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/search-BBwdBAje.js [app-client] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/remove-undefined-DRuHyD77.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "t",
    ()=>removeUndefined
]);
//#region src/utils/remove-undefined.ts
function removeUndefined(value, deep = false) {
    const obj = value;
    for(const key in obj){
        if (obj[key] === void 0) delete obj[key];
        if (!deep) continue;
        const entry = obj[key];
        if (typeof entry === "object" && entry !== null) {
            removeUndefined(entry, deep);
            continue;
        }
        if (Array.isArray(entry)) for (const item of entry)removeUndefined(item, deep);
    }
    return value;
}
;
}),
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/orama-cloud-legacy-CFdIdpme.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "searchDocs",
    ()=>searchDocs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/search-BBwdBAje.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$remove$2d$undefined$2d$DRuHyD77$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/remove-undefined-DRuHyD77.js [app-client] (ecmascript)");
;
;
//#region src/search/client/orama-cloud-legacy.ts
async function searchDocs(query, options) {
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])(query);
    const list = [];
    const { index = "default", client, params: extraParams = {}, tag } = options;
    if (index === "crawler") {
        const result$1 = await client.search({
            ...extraParams,
            term: query,
            where: {
                category: tag ? {
                    eq: tag.slice(0, 1).toUpperCase() + tag.slice(1)
                } : void 0,
                ...extraParams.where
            },
            limit: 10
        });
        if (!result$1) return list;
        for (const hit of result$1.hits){
            const doc = hit.document;
            list.push({
                id: hit.id,
                type: "page",
                content: doc.title,
                contentWithHighlights: highlighter.highlight(doc.title),
                url: doc.path
            }, {
                id: "page" + hit.id,
                type: "text",
                content: doc.content,
                contentWithHighlights: highlighter.highlight(doc.content),
                url: doc.path
            });
        }
        return list;
    }
    const params = {
        ...extraParams,
        term: query,
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$remove$2d$undefined$2d$DRuHyD77$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])({
            tag,
            ...extraParams.where
        }),
        groupBy: {
            properties: [
                "page_id"
            ],
            maxResult: 7,
            ...extraParams.groupBy
        }
    };
    const result = await client.search(params);
    if (!result || !result.groups) return list;
    for (const item of result.groups){
        let addedHead = false;
        for (const hit of item.result){
            const doc = hit.document;
            if (!addedHead) {
                list.push({
                    id: doc.page_id,
                    type: "page",
                    content: doc.title,
                    breadcrumbs: doc.breadcrumbs,
                    contentWithHighlights: highlighter.highlight(doc.title),
                    url: doc.url
                });
                addedHead = true;
            }
            list.push({
                id: doc.id,
                content: doc.content,
                contentWithHighlights: highlighter.highlight(doc.content),
                type: doc.content === doc.section ? "heading" : "text",
                url: doc.section_id ? `${doc.url}#${doc.section_id}` : doc.url
            });
        }
    }
    return list;
}
;
}),
]);

//# sourceMappingURL=403c8_fumadocs-core_dist_5e2e62a0._.js.map