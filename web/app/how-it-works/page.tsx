import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/Brand";
import { CONTRACT } from "@/lib/contract";
import { addrUrl } from "@/lib/chain";

export const metadata: Metadata = {
  title: "How it works — Damla",
  description:
    "How Damla sends money by a link: an ephemeral key in the URL fragment, a relayer that pays gas, and a contract that can only pay the signed recipient.",
};

export default function HowItWorks() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <span className="eyebrow">
          <span className="dot" /> Under the hood
        </span>
        <div className="prose">
          <h2>How Damla works</h2>
          <p>
            A Damla link carries a fresh, single-use key. The money is locked to that key&apos;s
            address on-chain, and the key itself travels only inside the link. Here is the whole
            path.
          </p>

          <div className="flow">
            <div className="step">
              <div className="n">1</div>
              <div className="t">
                <b>A one-time key is born in your browser.</b>{" "}
                <span>
                  Its address becomes the link id; its secret goes into the part of the URL after the{" "}
                  <span className="mono">#</span> — the fragment, which browsers never send to any
                  server.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="n">2</div>
              <div className="t">
                <b>You lock the MON.</b>{" "}
                <span>
                  One <span className="mono">deposit</span> call escrows your amount against that
                  link address, with an expiry so nothing can ever be stuck.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="n">3</div>
              <div className="t">
                <b>They open the link.</b>{" "}
                <span>
                  The page reads the secret from the fragment and signs a message: &quot;pay this
                  drop to my address.&quot; A throwaway wallet is created for them right there.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="n">4</div>
              <div className="t">
                <b>A relayer submits it and pays the gas.</b>{" "}
                <span>
                  The relayer holds a small funded key. It calls <span className="mono">claim</span>{" "}
                  so the recipient never needs a gas token.
                </span>
              </div>
            </div>
            <div className="step">
              <div className="n">5</div>
              <div className="t">
                <b>The contract pays only the signed address.</b>{" "}
                <span>
                  It recovers the signer from the message and releases the money to the address that
                  signature named — and no other.
                </span>
              </div>
            </div>
          </div>

          <h3>Why the relayer cannot steal</h3>
          <p>
            The relayer chooses <b>when</b> a claim happens, never <b>where</b> the money goes. The
            payout address is fixed inside a signature made by the link key, which the relayer never
            holds. Change the payout by one character and the signature no longer recovers to the
            link address, so the contract reverts. Even a fully compromised relayer key cannot
            redirect a single wei — it can only waste its own gas.
          </p>

          <h3>Why nothing gets stuck</h3>
          <p>
            Every drop has an expiry. If no one claims in time, the original sender calls{" "}
            <span className="mono">reclaim</span> and the money returns to them. You can do this from{" "}
            <Link href="/links">My links</Link>.
          </p>

          <div className="mt">
            <Link href="/send" className="btn">
              Try it — create a link →
            </Link>
          </div>
        </div>
      </div>

      <div className="foot">
        <Link href="/faq">Common questions</Link>
        <a href={addrUrl(CONTRACT)} target="_blank" rel="noreferrer" className="mono">
          Contract ↗
        </a>
      </div>
    </div>
  );
}
