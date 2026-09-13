import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

const HOSTS = [
  "https://www.facebook.com/*",
  "https://facebook.com/*",
  "https://m.facebook.com/*",
  "https://x.com/*",
  "https://twitter.com/*",
  "https://mobile.twitter.com/*",
  "https://www.youtube.com/*",
  "https://youtube.com/*",
  "https://m.youtube.com/*",
  "https://www.instagram.com/*",
  "https://instagram.com/*",
];

export default defineManifest({
  manifest_version: 3,
  name: "SocialShield",
  version: pkg.version,
  description: pkg.description,
  action: {
    default_popup: "src/popup/index.html",
    default_title: "SocialShield",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: HOSTS,
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  permissions: ["storage", "scripting"],
  host_permissions: HOSTS,
  icons: {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png",
  },
  web_accessible_resources: [
    {
      resources: ["assets/*", "models/face/*", "tesseract/*", "workers/*"],
      matches: ["<all_urls>"],
    },
  ],
});
