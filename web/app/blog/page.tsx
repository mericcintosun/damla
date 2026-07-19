import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/Brand";
import { posts } from "./posts";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog · Damla",
  description:
    "Notes from building Damla: why it exists, why the gasless relayer stays trustless, and where sending money by a link is headed.",
};

export default function BlogIndex() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card blog-wide">
        <p className="blog-intro">
          Short notes from building Damla. Why it exists, how the trustless part actually works, and
          where sending money by a link goes next. No filler.
        </p>

        <div className="blog-list">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="card blog-item">
              <span className="blog-date">{post.date}</span>
              <h2 className="blog-title">{post.title}</h2>
              <p className="blog-dek">{post.dek}</p>
              <span className="blog-read">Read →</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="foot">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
