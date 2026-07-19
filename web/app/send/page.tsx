"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  createWalletClient,
  custom,
  http,
  parseEther,
  numberToHex,
  formatEther,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import Link from "next/link";
import { TopBar } from "@/components/Brand";
import { monadTestnet, CHAIN_ID, RPC_URL, EXPLORER, txUrl } from "@/lib/chain";
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

// The window after which an unclaimed drop can be reclaimed by the sender.
const EXPIRY_HOURS = 24;
// Storage key for a reusable in-browser demo sender wallet.
const DEMO_KEY = "damla_demo_sender";

type Mode = "choose" | "wallet" | "demo";

export default function SendPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [demoKey, setDemoKey] = useState<Hex | null>(null);
  const [demoBalance, setDemoBalance] = useState<bigint | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  async function ensureChain(eth: EthProvider) {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: numberToHex(CHAIN_ID) }],
      });
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: numberToHex(CHAIN_ID),
            chainName: "Monad Testnet",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
    }
  }

  async function connectWallet() {
    setError(null);
    const eth = getInjected();
    if (!eth) {
      setError("No wallet found. Install a browser wallet like MetaMask, then reload — or use the demo below.");
      return;
    }
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      await ensureChain(eth);
      setAccount(accs[0] as `0x${string}`);
      setMode("wallet");
    } catch (e) {
      setError(readableError(e));
    }
  }

  // Walletless demo: mint (or reuse) an in-browser wallet and have the relayer sponsor a small
  // amount into it, so a first-time user can experience the whole send flow with no wallet.
  async function startDemo() {
    setError(null);
    setBusy(true);
    setBusyLabel("Setting up your demo wallet…");
    try {
      let key = localStorage.getItem(DEMO_KEY) as Hex | null;
      if (!key) {
        key = generatePrivateKey();
        localStorage.setItem(DEMO_KEY, key);
      }
      const addr = privateKeyToAccount(key).address;
      let bal = await publicClient.getBalance({ address: addr });

      if (bal < parseEther("0.03")) {
        setBusyLabel("Funding your demo wallet (sponsored)…");
        const resp = await fetch("/api/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sponsor", to: addr }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error ?? "Could not fund the demo wallet.");
        await publicClient.waitForTransactionReceipt({ hash: data.hash });
        bal = await publicClient.getBalance({ address: addr });
      }

      setDemoKey(key);
      setDemoBalance(bal);
      setIsDemo(true);
      setMode("demo");
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
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
    if (value <= 0n) {
      setError("Amount must be greater than zero.");
      return;
    }

    setBusy(true);
    setBusyLabel(`Locking ${amount} MON…`);
    try {
      // Ephemeral link key: lives only in the URL fragment, never sent to a server.
      const secret = generatePrivateKey();
      const linkAddr = privateKeyToAccount(secret).address;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600);

      let wallet;
      if (mode === "demo" && demoKey) {
        const demoAccount = privateKeyToAccount(demoKey);
        wallet = createWalletClient({ account: demoAccount, chain: monadTestnet, transport: http(RPC_URL) });
      } else {
        const eth = getInjected();
        if (!eth || !account) throw new Error("Wallet not connected.");
        await ensureChain(eth);
        wallet = createWalletClient({ account, chain: monadTestnet, transport: custom(eth) });
      }

      // On Monad, freshly sponsored funds can take a couple of seconds to become spendable even
      // though the balance already reads updated. Retry the deposit on that transient state.
      const submit = () =>
        wallet.writeContract({
          address: CONTRACT,
          abi: DAMLA_ABI,
          functionName: "deposit",
          args: [linkAddr, expiry],
          value,
        });
      let hash: `0x${string}`;
      try {
        hash = await submit();
      } catch (err) {
        const m = (err as { shortMessage?: string; message?: string })?.shortMessage ?? "";
        const full = ((err as { message?: string })?.message ?? "") + m;
        if (mode === "demo" && /insufficient balance/i.test(full)) {
          setBusyLabel("Almost there, finalizing your demo balance…");
          await new Promise((r) => setTimeout(r, 3500));
          hash = await submit();
        } else {
          throw err;
        }
      }
      await publicClient.waitForTransactionReceipt({ hash });

      const url = `${window.location.origin}/c/${linkAddr}#${buildFragment(secret, note.trim() || undefined)}`;
      saveSent({
        linkAddr,
        amount,
        expiry: Number(expiry),
        txHash: hash,
        createdAt: Date.now(),
        demo: mode === "demo",
      });
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

  function reset() {
    setLink(null);
    setTxHash(null);
    setAmount("");
  }

  const whatsapp = link
    ? `https://wa.me/?text=${encodeURIComponent(
        `I sent you some money. Tap to claim it, no wallet needed: ${link}`
      )}`
    : "#";

  const activeAddr = mode === "demo" && demoKey ? privateKeyToAccount(demoKey).address : account;

  const qrRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (link && qrRef.current) {
      QRCode.toCanvas(qrRef.current, link, {
        width: 168,
        margin: 1,
        color: { dark: "#04140f", light: "#e8f2f7" },
      }).catch(() => {});
    }
  }, [link]);

  return (
    <div className="wrap">
      <TopBar />

      {/* ---- Success ------------------------------------------------------------------- */}
      {link ? (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> Link is live
          </span>
          <h2 className="card-h">{amount} MON is waiting behind this link.</h2>
          <p className="note">
            Share it with anyone. Whoever opens it claims the money — <b>no wallet, no gas</b>{" "}
            needed on their side.
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
            <button className="back" onClick={reset}>
              ← Send another
            </button>
            <Link href="/links" className="back">
              My links →
            </Link>
          </div>
        </div>
      ) : mode === "choose" ? (
        /* ---- Mode picker + role clarity ---------------------------------------------- */
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> You are the sender
          </span>
          <h2 className="card-h">Give money by a link.</h2>
          <p className="note mb-s">
            The money comes out of your funds, so the <b>sender</b> needs MON. The person you send
            to needs <b>nothing</b> — no wallet, no gas.
          </p>

          <div className="mt">
            <button className="btn" onClick={connectWallet} disabled={busy}>
              Connect my wallet
            </button>
            <div className="mt-s">
              <button className="btn ghost" onClick={startDemo} disabled={busy}>
                {busy ? (
                  <>
                    <span className="spinner" /> {busyLabel || "Working…"}
                  </>
                ) : (
                  <>No wallet? Try a sponsored demo</>
                )}
              </button>
            </div>
          </div>

          <p className="hint">
            The demo funds a throwaway in-browser wallet with a tiny sponsored amount so you can feel
            the full flow end to end.
          </p>
          {error && <div className="status err">{error}</div>}
        </div>
      ) : (
        /* ---- Amount entry ------------------------------------------------------------ */
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> {isDemo ? "Demo wallet ready" : "Wallet connected"}
          </span>
          <h2 className="card-h">How much do you want to send?</h2>
          <p className="note mb-s">
            Locked behind a one-time link. Reclaim it after {EXPIRY_HOURS}h if no one claims.
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
              />
              <span className="unit">MON</span>
            </div>
            <div className="chips">
              {(isDemo ? ["0.005", "0.01", "0.02"] : ["0.05", "0.1", "0.5", "1"]).map((a) => (
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
              placeholder="Happy birthday! 🎂"
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
                <>Create the money link →</>
              )}
            </button>
          </div>

          <div className="row mt-s" style={{ borderBottom: "none" }}>
            <span className="k">
              {isDemo ? "Demo" : "Connected"} · <span className="mono">{shortAddr(activeAddr ?? "")}</span>
            </span>
            <span className="k">
              {demoBalance !== null && isDemo ? `${Number(formatEther(demoBalance)).toFixed(4)} MON` : ""}
            </span>
          </div>
          {error && <div className="status err">{error}</div>}
        </div>
      )}

      <div className="foot">
        <Link href="/links">My links</Link>
        <a
          href={txHash ? txUrl(txHash) : `${EXPLORER}/address/${CONTRACT}`}
          target="_blank"
          rel="noreferrer"
          className="mono"
        >
          Explorer ↗
        </a>
      </div>
    </div>
  );
}

function readableError(e: unknown): string {
  const anyE = e as { shortMessage?: string; message?: string; code?: number };
  if (anyE?.code === 4001) return "Request rejected in wallet.";
  const msg = anyE?.shortMessage ?? anyE?.message ?? "Something went wrong.";
  if (/insufficient funds/i.test(msg)) return "Not enough MON to cover the amount plus gas.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
