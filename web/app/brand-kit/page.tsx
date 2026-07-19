import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { TopBar, DropMark } from "@/components/Brand";

export const metadata: Metadata = {
  title: "Brand kit · Damla",
  description: "The Damla identity: the drop mark, the water palette, the type scale, and the voice.",
};

const SWATCHES = [
  { name: "Ink", hex: "#05080d", note: "page ground" },
  { name: "Panel", hex: "#0e1621", note: "cards" },
  { name: "Line", hex: "#1e2d3d", note: "borders" },
  { name: "Aqua", hex: "#34e2c8", note: "primary accent" },
  { name: "Stream", hex: "#1fb6ff", note: "secondary accent" },
  { name: "Mist", hex: "#7d94a6", note: "muted text" },
  { name: "Foam", hex: "#e8f2f7", note: "text" },
];

export default function BrandKit() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <span className="eyebrow">
          <span className="dot" /> Identity
        </span>
        <h2 className="card-h">The Damla brand kit</h2>
        <p className="note">
          Damla means a drop of water. The Monad faucet hands you drops of MON, and Damla lets you
          pass a drop to anyone with nothing but a link. Everything in the identity comes back to
          that: water, a faucet, a single clean drop.
        </p>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>The mark</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 88, height: 88, borderRadius: 16, border: "1px solid var(--border)", background: "var(--panel)" }}>
            <DropMark size={44} />
          </div>
          <div className="note" style={{ maxWidth: "32ch" }}>
            A single drop with a soft inner curve, filled with the aqua to stream gradient. It reads
            at 16px in a browser tab and at 88px on a landing. Keep clear space of one drop width on
            every side.
          </div>
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>Palette</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
          {SWATCHES.map((s) => (
            <div key={s.hex} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--panel)" }}>
              <div style={{ height: 54, background: s.hex }} />
              <div style={{ padding: "8px 10px" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{s.hex}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>Type</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Send money by a link
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Section heading</div>
          <div className="note" style={{ fontSize: 16 }}>
            Body copy is calm and plain. System sans for the interface, tabular numbers for money, a
            monospace only for addresses and hashes.
          </div>
          <div className="mono" style={{ fontSize: 13, color: "var(--accent)" }}>0x367F…5aE1</div>
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>Assets</h3>
        <p className="note" style={{ marginBottom: 12 }}>
          The rendered set: the drop mark, the faucet that gives the drop, and the deep water grounds
          used behind the interface.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {[
            { src: "/brand/drop-logo.webp", label: "Drop mark" },
            { src: "/brand/drop-glow.webp", label: "Drop, glow" },
            { src: "/brand/faucet.webp", label: "Faucet" },
            { src: "/brand/bg-streaks.webp", label: "Ground, streaks" },
            { src: "/brand/bg-deep.webp", label: "Ground, deep" },
            { src: "/brand/og-cover.webp", label: "Social cover" },
          ].map((a) => (
            <figure key={a.src} style={{ margin: 0, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "#02040a" }}>
              <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
                <Image src={a.src} alt={a.label} fill sizes="160px" style={{ objectFit: "cover" }} />
              </div>
              <figcaption style={{ fontSize: 11.5, color: "var(--muted)", padding: "7px 9px" }}>{a.label}</figcaption>
            </figure>
          ))}
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>Mascot</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Image src="/art/mascot-wave-cut.webp" alt="Damla mascot" width={90} height={100} style={{ height: "auto" }} />
          <div className="note" style={{ maxWidth: "32ch" }}>
            A friendly, rounded character that shows up at the warm moments: a wave on the landing, a
            thumbs up when money lands. It never blocks the action, it celebrates it.
          </div>
        </div>

        <div className="divider" />

        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>Voice</h3>
        <ul className="note" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Plain over clever. Say what happens, then let it happen.</li>
          <li>Name the fear, then remove it. No wallet. No gas. No signup.</li>
          <li>Show real numbers and real links, never a fake success.</li>
          <li>Warm, not loud. Water, not fireworks.</li>
        </ul>
      </div>

      <div className="foot">
        <Link href="/">Home</Link>
        <Link href="/blog">Blog</Link>
      </div>
    </div>
  );
}
