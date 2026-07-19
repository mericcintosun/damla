"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatEther, isAddress, getAddress, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { TopBar } from "@/components/Brand";
import { EXPLORER, txUrl, addrUrl } from "@/lib/chain";
import { DROP_CONTRACT, DROP_ABI } from "@/lib/contract";
import { publicClient, signClaim, shortAddr, parseFragment } from "@/lib/damla";

type Pool = {
  sender: `0x${string}`;
  amountPerClaim: bigint;
  remaining: bigint;
  slots: number;
  claimed: number;
  expiry: bigint;
};
type Phase = "loading" | "invalid" | "empty" | "gone" | "ready" | "claiming" | "done";

export default function DropClaimPage() {
  const params = useParams<{ linkAddr: string }>();
  const linkAddr = (params?.linkAddr ?? "") as string;

  const [secret, setSecret] = useState<Hex | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [payout, setPayout] = useState<`0x${string}` | null>(null);
  const [payoutBalance, setPayoutBalance] = useState<bigint | null>(null);

  const loadPool = useCallback(async () => {
    try {
      const r = (await publicClient.readContract({
        address: DROP_CONTRACT,
        abi: DROP_ABI,
        functionName: "getPool",
        args: [getAddress(linkAddr)],
      })) as readonly [`0x${string}`, bigint, bigint, number, number, bigint];
      const p: Pool = {
        sender: r[0],
        amountPerClaim: r[1],
        remaining: r[2],
        slots: Number(r[3]),
        claimed: Number(r[4]),
        expiry: r[5],
      };
      setPool(p);
      if (p.sender === "0x0000000000000000000000000000000000000000") setPhase("empty");
      else if (p.claimed >= p.slots) setPhase("gone");
      else setPhase("ready");
    } catch {
      setError("Could not read this drop from the chain. Try reloading.");
      setPhase("empty");
    }
  }, [linkAddr]);

  useEffect(() => {
    if (!isAddress(linkAddr)) {
      setPhase("invalid");
      return;
    }
    const { secret: frag } = parseFragment(window.location.hash);
    if (!frag) {
      setPhase("invalid");
      return;
    }
    try {
      if (privateKeyToAccount(frag).address.toLowerCase() !== linkAddr.toLowerCase()) {
        setPhase("invalid");
        return;
      }
      setSecret(frag);
    } catch {
      setPhase("invalid");
      return;
    }
    loadPool();
  }, [linkAddr, loadPool]);

  async function claim() {
    if (!secret) return;
    setError(null);
    setPhase("claiming");
    try {
      // Walletless: one burner per drop link, stored so a re-open shows the same received share.
      const key = `damla_drop_burner_${linkAddr.toLowerCase()}`;
      let burner = localStorage.getItem(key) as Hex | null;
      if (!burner) {
        burner = generatePrivateKey();
        localStorage.setItem(key, burner);
      }
      const payoutAddr = privateKeyToAccount(burner).address;

      const sig = await signClaim(secret, getAddress(linkAddr), payoutAddr, DROP_CONTRACT);
      const resp = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dropclaim", linkAddr: getAddress(linkAddr), payout: payoutAddr, sig }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "The relayer could not submit the claim.");

      await publicClient.waitForTransactionReceipt({ hash: data.hash });
      const bal = await publicClient.getBalance({ address: payoutAddr });
      setPayout(payoutAddr);
      setPayoutBalance(bal);
      setTxHash(data.hash);
      await loadPool();
      setPhase("done");
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Claim failed.";
      setError(msg.length > 180 ? msg.slice(0, 180) + "…" : msg);
      // refresh state; if fully claimed now, reflect that
      await loadPool();
      setPhase((prev) => (prev === "claiming" ? "ready" : prev));
    }
  }

  const pct = pool ? Math.min(100, Math.round((pool.claimed / pool.slots) * 100)) : 0;

  return (
    <div className="wrap">
      <TopBar />

      {phase === "loading" && (
        <div className="card center">
          <div className="spinner big" />
          <p className="note mt">Reading the drop from Monad…</p>
        </div>
      )}

      {phase === "invalid" && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>This drop link is not valid</h2>
          <p className="note mt">Ask for the full link again, the part after the # matters.</p>
        </div>
      )}

      {phase === "empty" && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>Nothing here</h2>
          <p className="note mt">{error ?? "This link has no drop."}</p>
        </div>
      )}

      {phase === "gone" && pool && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>Every share is gone</h2>
          <p className="note mt">
            All {pool.slots} shares of this drop have been claimed. You were a moment too late.
          </p>
          <div className="mt">
            <Link href="/drop" className="btn ghost">
              Start your own drop
            </Link>
          </div>
        </div>
      )}

      {(phase === "ready" || phase === "claiming") && pool && (
        <div className="card center">
          <div className="big-amount mt">
            {formatEther(pool.amountPerClaim)}
            <span className="u">MON</span>
          </div>
          <p className="note">for you, from <span className="mono">{shortAddr(pool.sender)}</span></p>

          <div className="progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-legend">
              <span>
                <b>{pool.claimed}</b> of {pool.slots} claimed
              </span>
              <span>
                <b>{pool.slots - pool.claimed}</b> shares left
              </span>
            </div>
          </div>

          <div className="mt">
            <button className="btn" onClick={claim} disabled={phase === "claiming"}>
              {phase === "claiming" ? (
                <>
                  <span className="spinner" /> Claiming your share…
                </>
              ) : (
                <>Claim my share, no wallet needed</>
              )}
            </button>
          </div>
          <p className="hint">
            Gas is on us, and your share can only be paid to your address, the relayer cannot take
            it.
          </p>
          {error && <div className="status err">{error}</div>}
        </div>
      )}

      {phase === "done" && pool && (
        <div className="card center">
          <div className="hero-visual">
            <Image className="mascot" src="/art/mascot-thumbsup-cut.webp" alt="Damla mascot celebrating" width={240} height={260} />
          </div>
          <h2 style={{ fontSize: 24, letterSpacing: "-0.02em" }}>Share claimed 🎉</h2>
          <div className="big-amount mt-s">
            {formatEther(pool.amountPerClaim)}
            <span className="u">MON</span>
          </div>
          <p className="note">
            landed in{" "}
            <a className="link-accent mono" href={payout ? addrUrl(payout) : "#"} target="_blank" rel="noreferrer">
              {shortAddr(payout ?? "")}
            </a>
          </p>

          <div className="progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-legend">
              <span>
                <b>{pool.claimed}</b> of {pool.slots} claimed
              </span>
              <span>
                <b>{pool.slots - pool.claimed}</b> left
              </span>
            </div>
          </div>

          <div className="card mt" style={{ padding: 16, textAlign: "left" }}>
            <div className="row">
              <span className="k">Your balance</span>
              <span className="v">{payoutBalance !== null ? formatEther(payoutBalance) : "…"} MON</span>
            </div>
            {txHash && (
              <div className="row">
                <span className="k">Transaction</span>
                <a className="v link-accent mono" href={txUrl(txHash)} target="_blank" rel="noreferrer">
                  {shortAddr(txHash)} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="foot">
        <Link href="/drop">Start a drop</Link>
        <a href={`${EXPLORER}/address/${DROP_CONTRACT}`} target="_blank" rel="noreferrer" className="mono">
          Contract ↗
        </a>
      </div>
    </div>
  );
}
