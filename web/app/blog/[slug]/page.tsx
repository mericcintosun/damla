import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/Brand";
import { posts, getPost } from "../posts";
import "../blog.css";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) {
    return { title: "Post not found · Damla" };
  }
  return {
    title: `${post.title} · Damla`,
    description: post.dek,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="wrap">
      <TopBar />
      <div className="card blog-wide">
        <p className="blog-postmeta">{post.date}</p>
        {post.content}

        <div className="divider" />
        <Link href="/send" className="btn">
          Create a money link →
        </Link>
      </div>

      <div className="foot">
        <Link href="/blog">← All posts</Link>
        <Link href="/how-it-works">How it works</Link>
      </div>
    </div>
  );
}
