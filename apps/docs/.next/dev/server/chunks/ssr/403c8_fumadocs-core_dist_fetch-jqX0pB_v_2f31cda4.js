module.exports = [
"[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/fetch-jqX0pB_v.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchDocs",
    ()=>fetchDocs
]);
//#region src/search/client/fetch.ts
const cache = /* @__PURE__ */ new Map();
async function fetchDocs(query, { api = "/api/search", locale, tag }) {
    const url = new URL(api, window.location.origin);
    url.searchParams.set("query", query);
    if (locale) url.searchParams.set("locale", locale);
    if (tag) url.searchParams.set("tag", Array.isArray(tag) ? tag.join(",") : tag);
    const key = url.toString();
    const cached = cache.get(key);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    cache.set(key, result);
    return result;
}
;
}),
];

//# sourceMappingURL=403c8_fumadocs-core_dist_fetch-jqX0pB_v_2f31cda4.js.map