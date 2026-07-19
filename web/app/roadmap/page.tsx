import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/Brand";
import "./roadmap.css";

export const metadata: Metadata = {
  title: "Roadmap · Damla",
  description:
    "What Damla shipped during the hackathon, what comes right after (mainnet, tokens), and the longer vision for sending onchain money by a link.",
};

export default function Roadmap() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <span className="eyebrow">
          <span className="dot" /> Roadmap
        </span>
        <div className="prose">
          <h2>Where Damla is headed</h2>
          <p>
            Damla sends money by a link. You lock some MON, share the link, and whoever opens it
            claims the money with no wallet to install and no gas to buy. Here is what already works,
            what we are building next, and where we want to take it.
          </p>
        </div>

        <div className="divider" />

        <section className="rm-phase is-shipped">
          <div className="rm-phase-head">
            <h3>Shipped</h3>
            <span className="rm-tag shipped">
              <span className="dot" /> Live now
            </span>
          </div>
          <p className="rm-sub">Built during the hackathon and running on Monad today.</p>
          <ul className="rm-list">
            <li>
              <b>Send money by a link.</b>{" "}
              <span>Lock an amount, get a one-time link, share it anywhere.</span>
            </li>
            <li>
              <b>Walletless and gasless claim.</b>{" "}
              <span>
                The recipient needs nothing. A trustless relayer pays the gas and can never redirect
                a single wei.
              </span>
            </li>
            <li>
              <b>Sponsored demo.</b>{" "}
              <span>
                People with no wallet can try the whole flow, so you can hand the link to anyone and
                it just works.
              </span>
            </li>
            <li>
              <b>Group drops.</b>{" "}
              <span>One link, first N people split it. Good for communities, events, and tips.</span>
            </li>
            <li>
              <b>My Links dashboard.</b>{" "}
              <span>See every link you made and reclaim anything that goes unclaimed.</span>
            </li>
            <li>
              <b>QR codes and private notes.</b>{" "}
              <span>Print or show a code to claim in person, and add a note only the sender keeps.</span>
            </li>
            <li>
              <b>Live on Monad mainnet.</b>{" "}
              <span>Two contracts deployed and verified on mainnet, one for single links and one for group drops. Links move real MON.</span>
            </li>
          </ul>
        </section>

        <section className="rm-phase is-next">
          <div className="rm-phase-head">
            <h3>Next</h3>
            <span className="rm-tag next">
              <span className="dot" /> Right after the hackathon
            </span>
          </div>
          <p className="rm-sub">The short list we start on the moment judging is done.</p>
          <ul className="rm-list">
            <li>
              <b>Stablecoins and tokens.</b>{" "}
              <span>Send more than native MON, so a link can carry the asset people actually want.</span>
            </li>
            <li>
              <b>Claim-to-existing-wallet polish.</b>{" "}
              <span>
                Smoother path for people who already have a wallet and want the money to land there.
              </span>
            </li>
            <li>
              <b>Link expiry reminders.</b>{" "}
              <span>
                A nudge before a link expires so senders reclaim in time and nothing sits idle.
              </span>
            </li>
          </ul>
        </section>

        <section className="rm-phase is-later">
          <div className="rm-phase-head">
            <h3>Later</h3>
            <span className="rm-tag">The vision</span>
          </div>
          <p className="rm-sub">Bigger bets once the core is solid on mainnet.</p>
          <ul className="rm-list">
            <li>
              <b>Batch drops for creators and communities.</b>{" "}
              <span>Fund many links at once and hand out money at scale.</span>
            </li>
            <li>
              <b>A hosted relayer as a public good.</b>{" "}
              <span>
                Rate limits and abuse protection built in, so other apps can offer gasless claims
                without running their own.
              </span>
            </li>
            <li>
              <b>Optional social recovery.</b>{" "}
              <span>A way to recover the in-browser wallet if someone wants to keep using it.</span>
            </li>
            <li>
              <b>Embeddable claim widget.</b>{" "}
              <span>Drop a small widget on any site so it can hand out onchain money by link.</span>
            </li>
          </ul>
        </section>

        <div className="divider" />

        <p className="note">
          Honest note: Damla is a hackathon build, already live on Monad mainnet. Everything under
          Shipped works today with real MON. The rest is where we want to go, not a promise of dates.
        </p>

        <div className="mt">
          <Link href="/send" className="btn">
            Try it now →
          </Link>
        </div>
      </div>

      <div className="foot">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq" className="mono">
          Questions ↗
        </Link>
      </div>
    </div>
  );
}
