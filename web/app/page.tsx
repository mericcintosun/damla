import Link from "next/link";
import Image from "next/image";
import { TopBar, SiteFooter } from "@/components/Brand";

export default function Home() {
  return (
    <div className="wrap">
      <TopBar />

      <section className="hero">
        <div className="hero-visual reveal">
          <Image
            className="hero-mascot"
            src="/art/mascot-wave-cut.webp"
            alt="Damla mascot waving"
            width={300}
            height={330}
            priority
          />
        </div>

        <h1 className="reveal reveal-1">
          Send money like
          <br />
          <span className="grad">a drop of water.</span>
        </h1>
        <p className="lead reveal reveal-2">
          Lock a little MON behind a one-time link and share it anywhere. Whoever opens it keeps the
          money, with <b>no wallet to install, no gas to buy, and nothing to sign up for.</b>
        </p>

        <div className="hero-actions reveal reveal-3">
          <Link href="/send" className="btn">
            Send money by a link →
          </Link>
          <Link href="/drop" className="btn ghost">
            Drop to a group
          </Link>
        </div>

        <div className="pillrow reveal reveal-3">
          <span className="pill-stat">No wallet</span>
          <span className="pill-stat">No gas</span>
          <span className="pill-stat">No signup</span>
        </div>

        <div className="steps reveal reveal-4">
          <div className="step">
            <div className="n">1</div>
            <div className="t">
              <b>You lock the money.</b>{" "}
              <span>Pick an amount, get a link. One transaction, or none at all with the instant wallet.</span>
            </div>
          </div>
          <div className="step">
            <div className="n">2</div>
            <div className="t">
              <b>They tap the link.</b>{" "}
              <span>A relayer covers the gas, so they need nothing to receive.</span>
            </div>
          </div>
          <div className="step">
            <div className="n">3</div>
            <div className="t">
              <b>Safe by design.</b>{" "}
              <span>The relayer pays gas but can never redirect a single wei.</span>
            </div>
          </div>
        </div>

        <div className="cta-row reveal reveal-4">
          <Link href="/how-it-works" className="ghost-link">
            How it works
          </Link>
          <span className="sep">·</span>
          <Link href="/proof" className="ghost-link">
            See live on-chain proof
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
