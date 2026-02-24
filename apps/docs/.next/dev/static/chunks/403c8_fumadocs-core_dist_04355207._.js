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
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/advanced-TWQmNf5Z.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "n",
    ()=>searchSimple,
    "t",
    ()=>searchAdvanced
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/search-BBwdBAje.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$remove$2d$undefined$2d$DRuHyD77$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/remove-undefined-DRuHyD77.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$docs$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/methods/docs.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/methods/search.js [app-client] (ecmascript)");
;
;
;
//#region src/search/orama/search/simple.ts
async function searchSimple(db, query, params = {}) {
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])(query);
    return (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["search"])(db, {
        term: query,
        tolerance: 1,
        ...params,
        boost: {
            title: 2,
            ..."boost" in params ? params.boost : void 0
        }
    })).hits.map((hit)=>({
            type: "page",
            content: hit.document.title,
            breadcrumbs: hit.document.breadcrumbs,
            contentWithHighlights: highlighter.highlight(hit.document.title),
            id: hit.document.url,
            url: hit.document.url
        }));
}
//#endregion
//#region src/search/orama/search/advanced.ts
async function searchAdvanced(db, query, tag = [], { mode = "fulltext", ...override } = {}) {
    if (typeof tag === "string") tag = [
        tag
    ];
    let params = {
        ...override,
        mode,
        where: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$remove$2d$undefined$2d$DRuHyD77$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])({
            tags: tag.length > 0 ? {
                containsAll: tag
            } : void 0,
            ...override.where
        }),
        groupBy: {
            properties: [
                "page_id"
            ],
            maxResult: 8,
            ...override.groupBy
        }
    };
    if (query.length > 0) params = {
        ...params,
        term: query,
        properties: mode === "fulltext" ? [
            "content"
        ] : [
            "content",
            "embeddings"
        ]
    };
    const highlighter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$search$2d$BBwdBAje$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])(query);
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["search"])(db, params);
    const list = [];
    for (const item of result.groups ?? []){
        const pageId = item.values[0];
        const page = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$docs$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getByID"])(db, pageId);
        if (!page) continue;
        list.push({
            id: pageId,
            type: "page",
            content: page.content,
            breadcrumbs: page.breadcrumbs,
            contentWithHighlights: highlighter.highlight(page.content),
            url: page.url
        });
        for (const hit of item.result){
            if (hit.document.type === "page") continue;
            list.push({
                id: hit.document.id.toString(),
                content: hit.document.content,
                breadcrumbs: hit.document.breadcrumbs,
                contentWithHighlights: highlighter.highlight(hit.document.content),
                type: hit.document.type,
                url: hit.document.url
            });
        }
    }
    return list;
}
;
}),
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/static-Dt2cKb--.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "search",
    ()=>search
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$advanced$2d$TWQmNf5Z$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/advanced-TWQmNf5Z.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$create$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/methods/create.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@orama+orama@3.1.18/node_modules/@orama/orama/dist/browser/methods/serialization.js [app-client] (ecmascript)");
;
;
//#region src/search/client/static.ts
const cache = /* @__PURE__ */ new Map();
async function loadDB({ from = "/api/search", initOrama = (locale)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$create$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])({
        schema: {
            _: "string"
        },
        language: locale
    }) }) {
    const cacheKey = from;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    async function init() {
        const res = await fetch(from);
        if (!res.ok) throw new Error(`failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`);
        const data = await res.json();
        const dbs = /* @__PURE__ */ new Map();
        if (data.type === "i18n") {
            await Promise.all(Object.entries(data.data).map(async ([k, v])=>{
                const db$1 = await initOrama(k);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["load"])(db$1, v);
                dbs.set(k, {
                    type: v.type,
                    db: db$1
                });
            }));
            return dbs;
        }
        const db = await initOrama();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$orama$2b$orama$40$3$2e$1$2e$18$2f$node_modules$2f40$orama$2f$orama$2f$dist$2f$browser$2f$methods$2f$serialization$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["load"])(db, data);
        dbs.set("", {
            type: data.type,
            db
        });
        return dbs;
    }
    const result = init();
    cache.set(cacheKey, result);
    return result;
}
async function search(query, options) {
    const { tag, locale } = options;
    const db = (await loadDB(options)).get(locale ?? "");
    if (!db) return [];
    if (db.type === "simple") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$advanced$2d$TWQmNf5Z$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["n"])(db, query);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$advanced$2d$TWQmNf5Z$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["t"])(db.db, query, tag);
}
;
}),
]);

//# sourceMappingURL=403c8_fumadocs-core_dist_04355207._.js.map