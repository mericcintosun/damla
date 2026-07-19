"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Link from "next/link";
import {
  createWalletClient,
  custom,
  http,
  parseEther,
  numberToHex,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { TopBar, SiteFooter } from "@/components/Brand";
import { monadChain, CHAIN_ID, RPC_URL, EXPLORER, txUrl } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI } from "@/lib/contract";
import { publicClient, shortAddr, buildFragment } from "@/lib/damla";
import { saveSent } from "@/lib/history";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
function getInjected(): EthProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EthProvider }).ethereum ?? null;
}

const EXPIRY_HOURS = 24;
const DEMO_KEY = "damla_demo_sender";
type Funding = "demo" | "wallet";

export default function SendPage() {
  const [funding, setFunding] = useState<Funding>("demo");
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Silently detect an already authorized wallet (no popup). If present, default to it.
  useEffect(() => {
    (async () => {
      const eth = getInjected();
      if (!eth) return;
      try {
        const accs = (await eth.request({ method: "eth_accounts" })) as string[];
        if (accs && accs.length) {
          setAccount(accs[0] as `0x${string}`);
          setFunding("wallet");
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function ensureChain(eth: EthProvider) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(CHAIN_ID) }] });
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: numberToHex(CHAIN_ID),
            chainName: "Monad",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
    }
  }

  // Switch to the user's own wallet on demand. This is the only place we ever prompt to connect.
  async function useOwnWallet() {
    setError(null);
    const eth = getInjected();
    if (!eth) {
      setError("No wallet found in this browser. The instant wallet works with nothing installed.");
      return;
    }
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      await ensureChain(eth);
      setAccount(accs[0] as `0x${string}`);
      setFunding("wallet");
    } catch (e) {
      setError(readableError(e));
    }
  }

  async function ensureDemoWallet(): Promise<Hex> {
    let key = localStorage.getItem(DEMO_KEY) as Hex | null;
    if (!key) {
      key = generatePrivateKey();
      localStorage.setItem(DEMO_KEY, key);
    }
    const addr = privateKeyToAccount(key).address;
    const bal = await publicClient.getBalance({ address: addr });
    if (bal < parseEther("0.03")) {
      setBusyLabel("Warming up your instant wallet…");
      const resp = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sponsor", to: addr }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Could not prepare the instant wallet.");
      await publicClient.waitForTransactionReceipt({ hash: data.hash });
    }
    return key;
  }

  async function createLink() {
    setError(null);
    let value: bigint;
    try {
      value = parseEther(amount);
    } catch {
      setError("Enter a valid amount.");
      return;
    }
    if (value <= 0n) return setError("Amount must be greater than zero.");

    setBusy(true);
    try {
      const secret = generatePrivateKey();
      const linkAddr = privateKeyToAccount(secret).address;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600);

      let wallet;
      let usedDemo = false;
      if (funding === "wallet" && account) {
        const eth = getInjected();
        if (!eth) throw new Error("Wallet not available.");
        await ensureChain(eth);
        wallet = createWalletClient({ account, chain: monadChain, transport: custom(eth) });
      } else {
        usedDemo = true;
        const key = await ensureDemoWallet();
        wallet = createWalletClient({ account: privateKeyToAccount(key), chain: monadChain, transport: http(RPC_URL) });
      }

      setBusyLabel(`Locking ${amount} MON…`);
      const submit = () =>
        wallet.writeContract({ address: CONTRACT, abi: DAMLA_ABI, functionName: "deposit", args: [linkAddr, expiry], value });
      let hash: `0x${string}`;
      try {
        hash = await submit();
      } catch (err) {
        const full = ((err as { message?: string })?.message ?? "") + ((err as { shortMessage?: string })?.shortMessage ?? "");
        if (usedDemo && /insufficient balance/i.test(full)) {
          setBusyLabel("Almost there, finalizing your balance…");
          await new Promise((r) => setTimeout(r, 3500));
          hash = await submit();
        } else {
          throw err;
        }
      }
      await publicClient.waitForTransactionReceipt({ hash });

      const url = `${window.location.origin}/c/${linkAddr}#${buildFragment(secret, note.trim() || undefined)}`;
      saveSent({ linkAddr, amount, expiry: Number(expiry), txHash: hash, createdAt: Date.now(), demo: usedDemo });
      setLink(url);
      setTxHash(hash);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const qrRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (link && qrRef.current) {
      QRCode.toCanvas(qrRef.current, link, { width: 168, margin: 1, color: { dark: "#04140f", light: "#e8f2f7" } }).catch(() => {});
    }
  }, [link]);

  const whatsapp = link
    ? `https://wa.me/?text=${encodeURIComponent(`I sent you some money. Tap to claim it, no wallet needed: ${link}`)}`
    : "#";

  return (
    <div className="wrap">
      <TopBar />

      {link ? (
        <div className="card">
          <h2 className="card-h">{amount} MON is waiting behind this link.</h2>
          <p className="note">
            Share it with anyone. Whoever opens it claims the money, <b>no wallet, no gas</b> needed
            on their side.
          </p>

          <div className="qr-wrap">
            <canvas ref={qrRef} className="qr" />
            <span className="qr-cap">Scan to open on a phone</span>
          </div>

          <div className="linkbox">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="copybtn" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt">
            <a className="btn" href={whatsapp} target="_blank" rel="noreferrer">
              Share on WhatsApp
            </a>
          </div>
          <div className="mt-s">
            <a className="btn ghost" href={link} target="_blank" rel="noreferrer">
              Open the claim page
            </a>
          </div>

          {txHash && (
            <div className="status ok">
              Locked on-chain.{" "}
              <a className="link-accent" href={txUrl(txHash)} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>
            </div>
          )}

          <div className="divider" />
          <div className="row" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <button className="back" onClick={() => { setLink(null); setTxHash(null); setAmount(""); setNote(""); }}>
              ← Send another
            </button>
            <Link href="/links" className="back">
              My links →
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="card-h">How much do you want to send?</h2>
          <p className="note mb-s">
            Pick an amount, get a one-time link. Whoever opens it claims it with no wallet and no gas.
          </p>

          <div className="mt">
            <label className="label">Amount</label>
            <div className="amount-wrap">
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={busy}
                autoFocus
              />
              <span className="unit">MON</span>
            </div>
            <div className="chips">
              {["0.005", "0.01", "0.02", "0.05"].map((a) => (
                <button key={a} className="chip" onClick={() => setAmount(a)} disabled={busy}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mt">
            <label className="label">Add a note (optional)</label>
            <input
              className="input"
              style={{ fontSize: 15 }}
              placeholder="Happy birthday 🎂"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="mt">
            <button className="btn" onClick={createLink} disabled={busy || !amount}>
              {busy ? (
                <>
                  <span className="spinner" /> {busyLabel || "Working…"}
                </>
              ) : (
                <>Create the link →</>
              )}
            </button>
          </div>

          {/* Funding source: a quiet line, never a loud gate. */}
          <div className="fund-row">
            {funding === "wallet" && account ? (
              <>
                <span>
                  Paying from <span className="mono">{shortAddr(account)}</span>
                </span>
                <button className="fund-switch" onClick={() => setFunding("demo")} disabled={busy}>
                  use instant wallet
                </button>
              </>
            ) : (
              <>
                <span>Paid from a free instant wallet, nothing to install</span>
                <button className="fund-switch" onClick={useOwnWallet} disabled={busy}>
                  use my own wallet
                </button>
              </>
            )}
          </div>

          {error && <div className="status err">{error}</div>}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function readableError(e: unknown): string {
  const anyE = e as { shortMessage?: string; message?: string; code?: number };
  if (anyE?.code === 4001) return "Request rejected in wallet.";
  const msg = anyE?.shortMessage ?? anyE?.message ?? "Something went wrong.";
  if (/insufficient funds|insufficient balance/i.test(msg)) return "Not enough MON to cover the amount plus gas.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
