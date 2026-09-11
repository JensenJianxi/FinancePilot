import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = resolve(currentDirectory, "../public");
const siteUrl = (process.env.VITE_SITE_URL ?? "https://financepilot.example.com").replace(/\/$/, "");
const lastModified = new Date().toISOString().split("T")[0];

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <lastmod>${lastModified}</lastmod>
  </url>
  <url>
    <loc>${siteUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastModified}</lastmod>
  </url>
  <url>
    <loc>${siteUrl}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastModified}</lastmod>
  </url>
</urlset>
`;

const manifest = JSON.stringify(
  {
    id: "/",
    name: "FinancePilot",
    short_name: "FinancePilot",
    description:
      "A calm, premium finance dashboard for managing spending, budgets, savings goals, and recurring costs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#f6f7fb",
    lang: "en",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any"
      }
    ]
  },
  null,
  2
);

await mkdir(publicDirectory, { recursive: true });
await writeFile(resolve(publicDirectory, "robots.txt"), robots, "utf8");
await writeFile(resolve(publicDirectory, "sitemap.xml"), sitemap, "utf8");
await writeFile(resolve(publicDirectory, "manifest.json"), manifest, "utf8");
