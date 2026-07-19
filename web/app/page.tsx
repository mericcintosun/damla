import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/Brand";
import { CONTRACT } from "@/lib/contract";
import { addrUrl } from "@/lib/chain";

export default function Home() {
  return (
    <div className="wrap">
      <TopBar />

      <section className="hero">
        <span className="eyebrow">
          <span className="dot" /> Walletless &amp; gasless claim · Monad
        </span>
        <h1>
          Send money by a link.
          <br />
          <span className="grad">They just tap it.</span>
        </h1>
        <p className="lead">
          Lock some MON behind a one-time link and share it anywhere. Whoever opens it gets the
          money — <b>no wallet to install, no gas to buy, nothing to sign up for.</b>
        </p>

        <div className="hero-visual">
          <Image
            className="hero-mascot"
            src="/art/mascot-wave-cut.webp"
            alt="Damla mascot waving"
            width={300}
            height={330}
            priority
          />
        </div>

        <div className="steps">
          <div className="step">
            <div className="n">1</div>
            <div className="t">
              <b>You lock the money.</b>{" "}
              <span>Pick an amount, get a link. One transaction from your wallet.</span>
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

        <Link href="/send" className="btn">
          Create a money link →
        </Link>
        <div className="mt-s">
          <Link href="/drop" className="btn ghost">
            Or drop to a group — first N people split it
          </Link>
        </div>
        <div className="cta-row">
          <Link href="/how-it-works" className="ghost-link">
            How it works
          </Link>
          <span className="sep">·</span>
          <Link href="/faq" className="ghost-link">
            Why connect a wallet to send?
          </Link>
        </div>
      </section>

      <div className="foot">
        <span>Native MON · Monad Testnet</span>
        <a href={addrUrl(CONTRACT)} target="_blank" rel="noreferrer" className="mono">
          Contract ↗
        </a>
      </div>
    </div>
  );
}
