// @ts-nocheck
import * as __fd_glob_27 from "../content/docs/self-hosting/railway.mdx?collection=docs"
import * as __fd_glob_26 from "../content/docs/self-hosting/environment-variables.mdx?collection=docs"
import * as __fd_glob_25 from "../content/docs/self-hosting/docker.mdx?collection=docs"
import * as __fd_glob_24 from "../content/docs/self-hosting/custom-domain.mdx?collection=docs"
import * as __fd_glob_23 from "../content/docs/self-hosting/coolify.mdx?collection=docs"
import * as __fd_glob_22 from "../content/docs/self-hosting/cloudflare.mdx?collection=docs"
import * as __fd_glob_21 from "../content/docs/guide/vcard.mdx?collection=docs"
import * as __fd_glob_20 from "../content/docs/guide/social-networks.mdx?collection=docs"
import * as __fd_glob_19 from "../content/docs/guide/export-import.mdx?collection=docs"
import * as __fd_glob_18 from "../content/docs/guide/contact-form.mdx?collection=docs"
import * as __fd_glob_17 from "../content/docs/guide/blocks.mdx?collection=docs"
import * as __fd_glob_16 from "../content/docs/guide/apple-wallet.mdx?collection=docs"
import * as __fd_glob_15 from "../content/docs/guide/appearance.mdx?collection=docs"
import * as __fd_glob_14 from "../content/docs/guide/analytics.mdx?collection=docs"
import * as __fd_glob_13 from "../content/docs/reference/faq.mdx?collection=docs"
import * as __fd_glob_12 from "../content/docs/reference/changelog.mdx?collection=docs"
import * as __fd_glob_11 from "../content/docs/reference/api.mdx?collection=docs"
import * as __fd_glob_10 from "../content/docs/getting-started/quick-start.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/getting-started/installation.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/getting-started/configuration.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/terms-of-service.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/privacy-policy.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_4 } from "../content/docs/self-hosting/meta.json?collection=docs"
import { default as __fd_glob_3 } from "../content/docs/reference/meta.json?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/guide/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/getting-started/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "getting-started/meta.json": __fd_glob_1, "guide/meta.json": __fd_glob_2, "reference/meta.json": __fd_glob_3, "self-hosting/meta.json": __fd_glob_4, }, {"index.mdx": __fd_glob_5, "privacy-policy.mdx": __fd_glob_6, "terms-of-service.mdx": __fd_glob_7, "getting-started/configuration.mdx": __fd_glob_8, "getting-started/installation.mdx": __fd_glob_9, "getting-started/quick-start.mdx": __fd_glob_10, "reference/api.mdx": __fd_glob_11, "reference/changelog.mdx": __fd_glob_12, "reference/faq.mdx": __fd_glob_13, "guide/analytics.mdx": __fd_glob_14, "guide/appearance.mdx": __fd_glob_15, "guide/apple-wallet.mdx": __fd_glob_16, "guide/blocks.mdx": __fd_glob_17, "guide/contact-form.mdx": __fd_glob_18, "guide/export-import.mdx": __fd_glob_19, "guide/social-networks.mdx": __fd_glob_20, "guide/vcard.mdx": __fd_glob_21, "self-hosting/cloudflare.mdx": __fd_glob_22, "self-hosting/coolify.mdx": __fd_glob_23, "self-hosting/custom-domain.mdx": __fd_glob_24, "self-hosting/docker.mdx": __fd_glob_25, "self-hosting/environment-variables.mdx": __fd_glob_26, "self-hosting/railway.mdx": __fd_glob_27, });