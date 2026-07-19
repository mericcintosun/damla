"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAddress } from "viem";
import { TopBar, SiteFooter } from "@/components/Brand";
import { CHAIN_ID, RPC_URL, EXPLORER, txUrl, addrUrl } from "@/lib/chain";
import { GIFT_CONTRACT, GIFT_ABI } from "@/lib/contract";
import { publicClient, shortAddr } from "@/lib/damla";
import { numberToHex } from "viem";

const GIFT_MON = "0.6";
const SITE = "https://getdamla.vercel.app";

type EthProvider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const getInjected = () =>
  typeof window === "undefined" ? null : ((window as unknown as { ethereum?: EthProvider }).ethereum ?? null);

type Phase = "idle" | "claiming" | "done" | "sold" | "already";

export default function GiftPage() {
  const [claimed, setClaimed] = useState<number | null>(null);
  const [max, setMax] = useState<number>(20);
  const [phase, setPhase] = useState<Phase>("idle");
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([
        publicClient.readContract({ address: GIFT_CONTRACT, abi: GIFT_ABI, functionName: "claimedCount" }),
        publicClient.readContract({ address: GIFT_CONTRACT, abi: GIFT_ABI, functionName: "MAX" }),
      ]);
      setClaimed(Number(c));
      setMax(Number(m));
    } catch {
      /* keep prior */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  async function claimGift() {
    setError(null);
    const eth = getInjected();
    if (!eth) {
      setError("Connect a wallet to receive the gift. The gift lands in your own wallet so you can transact.");
      return;
    }
    setPhase("claiming");
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = getAddress(accs[0]);
      setAccount(addr);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(CHAIN_ID) }] });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: numberToHex(CHAIN_ID),
            chainName: "Monad",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER],
          }],
        });
      }

      // Guard client-side for a clean message before spending relayer gas.
      const already = (await publicClient.readContract({ address: GIFT_CONTRACT, abi: GIFT_ABI, functionName: "claimed", args: [addr] })) as boolean;
      if (already) {
        setPhase("already");
        return;
      }

      const resp = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gift", to: addr }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (/already/i.test(data?.error ?? "")) { setPhase("already"); return; }
        if (/20 welcome gifts/i.test(data?.error ?? "")) { setPhase("sold"); await refresh(); return; }
        throw new Error(data?.error ?? "Could not send the gift.");
      }
      await publicClient.waitForTransactionReceipt({ hash: data.hash });
      setTxHash(data.hash);
      setPhase("done");
      await refresh();
    } catch (e) {
      const anyE = e as { code?: number; shortMessage?: string; message?: string };
      if (anyE?.code === 4001) setError("Request rejected in the wallet.");
      else setError((anyE?.shortMessage ?? anyE?.message ?? "Something went wrong.").slice(0, 160));
      setPhase("idle");
    }
  }

  const remaining = claimed === null ? null : Math.max(0, max - claimed);
  const pct = claimed === null ? 0 : Math.min(100, Math.round((claimed / max) * 100));
  const soldOut = remaining === 0;

  const shareText = `I just got ${GIFT_MON} MON as a welcome gift from @damla_monad. Damla lets you send money by a link on Monad, and the person you send to needs no wallet and no gas to receive it. Try it: ${SITE}`;
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  function copyShare() {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="wrap">
      <TopBar />

      <div className="card">
        <div className="hero-visual">
          <Image className="mascot" src="/art/mascot-thumbsup-cut.webp" alt="Damla mascot" width={200} height={220} />
        </div>

        {phase === "done" ? (
          <>
            <h2 className="card-h tc">Your gift landed 🎉</h2>
            <div className="big-amount mt-s">
              {GIFT_MON}
              <span className="u">MON</span>
            </div>
            <p className="note tc">
              is now in{" "}
              <a className="link-accent mono" href={account ? addrUrl(account) : "#"} target="_blank" rel="noreferrer">
                {shortAddr(account ?? "")}
              </a>
              . Spend it however you like on Monad.
            </p>
            {txHash && (
              <p className="hint">
                <a className="link-accent" href={txUrl(txHash)} target="_blank" rel="noreferrer">
                  View the gift transaction ↗
                </a>
              </p>
            )}

            <div className="divider" />
            <p className="note" style={{ textAlign: "left" }}>
              If it made your day, tell people. Here is a post ready to go.
            </p>
            <div className="share-box">{shareText}</div>
            <div className="mt">
              <a className="btn" href={tweet} target="_blank" rel="noreferrer">
                Post on X
              </a>
            </div>
            <div className="mt-s">
              <button className="btn ghost" onClick={copyShare}>
                {copied ? "Copied" : "Copy the post"}
              </button>
            </div>
            <p className="hint">
              Now try it yourself, <Link className="link-accent" href="/send">send money by a link →</Link>
            </p>
          </>
        ) : phase === "already" ? (
          <>
            <h2 className="card-h tc">You already have your gift</h2>
            <p className="note tc">
              This wallet has already claimed its welcome gift. Put it to use and send some money by a
              link.
            </p>
            <div className="mt">
              <Link className="btn" href="/send">
                Send money by a link →
              </Link>
            </div>
          </>
        ) : soldOut ? (
          <>
            <h2 className="card-h tc">All gifts are claimed</h2>
            <p className="note tc">
              All {max} welcome gifts are gone. You can still use Damla with your own wallet or the
              free instant wallet, no gift needed.
            </p>
            <div className="mt">
              <Link className="btn" href="/send">
                Send money by a link →
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="card-h tc">A welcome gift, on us</h2>
            <p className="note tc">
              You showed up early. We put <b>{GIFT_MON} MON</b> aside for each of the first {max}
              people so you can transact on Monad without buying anything first. It lands straight in
              your wallet, and it is yours to spend however you like.
            </p>

            <div className="gift-counter mt">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-legend">
                <span>
                  <b>{claimed ?? "…"}</b> of {max} gifts claimed
                </span>
                <span>
                  <b>{remaining ?? "…"}</b> left
                </span>
              </div>
            </div>

            <div className="mt">
              <button className="btn" onClick={claimGift} disabled={phase === "claiming"}>
                {phase === "claiming" ? (
                  <>
                    <span className="spinner" /> Sending your gift…
                  </>
                ) : (
                  <>Claim your {GIFT_MON} MON gift</>
                )}
              </button>
            </div>
            <p className="hint">
              The gift lands in your own wallet, so connect the wallet you want to use. We cover the
              gas, you keep the MON.
            </p>
            {error && <div className="status err">{error}</div>}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
