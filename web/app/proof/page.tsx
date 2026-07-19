"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther, isAddress, getAddress } from "viem";
import { TopBar } from "@/components/Brand";
import { EXPLORER, addrUrl } from "@/lib/chain";
import { CONTRACT, DROP_CONTRACT, DAMLA_ABI, DROP_ABI } from "@/lib/contract";
import { publicClient, shortAddr } from "@/lib/damla";

const RELAYER = "0x1F7142Dab905e54F89FFefEe7c91A94eE7D22AB8" as const;

type Live = { linkDrop?: bigint; drop?: bigint; relayer?: bigint; block?: bigint };

export default function ProofPage() {
  const [live, setLive] = useState<Live>({});
  const [inspect, setInspect] = useState("");
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [inspectErr, setInspectErr] = useState<string | null>(null);

  async function refresh() {
    try {
      const [a, b, c, blk] = await Promise.all([
        publicClient.getBalance({ address: CONTRACT }),
        publicClient.getBalance({ address: DROP_CONTRACT }),
        publicClient.getBalance({ address: RELAYER }),
        publicClient.getBlockNumber(),
      ]);
      setLive({ linkDrop: a, drop: b, relayer: c, block: blk });
    } catch {
      /* leave prior values */
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, []);

  async function readLink() {
    setInspectErr(null);
    setResult(null);
    let addr = inspect.trim();
    // accept a full link and pull the address out of the path
    const m = addr.match(/0x[a-fA-F0-9]{40}/);
    if (m) addr = m[0];
    if (!isAddress(addr)) {
      setInspectErr("Paste a link address or a full Damla link.");
      return;
    }
    setReading(true);
    try {
      const [single, pool] = await Promise.all([
        publicClient
          .readContract({ address: CONTRACT, abi: DAMLA_ABI, functionName: "getDrop", args: [getAddress(addr)] })
          .catch(() => null),
        publicClient
          .readContract({ address: DROP_CONTRACT, abi: DROP_ABI, functionName: "getPool", args: [getAddress(addr)] })
          .catch(() => null),
      ]);

      const zero = "0x0000000000000000000000000000000000000000";
      if (single && (single as readonly unknown[])[0] !== zero) {
        const [s, amt, exp, claimed] = single as readonly [string, bigint, bigint, boolean];
        setResult([
          "Found in DamlaLinkDrop (one to one)",
          `sender: ${s}`,
          `amount: ${formatEther(amt)} MON`,
          `expiry: ${new Date(Number(exp) * 1000).toUTCString()}`,
          `claimed: ${claimed}`,
        ]);
      } else if (pool && (pool as readonly unknown[])[0] !== zero) {
        const [s, per, rem, slots, claimed] = pool as readonly [string, bigint, bigint, number, number, bigint];
        setResult([
          "Found in DamlaDrop (one to many)",
          `sender: ${s}`,
          `per share: ${formatEther(per)} MON`,
          `remaining: ${formatEther(rem)} MON`,
          `claimed: ${Number(claimed)} of ${Number(slots)}`,
        ]);
      } else {
        setResult(["No drop found at this address on either contract."]);
      }
    } catch {
      setInspectErr("Could not read the chain. Try again.");
    } finally {
      setReading(false);
    }
  }

  const cards = [
    { name: "DamlaLinkDrop", sub: "one to one", addr: CONTRACT, bal: live.linkDrop },
    { name: "DamlaDrop", sub: "one to many", addr: DROP_CONTRACT, bal: live.drop },
    { name: "Relayer wallet", sub: "pays gas for claims", addr: RELAYER, bal: live.relayer },
  ];

  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <h2 className="card-h">Proof, read straight from the chain</h2>
        <p className="note mb-s">
          Nothing here is stored or faked. These numbers are fetched live from Monad every few
          seconds, at block <b className="mono">{live.block ? live.block.toString() : "…"}</b>.
        </p>

        <div className="list mt">
          {cards.map((c) => (
            <div className="item" key={c.addr}>
              <div className="item-top">
                <div>
                  <div className="item-amt" style={{ fontSize: 16 }}>
                    {c.name} <span className="k" style={{ fontSize: 12, fontWeight: 500 }}>{c.sub}</span>
                  </div>
                  <a className="k mono link-accent" href={addrUrl(c.addr)} target="_blank" rel="noreferrer">
                    {shortAddr(c.addr)} ↗
                  </a>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="item-amt">
                    {c.bal !== undefined ? Number(formatEther(c.bal)).toFixed(4) : "…"}
                    <span className="u">MON</span>
                  </div>
                  <span className="tag claimed">verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />
        <p className="note mb-s">
          Paste a Damla link (or just its address) and read its exact on-chain state.
        </p>
        <div className="linkbox">
          <input
            placeholder="https://getdamla.vercel.app/c/0x…"
            value={inspect}
            onChange={(e) => setInspect(e.target.value)}
            style={{ color: "var(--text)" }}
          />
          <button className="copybtn" onClick={readLink} disabled={reading}>
            {reading ? "Reading…" : "Read"}
          </button>
        </div>
        {inspectErr && <div className="status err">{inspectErr}</div>}
        {result && (
          <div className="card mt" style={{ padding: 14, textAlign: "left" }}>
            {result.map((r, i) => (
              <div key={i} className={i === 0 ? "" : "mono"} style={{ fontSize: i === 0 ? 14 : 12.5, color: i === 0 ? "var(--accent)" : "var(--muted)", padding: "3px 0", wordBreak: "break-all" }}>
                {i === 0 ? <b>{r}</b> : r}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="foot">
        <Link href="/how-it-works">How it works</Link>
        <a href={`${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer" className="mono">
          Explorer ↗
        </a>
      </div>
    </div>
  );
}
