module.exports = [
"[project]/apps/docs/src/lib/layout.shared.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "baseOptions",
    ()=>baseOptions
]);
function baseOptions() {
    return {
        nav: {
            title: "LinkDen",
            url: "/",
            transparentMode: "top"
        },
        githubUrl: "https://github.com/mrdemonwolf/linkden",
        links: [
            {
                text: "Docs",
                url: "/docs"
            },
            {
                text: "Email Templates",
                url: "/emails"
            }
        ],
        themeSwitch: {
            enabled: true,
            mode: "light-dark-system"
        },
        searchToggle: {
            enabled: true
        }
    };
}
}),
"[project]/apps/docs/src/lib/source.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "getLLMText",
    ()=>getLLMText,
    "getPageImage",
    ()=>getPageImage,
    "source",
    ()=>source
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$source$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-core@16.5.1_@types+react@19.2.14_lucide-react@0.563.0_react@19.2.4__next@16.1._fd22a10c0eda7afe97c95df49fe9bbd3/node_modules/fumadocs-core/dist/source/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f2e$source$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/.source/server.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f2e$source$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f2e$source$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const source = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_lucide$2d$react$40$0$2e$563$2e$0_react$40$19$2e$2$2e$4_$5f$next$40$16$2e$1$2e$_fd22a10c0eda7afe97c95df49fe9bbd3$2f$node_modules$2f$fumadocs$2d$core$2f$dist$2f$source$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loader"])({
    baseUrl: "/docs",
    source: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f2e$source$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["docs"].toFumadocsSource(),
    plugins: []
});
function getPageImage(page) {
    const segments = [
        ...page.slugs,
        "image.png"
    ];
    return {
        segments,
        url: `/og/docs/${segments.join("/")}`
    };
}
async function getLLMText(page) {
    const processed = await page.data.getText("processed");
    return `# ${page.data.title}\n\n${processed}`;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/apps/docs/src/app/docs/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>Layout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.29.0_babel-plugin-react-compiler@1.0.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$ui$40$16$2e$5$2e$1_$40$types$2b$react$2d$dom$40$19$2e$2$2e$3_$40$types$2b$react$40$19$2e$2$2e$14_$5f40$types$2b$react$40$19$2e$2$2e$14_f_992c40c07de73d70cc800d230e002e17$2f$node_modules$2f$fumadocs$2d$ui$2f$dist$2f$layouts$2f$docs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-ui@16.5.1_@types+react-dom@19.2.3_@types+react@19.2.14__@types+react@19.2.14_f_992c40c07de73d70cc800d230e002e17/node_modules/fumadocs-ui/dist/layouts/docs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$layout$2e$shared$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/src/lib/layout.shared.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$source$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/src/lib/source.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$source$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$source$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
function Layout({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$29$2e$0_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$ui$40$16$2e$5$2e$1_$40$types$2b$react$2d$dom$40$19$2e$2$2e$3_$40$types$2b$react$40$19$2e$2$2e$14_$5f40$types$2b$react$40$19$2e$2$2e$14_f_992c40c07de73d70cc800d230e002e17$2f$node_modules$2f$fumadocs$2d$ui$2f$dist$2f$layouts$2f$docs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DocsLayout"], {
        tree: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$source$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["source"].getPageTree(),
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$src$2f$lib$2f$layout$2e$shared$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["baseOptions"])(),
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/docs/src/app/docs/layout.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/apps/docs/.source/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "docs",
    ()=>docs
]);
// @ts-nocheck
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$railway$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/railway.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$environment$2d$variables$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/environment-variables.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$docker$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/docker.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$custom$2d$domain$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/custom-domain.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$coolify$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/coolify.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$cloudflare$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/cloudflare.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$faq$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/reference/faq.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$changelog$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/reference/changelog.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$api$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/reference/api.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$vcard$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/vcard.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$social$2d$networks$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/social-networks.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$export$2d$import$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/export-import.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$contact$2d$form$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/contact-form.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$blocks$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/blocks.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$apple$2d$wallet$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/apple-wallet.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$appearance$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/appearance.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$analytics$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/analytics.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$quick$2d$start$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/getting-started/quick-start.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$installation$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/getting-started/installation.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$configuration$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/getting-started/configuration.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$terms$2d$of$2d$service$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/terms-of-service.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$privacy$2d$policy$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/privacy-policy.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$index$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/index.mdx.js?collection=docs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/self-hosting/meta.json.json?collection=docs (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/reference/meta.json.json?collection=docs (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/guide/meta.json.json?collection=docs (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/getting-started/meta.json.json?collection=docs (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__ = __turbopack_context__.i("[project]/apps/docs/content/docs/meta.json.json?collection=docs (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$mdx$40$14$2e$2$2e$6_$40$types$2b$react$40$19$2e$2$2e$14_fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_luci_9bc63b59eee91a21a00a0bdf42d61a91$2f$node_modules$2f$fumadocs$2d$mdx$2f$dist$2f$runtime$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/fumadocs-mdx@14.2.6_@types+react@19.2.14_fumadocs-core@16.5.1_@types+react@19.2.14_luci_9bc63b59eee91a21a00a0bdf42d61a91/node_modules/fumadocs-mdx/dist/runtime/server.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const create = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$fumadocs$2d$mdx$40$14$2e$2$2e$6_$40$types$2b$react$40$19$2e$2$2e$14_fumadocs$2d$core$40$16$2e$5$2e$1_$40$types$2b$react$40$19$2e$2$2e$14_luci_9bc63b59eee91a21a00a0bdf42d61a91$2f$node_modules$2f$fumadocs$2d$mdx$2f$dist$2f$runtime$2f$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["server"])({
    "doc": {
        "passthroughs": [
            "extractedReferences"
        ]
    }
});
const docs = await create.docs("docs", "content/docs", {
    "meta.json": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__["default"],
    "getting-started/meta.json": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__["default"],
    "guide/meta.json": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__["default"],
    "reference/meta.json": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__["default"],
    "self-hosting/meta.json": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$meta$2e$json$2e$json$3f$collection$3d$docs__$28$json$29$__["default"]
}, {
    "index.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$index$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "privacy-policy.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$privacy$2d$policy$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "terms-of-service.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$terms$2d$of$2d$service$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "getting-started/configuration.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$configuration$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "getting-started/installation.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$installation$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "getting-started/quick-start.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$getting$2d$started$2f$quick$2d$start$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/analytics.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$analytics$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/appearance.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$appearance$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/apple-wallet.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$apple$2d$wallet$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/blocks.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$blocks$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/contact-form.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$contact$2d$form$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/export-import.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$export$2d$import$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/social-networks.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$social$2d$networks$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "guide/vcard.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$guide$2f$vcard$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "reference/api.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$api$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "reference/changelog.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$changelog$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "reference/faq.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$reference$2f$faq$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/cloudflare.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$cloudflare$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/coolify.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$coolify$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/custom-domain.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$custom$2d$domain$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/docker.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$docker$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/environment-variables.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$environment$2d$variables$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__,
    "self-hosting/railway.mdx": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$docs$2f$content$2f$docs$2f$self$2d$hosting$2f$railway$2e$mdx$2e$js$3f$collection$3d$docs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
});
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
];

//# sourceMappingURL=apps_docs_aa06bc8a._.js.map