import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/Brand";

export const metadata: Metadata = {
  title: "FAQ · Damla",
  description:
    "Common questions about Damla: who needs a wallet, what walletless and gasless mean, expiry and reclaim, and safety.",
};

export default function Faq() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <span className="eyebrow">
          <span className="dot" /> Questions
        </span>
        <div className="prose">
          <h2>Straight answers</h2>

          <p className="q">If it is walletless, why do I connect a wallet to send?</p>
          <p>
            Because <b>walletless is about the person receiving</b>, not the person paying. You can
            only give away money you already hold, so the <b>sender</b> spends from a wallet. The{" "}
            <b>recipient</b> connects nothing: they tap the link, a throwaway wallet is made for them
            in the browser, and a relayer pays the gas. If you have no wallet and just want to feel
            the flow, the <Link href="/send">send page</Link> has a sponsored demo that funds a
            throwaway wallet for you.
          </p>

          <p className="q">What does &quot;gasless&quot; mean here?</p>
          <p>
            The recipient pays no gas. Normally you need the network&apos;s gas token just to receive
            a transfer. Damla&apos;s relayer submits the claim and covers that cost, so the person
            receiving needs zero balance to start.
          </p>

          <p className="q">Can the relayer or Damla take my money?</p>
          <p>
            No. The money is escrowed by a contract that will only pay the address signed by the
            link key. The relayer decides when to submit, never where funds go. Read the exact
            mechanism on <Link href="/how-it-works">How it works</Link>.
          </p>

          <p className="q">What if the recipient never claims?</p>
          <p>
            Each link has a 24-hour expiry. After it passes, you reclaim the money back to your
            wallet from <Link href="/links">My links</Link>. Funds are never trapped.
          </p>

          <p className="q">Is the secret safe in a link?</p>
          <p>
            The secret lives in the URL fragment (after the <span className="mono">#</span>), which
            browsers do not send to servers. Treat the link like cash: whoever holds it can claim
            it, so share it over a private channel.
          </p>

          <p className="q">Which network is this?</p>
          <p>
            Monad mainnet (chainId 143), with real MON. That is exactly why the amounts here are
            kept tiny, it is real money moving on-chain, not a toy.
          </p>

          <div className="mt">
            <Link href="/send" className="btn">
              Create a money link →
            </Link>
          </div>
        </div>
      </div>

      <div className="foot">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
