"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createWalletClient,
  custom,
  numberToHex,
  getAddress,
  formatEther,
} from "viem";
import { TopBar } from "@/components/Brand";
import { monadChain, CHAIN_ID, RPC_URL, EXPLORER, txUrl } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI } from "@/lib/contract";
import { publicClient, shortAddr } from "@/lib/damla";
import { loadSent, type SentLink } from "@/lib/history";

type Status = "claimed" | "active" | "expired" | "unknown";
type Row = SentLink & { status: Status; onchainAmount?: bigint };

export default function LinksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAddr, setBusyAddr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const sent = loadSent();
    const now = Math.floor(Date.now() / 1000);
    const enriched = await Promise.all(
      sent.map(async (s): Promise<Row> => {
        try {
          const d = (await publicClient.readContract({
            address: CONTRACT,
            abi: DAMLA_ABI,
            functionName: "getDrop",
            args: [getAddress(s.linkAddr)],
          })) as readonly [`0x${string}`, bigint, bigint, boolean];
          const claimed = d[3];
          const expiry = Number(d[2]);
          let status: Status;
          if (claimed) status = "claimed";
          else if (now >= expiry) status = "expired";
          else status = "active";
          return { ...s, status, onchainAmount: d[1] };
        } catch {
          return { ...s, status: "unknown" };
        }
      })
    );
    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function reclaim(linkAddr: `0x${string}`) {
    setError(null);
    setBusyAddr(linkAddr);
    try {
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!eth) throw new Error("Connect the wallet you sent from to reclaim.");
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(CHAIN_ID) }] });
      } catch {
        /* chain add handled on the send page; ignore here */
      }
      const wallet = createWalletClient({
        account: getAddress(accs[0]),
        chain: monadChain,
        transport: custom(eth),
      });
      const hash = await wallet.writeContract({
        address: CONTRACT,
        abi: DAMLA_ABI,
        functionName: "reclaim",
        args: [getAddress(linkAddr)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e) {
      const anyE = e as { shortMessage?: string; message?: string; code?: number };
      if (anyE?.code === 4001) setError("Request rejected in wallet.");
      else {
        const m = anyE?.shortMessage ?? anyE?.message ?? "Reclaim failed.";
        if (/NotSender/.test(m)) setError("Reclaim must come from the wallet that sent this link.");
        else if (/NotExpired/.test(m)) setError("This link is not reclaimable yet.");
        else setError(m.length > 140 ? m.slice(0, 140) + "…" : m);
      }
    } finally {
      setBusyAddr(null);
    }
  }

  return (
    <div className="wrap">
      <TopBar
        right={
          <nav className="nav">
            <Link href="/send">Send</Link>
            <Link href="/how-it-works">How it works</Link>
          </nav>
        }
      />

      <div className="card">
        <h2 className="card-h">Links you have sent from this device</h2>
        <p className="note mb-s">
          Status is read live from Monad. Expired and unclaimed? Reclaim the money back to your
          wallet in one click.
        </p>

        {loading ? (
          <div className="center" style={{ padding: 24 }}>
            <div className="spinner big" />
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p>No links yet.</p>
            <div className="mt">
              <Link href="/send" className="btn">
                Create your first link →
              </Link>
            </div>
          </div>
        ) : (
          <div className="list">
            {rows.map((r) => (
              <div className="item" key={r.linkAddr}>
                <div className="item-top">
                  <div className="item-amt">
                    {r.onchainAmount !== undefined ? formatEther(r.onchainAmount) : r.amount}
                    <span className="u">MON</span>
                  </div>
                  <span className={`tag ${r.status === "unknown" ? "active" : r.status}`}>
                    {r.status === "claimed"
                      ? "Claimed"
                      : r.status === "active"
                      ? "Unclaimed"
                      : r.status === "expired"
                      ? "Reclaimable"
                      : "…"}
                  </span>
                </div>
                <div className="row" style={{ padding: "8px 0 0", borderBottom: "none" }}>
                  <span className="k mono">{shortAddr(r.linkAddr)}</span>
                  <a className="k link-accent" href={`${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer">
                    on-chain ↗
                  </a>
                </div>
                <div className="item-meta">
                  <a className="mini" href={txUrl(r.txHash)} target="_blank" rel="noreferrer">
                    Deposit tx ↗
                  </a>
                  {r.status === "expired" && (
                    <button
                      className="mini solid"
                      onClick={() => reclaim(r.linkAddr)}
                      disabled={busyAddr === r.linkAddr}
                    >
                      {busyAddr === r.linkAddr ? "Reclaiming…" : "Reclaim money"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div className="status err">{error}</div>}
      </div>

      <div className="foot">
        <Link href="/">Home</Link>
        <span>{rows.length} link{rows.length === 1 ? "" : "s"} on this device</span>
      </div>
    </div>
  );
}
