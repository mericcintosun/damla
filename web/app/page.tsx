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
          <span className="dot" /> Walletless · Gasless
        </span>
        <h1>
          Send money by a link.
          <br />
          <span className="grad">They just tap it.</span>
        </h1>
        <p className="lead">
          Lock some MON behind a one-time link and share it anywhere. The person you send it
          to opens the link and the money is <b>theirs</b> — no wallet to install, no gas to
          buy, nothing to sign up for.
        </p>

        <div className="hero-art">
          <Image src="/art/il-abstract.webp" alt="" fill sizes="560px" priority />
        </div>

        <div className="steps">
          <div className="step">
            <div className="n">1</div>
            <div className="t">
              <b>You lock the money.</b> <span>Pick an amount, get a link. One transaction.</span>
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
              <b>It is safe by design.</b>{" "}
              <span>The relayer pays gas but can never redirect a single wei.</span>
            </div>
          </div>
        </div>

        <Link href="/send" className="btn">
          Create a money link →
        </Link>
        <p className="hint">
          Unclaimed after the expiry window? The money returns to you. Nothing is ever stuck.
        </p>
      </section>

      <div className="foot">
        <span>Native MON on Monad Testnet</span>
        <a href={addrUrl(CONTRACT)} target="_blank" rel="noreferrer" className="mono">
          Contract ↗
        </a>
      </div>
    </div>
  );
}
