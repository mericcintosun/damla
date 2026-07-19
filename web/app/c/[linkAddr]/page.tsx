"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { formatEther, isAddress, getAddress, type Hex } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { TopBar } from "@/components/Brand";
import { EXPLORER, txUrl, addrUrl } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI } from "@/lib/contract";
import { publicClient, signClaim, shortAddr, parseFragment } from "@/lib/damla";

type Drop = {
  sender: `0x${string}`;
  amount: bigint;
  expiry: bigint;
  claimed: boolean;
};

type Phase = "loading" | "invalid" | "empty" | "claimed" | "ready" | "claiming" | "done";

export default function ClaimPage() {
  const params = useParams<{ linkAddr: string }>();
  const linkAddr = (params?.linkAddr ?? "") as string;

  const [secret, setSecret] = useState<Hex | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [payout, setPayout] = useState<`0x${string}` | null>(null);
  const [payoutBalance, setPayoutBalance] = useState<bigint | null>(null);

  const loadDrop = useCallback(async () => {
    try {
      const res = (await publicClient.readContract({
        address: CONTRACT,
        abi: DAMLA_ABI,
        functionName: "getDrop",
        args: [getAddress(linkAddr)],
      })) as readonly [`0x${string}`, bigint, bigint, boolean];

      const d: Drop = { sender: res[0], amount: res[1], expiry: res[2], claimed: res[3] };
      setDrop(d);
      if (d.sender === "0x0000000000000000000000000000000000000000") setPhase("empty");
      else if (d.claimed) setPhase("claimed");
      else setPhase("ready");
    } catch {
      setError("Could not read this link from the chain. Try reloading.");
      setPhase("empty");
    }
  }, [linkAddr]);

  useEffect(() => {
    if (!isAddress(linkAddr)) {
      setPhase("invalid");
      return;
    }
    // The secret (and optional note) live ONLY in the URL fragment and never leave the browser.
    const { secret: frag, note: fragNote } = parseFragment(window.location.hash);
    if (!frag) {
      setPhase("invalid");
      return;
    }
    try {
      const acc = privateKeyToAccount(frag);
      if (acc.address.toLowerCase() !== linkAddr.toLowerCase()) {
        setPhase("invalid");
        return;
      }
      setSecret(frag);
      setNote(fragNote);
    } catch {
      setPhase("invalid");
      return;
    }
    loadDrop();
  }, [linkAddr, loadDrop]);

  async function claim(toConnectedWallet: boolean) {
    if (!secret) return;
    setError(null);
    setPhase("claiming");
    try {
      let payoutAddr: `0x${string}`;

      if (toConnectedWallet) {
        const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<unknown> } }).ethereum;
        if (!eth) throw new Error("No wallet found in this browser.");
        const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        payoutAddr = getAddress(accs[0]);
      } else {
        // Walletless: mint a fresh in-browser burner and pay into it. Labeled honestly as a demo burner.
        const key = `damla_burner_${linkAddr.toLowerCase()}`;
        let burner = localStorage.getItem(key) as Hex | null;
        if (!burner) {
          burner = generatePrivateKey();
          localStorage.setItem(key, burner);
        }
        payoutAddr = privateKeyToAccount(burner).address;
      }

      const sig = await signClaim(secret, getAddress(linkAddr), payoutAddr);

      const resp = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", linkAddr: getAddress(linkAddr), payout: payoutAddr, sig }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "The relayer could not submit the claim.");

      await publicClient.waitForTransactionReceipt({ hash: data.hash });
      const bal = await publicClient.getBalance({ address: payoutAddr });

      setPayout(payoutAddr);
      setPayoutBalance(bal);
      setTxHash(data.hash);
      setPhase("done");
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "Claim failed.";
      setError(msg.length > 180 ? msg.slice(0, 180) + "…" : msg);
      setPhase("ready");
    }
  }

  return (
    <div className="wrap">
      <TopBar />

      {phase === "loading" && (
        <div className="card center">
          <div className="spinner big" />
          <p className="note mt">Reading your money link from Monad…</p>
        </div>
      )}

      {phase === "invalid" && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>This link is not valid</h2>
          <p className="note mt">
            The secret in the link is missing or does not match. Ask the sender to share the full
            link again — the part after the <span className="mono">#</span> matters.
          </p>
        </div>
      )}

      {phase === "empty" && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>Nothing here</h2>
          <p className="note mt">
            {error ?? "This link has no drop, or it was already emptied and reclaimed."}
          </p>
        </div>
      )}

      {phase === "claimed" && drop && (
        <div className="card center">
          <h2 style={{ fontSize: 22 }}>Already claimed</h2>
          <p className="note mt">
            The {formatEther(drop.amount)} MON behind this link has already been received.
          </p>
        </div>
      )}

      {(phase === "ready" || phase === "claiming") && drop && (
        <div className="card center">
          <span className="eyebrow" style={{ justifyContent: "center", display: "flex" }}>
            <span className="dot" /> Someone sent you money
          </span>
          <div className="big-amount mt">
            {formatEther(drop.amount)}
            <span className="u">MON</span>
          </div>
          <p className="note">
            from <span className="mono">{shortAddr(drop.sender)}</span>
          </p>

          {note && (
            <div className="memo">
              <div className="memo-k">Note</div>
              <div className="memo-v">{note}</div>
            </div>
          )}

          <div className="mt">
            <button className="btn" onClick={() => claim(false)} disabled={phase === "claiming"}>
              {phase === "claiming" ? (
                <>
                  <span className="spinner" /> Claiming…
                </>
              ) : (
                <>Claim it — no wallet needed</>
              )}
            </button>
          </div>
          <div className="mt-s">
            <button className="btn ghost" onClick={() => claim(true)} disabled={phase === "claiming"}>
              Receive into my own wallet instead
            </button>
          </div>

          <p className="hint">
            The gas is paid for you. The money can only ever go to your address — not even the
            relayer can redirect it.
          </p>
          {error && <div className="status err">{error}</div>}
        </div>
      )}

      {phase === "done" && drop && (
        <div className="card center">
          <div className="hero-visual">
            <Image
              className="mascot"
              src="/art/mascot-thumbsup-cut.webp"
              alt="Damla mascot celebrating"
              width={240}
              height={260}
            />
          </div>
          <h2 style={{ fontSize: 24, letterSpacing: "-0.02em" }}>It is yours 🎉</h2>
          <div className="big-amount mt-s">
            {formatEther(drop.amount)}
            <span className="u">MON</span>
          </div>
          <p className="note">
            landed in{" "}
            <a className="link-accent mono" href={payout ? addrUrl(payout) : "#"} target="_blank" rel="noreferrer">
              {shortAddr(payout ?? "")}
            </a>
          </p>

          <div className="card mt" style={{ padding: 16, textAlign: "left" }}>
            <div className="row">
              <span className="k">New balance</span>
              <span className="v">
                {payoutBalance !== null ? formatEther(payoutBalance) : "…"} MON
              </span>
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
          <p className="hint">
            This wallet was created for you in this browser. Keep this device to hold or spend the
            money.
          </p>
        </div>
      )}

      <div className="foot">
        <span>Gasless claim via relayer</span>
        <a href={`${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer" className="mono">
          Contract ↗
        </a>
      </div>
    </div>
  );
}
