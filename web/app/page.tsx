import Link from "next/link";
import Image from "next/image";
import { TopBar, SiteFooter } from "@/components/Brand";

export default function Home() {
  return (
    <div className="wrap">
      <TopBar />

      <section className="hero">
        <span className="eyebrow reveal">
          <span className="dot" /> Walletless and gasless claim · Monad
        </span>
        <h1 className="reveal reveal-1">
          Send money like
          <br />
          <span className="grad">a drop of water.</span>
        </h1>
        <p className="lead reveal reveal-2">
          Damla means a drop. The Monad faucet gives you drops of MON, and Damla lets you pass one to
          anyone with nothing but a link. They tap it and the money is <b>theirs</b>, with no wallet
          to install, no gas to buy, and nothing to sign up for.
        </p>

        <div className="hero-visual reveal reveal-2">
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
          <div className="step reveal reveal-1">
            <div className="n">1</div>
            <div className="t">
              <b>You lock the money.</b>{" "}
              <span>Pick an amount, get a link. One transaction from your wallet.</span>
            </div>
          </div>
          <div className="step reveal reveal-2">
            <div className="n">2</div>
            <div className="t">
              <b>They tap the link.</b>{" "}
              <span>A relayer covers the gas, so they need nothing to receive.</span>
            </div>
          </div>
          <div className="step reveal reveal-3">
            <div className="n">3</div>
            <div className="t">
              <b>Safe by design.</b>{" "}
              <span>The relayer pays gas but can never redirect a single wei.</span>
            </div>
          </div>
        </div>

        <Link href="/send" className="btn reveal reveal-3">
          Create a money link →
        </Link>
        <div className="mt-s reveal reveal-4">
          <Link href="/drop" className="btn ghost">
            Or drop to a group, first N people split it
          </Link>
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
