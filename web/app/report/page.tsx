"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/Brand";
import "./report.css";

const CATEGORIES = [
  "Bug",
  "Payment issue",
  "UI/design",
  "Idea",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

const TEAM_EMAIL = "hello@getdamla.app";
const STORAGE_KEY = "damla_reports";
const MAX_LEN = 2000;

type StoredReport = {
  category: Category;
  message: string;
  email: string;
  createdAt: number;
};

function saveReport(report: StoredReport) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing: StoredReport[] = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    list.push(report);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function buildMailto(report: StoredReport) {
  const subject = `Damla report: ${report.category}`;
  const bodyLines = [
    `Category: ${report.category}`,
    "",
    "What happened:",
    report.message,
    "",
    report.email ? `Reply to: ${report.email}` : "Reply to: (not provided)",
    `Sent from: ${window.location.origin}/report`,
  ];
  const body = bodyLines.join("\n");
  return `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export default function ReportPage() {
  const [category, setCategory] = useState<Category>("Bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<StoredReport | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (!category) {
      setError("Please pick a category so we know where this belongs.");
      return;
    }
    if (!trimmed) {
      setError("Please tell us what happened. A sentence or two is plenty.");
      return;
    }
    if (email.trim() && !email.includes("@")) {
      setError("That email does not look right. Fix it, or leave it empty.");
      return;
    }

    const report: StoredReport = {
      category,
      message: trimmed,
      email: email.trim(),
      createdAt: Date.now(),
    };

    const ok = saveReport(report);
    if (!ok) {
      setError(
        "We could not save this in your browser. Check that storage is not blocked, then try again.",
      );
      return;
    }
    setSaved(report);
  }

  function reset() {
    setCategory("Bug");
    setMessage("");
    setEmail("");
    setError(null);
    setSaved(null);
  }

  return (
    <div className="wrap">
      <TopBar />

      <div className="card">
        <span className="eyebrow">
          <span className="dot" /> Report a problem
        </span>

        {!saved ? (
          <>
            <h1 className="card-h">Something off? Tell us.</h1>
            <p className="note mb-s">
              Bug, a payment that felt wrong, a rough edge, or just an idea. It
              is saved in your browser, and you can send it to the team in one
              tap.
            </p>

            <form className="rp-form" onSubmit={onSubmit} noValidate>
              <div className="rp-field">
                <label className="label" htmlFor="rp-category">
                  Category
                </label>
                <select
                  id="rp-category"
                  className="input rp-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rp-field">
                <label className="label" htmlFor="rp-message">
                  What happened?
                </label>
                <textarea
                  id="rp-message"
                  className="input rp-textarea"
                  placeholder="Walk us through it. What did you do, and what did you expect instead?"
                  value={message}
                  maxLength={MAX_LEN}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="rp-count">
                  {message.length}/{MAX_LEN}
                </div>
              </div>

              <div className="rp-field">
                <label className="label" htmlFor="rp-email">
                  Your email (optional)
                </label>
                <input
                  id="rp-email"
                  className="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com, if you want a reply"
                  value={email}
                  style={{ fontSize: 15 }}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error ? (
                <div className="status err" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="rp-actions">
                <button type="submit" className="btn">
                  Submit report
                </button>
              </div>
            </form>

            <p className="hint">
              Nothing leaves your device unless you choose to send it.
            </p>
          </>
        ) : (
          <>
            <h1 className="card-h">Got it.</h1>

            <div className="status ok" role="status">
              <div className="rp-ok-title">Thanks. Your report was saved.</div>
              It is stored in this browser. Want the team to see it? Send it
              along below.
            </div>

            <div className="divider" />

            <div className="row">
              <span className="k">Category</span>
              <span className="v">{saved.category}</span>
            </div>
            <div className="row">
              <span className="k">Saved at</span>
              <span className="v mono">
                {new Date(saved.createdAt).toLocaleString()}
              </span>
            </div>
            {saved.email ? (
              <div className="row">
                <span className="k">Reply to</span>
                <span className="v">{saved.email}</span>
              </div>
            ) : null}

            <div className="rp-ok-actions">
              <a className="btn" href={buildMailto(saved)}>
                Send it to the team
              </a>
              <button type="button" className="btn ghost" onClick={reset}>
                Report another
              </button>
            </div>

            <p className="hint">
              The send button opens your email app with everything filled in.
              Nothing is sent automatically.
            </p>
          </>
        )}
      </div>

      <div className="foot">
        <span>Damla · Report a problem</span>
        <Link href="/" className="mono">
          Back home ↗
        </Link>
      </div>
    </div>
  );
}
