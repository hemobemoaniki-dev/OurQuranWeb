import fs from "node:fs";
import path from "node:path";

const branch = process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || "main";
const productionBranch = process.env.SEO_PRODUCTION_BRANCH || "main";
const siteUrl = (process.env.SITE_URL || "https://ourquran.pages.dev").replace(/\/$/, "");
const publicDir = path.resolve("public");

fs.mkdirSync(publicDir, { recursive: true });

if (branch !== productionBranch) {
  fs.writeFileSync(
    path.join(publicDir, "robots.txt"),
    "User-agent: *\nDisallow: /\n",
    "utf8",
  );
  try { fs.rmSync(path.join(publicDir, "sitemap.xml")); } catch {}
  console.log(`SEO: preview branch "${branch}" blocked from indexing.`);
  process.exit(0);
}

const routes = ["/", "/read", "/adhkar", "/names"];
for (let i = 1; i <= 99; i += 1) routes.push(`/name/${i}`);

const today = new Date().toISOString().slice(0, 10);
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => [
    "  <url>",
    `    <loc>${siteUrl}${route}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "  </url>",
  ].join("\n")),
  "</urlset>",
  "",
].join("\n");

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml, "utf8");
fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`SEO: generated robots.txt and sitemap.xml for ${siteUrl} on ${branch}.`);
