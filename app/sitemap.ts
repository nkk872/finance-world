import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://finance-world-gamma.vercel.app").replace(/\/$/, "");

type NewsArticle = {
  title?: string;
  url?: string;
  domain?: string;
  publishedAt?: string;
  image?: string | null;
  summary?: string;
  category?: string;
};

function articlePath(article: NewsArticle): string | null {
  if (!article.title || !article.url) return null;
  let original: URL;
  try {
    original = new URL(article.url);
    if (original.protocol !== "https:" && original.protocol !== "http:") return null;
  } catch {
    return null;
  }
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "financial-story";
  const params = new URLSearchParams({
    title: article.title.slice(0, 180),
    source: (article.domain || original.hostname).slice(0, 120),
    url: original.toString(),
    publishedAt: article.publishedAt || "",
    category: article.category || "Financial news",
    summary: (article.summary || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 350),
    image: article.image || ""
  });
  return `${siteUrl}/article/${encodeURIComponent(slug)}?${params.toString()}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 }
  ];

  try {
    const response = await fetch(`${siteUrl}/api/news`, { next: { revalidate: 600 } });
    if (response.ok) {
      const data = await response.json();
      const articles: NewsArticle[] = Array.isArray(data.articles) ? data.articles : [];
      const articlePages = articles.slice(0, 200).flatMap(article => {
        const url = articlePath(article);
        if (!url) return [];
        const published = article.publishedAt ? new Date(article.publishedAt) : now;
        return [{
          url,
          lastModified: Number.isNaN(published.getTime()) ? now : published,
          changeFrequency: "daily" as const,
          priority: 0.7
        }];
      });
      pages.push(...articlePages);
    }
  } catch {
    // Keep the core sitemap available if a news provider is temporarily down.
  }

  return pages;
}
