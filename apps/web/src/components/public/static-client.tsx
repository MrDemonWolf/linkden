import { hydrateRoot } from "react-dom/client";
import { retireLegacyPublicWorker } from "./retire-service-worker";
import { StaticPage, type StaticPagePayload } from "./static-page";

const root = document.getElementById("public-profile");
const data = document.getElementById("public-profile-data");
if (!root || !data?.textContent) throw new Error("Published profile data is missing");
const payload = JSON.parse(data.textContent) as StaticPagePayload;
void retireLegacyPublicWorker();
hydrateRoot(root, <StaticPage payload={payload} />);
