import Link from "next/link";

export function DropMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="drop"
      width={size}
      height={size * 1.18}
      viewBox="0 0 24 28"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34e2c8" />
          <stop offset="1" stopColor="#1fb6ff" />
        </linearGradient>
      </defs>
      <path
        d="M12 1C12 1 3 12 3 18a9 9 0 0 0 18 0C21 12 12 1 12 1Z"
        fill="url(#dg)"
      />
      <path
        d="M8.5 17.5a3.5 3.5 0 0 0 3.5 3.5"
        stroke="#04140f"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

// Ambient, performance-safe background: a fixed image wash, a slow light drift, and a handful of
// rising water bubbles built only from GPU transform/opacity. Rendered once in the root layout.
export function AmbientBackground() {
  const bubbles = [
    { l: "8%", s: 10, d: 15, delay: 0 },
    { l: "18%", s: 6, d: 19, delay: 4 },
    { l: "27%", s: 14, d: 13, delay: 2 },
    { l: "39%", s: 8, d: 21, delay: 7 },
    { l: "50%", s: 5, d: 17, delay: 1 },
    { l: "58%", s: 11, d: 14, delay: 5 },
    { l: "68%", s: 7, d: 20, delay: 3 },
    { l: "77%", s: 13, d: 12, delay: 8 },
    { l: "86%", s: 6, d: 18, delay: 6 },
    { l: "93%", s: 9, d: 16, delay: 2.5 },
    { l: "33%", s: 5, d: 23, delay: 9 },
    { l: "63%", s: 6, d: 22, delay: 11 },
  ];
  return (
    <div className="bg-layer" aria-hidden>
      <div className="bg-image" />
      <div className="bg-streaks" />
      <div className="bubbles">
        {bubbles.map((b, i) => (
          <span
            key={i}
            className="bubble"
            style={{
              left: b.l,
              width: b.s,
              height: b.s,
              animationDuration: `${b.d}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  const cols: { title: string; links: [string, string][] }[] = [
    {
      title: "Product",
      links: [
        ["/send", "Send money"],
        ["/drop", "Group drop"],
        ["/links", "My links"],
        ["/proof", "Live proof"],
      ],
    },
    {
      title: "Learn",
      links: [
        ["/how-it-works", "How it works"],
        ["/faq", "FAQ"],
        ["/docs", "Developer docs"],
        ["/blog", "Blog"],
      ],
    },
    {
      title: "More",
      links: [
        ["/roadmap", "Roadmap"],
        ["/brand-kit", "Brand kit"],
        ["/report", "Report a problem"],
      ],
    },
  ];
  return (
    <div className="site-links">
      <div className="footer">
        <div className="footer-brand">
          <Link href="/" className="brand">
            <DropMark />
            <span>Damla</span>
          </Link>
          <p className="footer-tag">
            Send money like a drop of water. One link, claimed with no wallet and no gas, on Monad.
          </p>
        </div>
        {cols.map((c) => (
          <div className="footer-col" key={c.title}>
            <h4>{c.title}</h4>
            {c.links.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
        ))}
        <div className="footer-bottom">
          <span>© 2026 Damla · built on Monad</span>
          <a href="https://github.com/mericcintosun/damla" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="topbar">
      <Link href="/" className="brand">
        <DropMark />
        <span>Damla</span>
      </Link>
      {right ?? (
        <nav className="nav">
          <Link href="/send">Send</Link>
          <Link href="/drop">Drop</Link>
          <Link href="/links">My links</Link>
        </nav>
      )}
    </div>
  );
}
