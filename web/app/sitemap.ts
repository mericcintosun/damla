import type { MetadataRoute } from "next";
import { posts } from "./blog/posts";

const SITE = "https://getdamla.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/send",
    "/drop",
    "/links",
    "/how-it-works",
    "/faq",
    "/proof",
    "/docs",
    "/roadmap",
    "/blog",
    "/brand-kit",
    "/report",
  ].map((path) => ({
    url: `${SITE}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const postRoutes = posts.map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...routes, ...postRoutes];
}
