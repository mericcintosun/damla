"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { TopBar } from "@/components/Brand";
import { monadTestnet, CHAIN_ID, RPC_URL, EXPLORER, txUrl } from "@/lib/chain";
import { DROP_CONTRACT, DROP_ABI } from "@/lib/contract";
import { publicClient, shortAddr } from "@/lib/damla";

type EthProvider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
const getInjected = () =>
  typeof window === "undefined" ? null : ((window as unknown as { ethereum?: EthProvider }).ethereum ?? null);

const EXPIRY_HOURS = 24;
const DEMO_KEY = "damla_demo_sender";

type Mode = "choose" | "wallet" | "demo";

export default function DropPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [demoKey, setDemoKey] = useState<Hex | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [total, setTotal] = useState("");
  const [slots, setSlots] = useState(5);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function ensureChain(eth: EthProvider) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(CHAIN_ID) }] });
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
      setError("No wallet found. Install one, or use the sponsored demo.");
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
      setIsDemo(true);
      setMode("demo");
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function createDrop() {
    setError(null);
    let value: bigint;
    try {
      value = parseEther(total);
    } catch {
      setError("Enter a valid total amount.");
      return;
    }
    if (value <= 0n) return setError("Total must be greater than zero.");
    if (slots < 1) return setError("Pick at least one person.");
    if (value < BigInt(slots)) return setError("Total is too small to split into that many shares.");

    setBusy(true);
    setBusyLabel(`Funding a ${slots}-person drop…`);
    try {
      const secret = generatePrivateKey();
      const linkAddr = privateKeyToAccount(secret).address;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600);

      let wallet;
      if (mode === "demo" && demoKey) {
        wallet = createWalletClient({ account: privateKeyToAccount(demoKey), chain: monadTestnet, transport: http(RPC_URL) });
      } else {
        const eth = getInjected();
        if (!eth || !account) throw new Error("Wallet not connected.");
        await ensureChain(eth);
        wallet = createWalletClient({ account, chain: monadTestnet, transport: custom(eth) });
      }

      const submit = () =>
        wallet.writeContract({
          address: DROP_CONTRACT,
          abi: DROP_ABI,
          functionName: "createDrop",
          args: [linkAddr, slots, expiry],
          value,
        });
      let hash: `0x${string}`;
      try {
        hash = await submit();
      } catch (err) {
        const full = ((err as { message?: string })?.message ?? "") + ((err as { shortMessage?: string })?.shortMessage ?? "");
        if (mode === "demo" && /insufficient balance/i.test(full)) {
          setBusyLabel("Almost there, finalizing your demo balance…");
          await new Promise((r) => setTimeout(r, 3500));
          hash = await submit();
        } else throw err;
      }
      await publicClient.waitForTransactionReceipt({ hash });

      setLink(`${window.location.origin}/d/${linkAddr}#${secret}`);
      setTxHash(hash);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  const perShare = (() => {
    try {
      const v = parseEther(total || "0");
      if (v <= 0n || slots < 1) return null;
      return formatEther(v / BigInt(slots));
    } catch {
      return null;
    }
  })();

  const qrRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (link && qrRef.current) {
      QRCode.toCanvas(qrRef.current, link, { width: 168, margin: 1, color: { dark: "#04140f", light: "#e8f2f7" } }).catch(() => {});
    }
  }, [link]);

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const shareText = link
    ? `First ${slots} people to tap this each get ${perShare} MON, no wallet, no gas needed. ${link}`
    : "";
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const activeAddr = mode === "demo" && demoKey ? privateKeyToAccount(demoKey).address : account;

  return (
    <div className="wrap">
      <TopBar />

      {link ? (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> Drop is live
          </span>
          <h2 className="card-h">
            First {slots} people each get {perShare} MON.
          </h2>
          <p className="note">
            Post this one link anywhere. Each person who opens it claims a share, no wallet, no gas.
            The link is the giveaway.
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
            <a className="btn" href={tweet} target="_blank" rel="noreferrer">
              Post on X
            </a>
          </div>
          <div className="mt-s">
            <a className="btn ghost" href={whatsapp} target="_blank" rel="noreferrer">
              Share on WhatsApp
            </a>
          </div>

          {txHash && (
            <div className="status ok">
              Pool funded on-chain.{" "}
              <a className="link-accent" href={txUrl(txHash)} target="_blank" rel="noreferrer">
                View transaction ↗
              </a>
            </div>
          )}

          <div className="divider" />
          <div className="row" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <a className="back" href={link} target="_blank" rel="noreferrer">
              Open the drop →
            </a>
            <button className="back" onClick={() => { setLink(null); setTxHash(null); setTotal(""); }}>
              New drop
            </button>
          </div>
        </div>
      ) : mode === "choose" ? (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> Group drop
          </span>
          <h2 className="card-h">One link. The first N people split it.</h2>
          <p className="note mb-s">
            Tip your group chat or run a giveaway without collecting a single address. You fund it;
            the first people to tap the link each claim an equal share, walletless and gasless.
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
          {error && <div className="status err">{error}</div>}
        </div>
      ) : (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> {isDemo ? "Demo wallet ready" : "Wallet connected"}
          </span>
          <h2 className="card-h">Set up your drop</h2>

          <div className="mt">
            <label className="label">Total amount</label>
            <div className="amount-wrap">
              <input
                inputMode="decimal"
                placeholder="0.0"
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={busy}
              />
              <span className="unit">MON</span>
            </div>
            <div className="chips">
              {(isDemo ? ["0.01", "0.02", "0.03"] : ["0.5", "1", "2"]).map((a) => (
                <button key={a} className="chip" onClick={() => setTotal(a)} disabled={busy}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mt">
            <label className="label">How many people</label>
            <div className="stepper">
              <button className="step-btn" onClick={() => setSlots((s) => Math.max(1, s - 1))} disabled={busy}>
                −
              </button>
              <span className="step-val">{slots}</span>
              <button className="step-btn" onClick={() => setSlots((s) => Math.min(50, s + 1))} disabled={busy}>
                +
              </button>
              {perShare && (
                <span className="step-note">
                  {perShare} MON each
                </span>
              )}
            </div>
          </div>

          <div className="mt">
            <button className="btn" onClick={createDrop} disabled={busy || !total}>
              {busy ? (
                <>
                  <span className="spinner" /> {busyLabel || "Working…"}
                </>
              ) : (
                <>Fund the drop →</>
              )}
            </button>
          </div>
          <div className="row mt-s" style={{ borderBottom: "none" }}>
            <span className="k">
              {isDemo ? "Demo" : "Connected"} · <span className="mono">{shortAddr(activeAddr ?? "")}</span>
            </span>
          </div>
          {error && <div className="status err">{error}</div>}
        </div>
      )}

      <div className="foot">
        <Link href="/send">Send to one person</Link>
        <a href={`${EXPLORER}/address/${DROP_CONTRACT}`} target="_blank" rel="noreferrer" className="mono">
          Drop contract ↗
        </a>
      </div>
    </div>
  );
}

function readableError(e: unknown): string {
  const anyE = e as { shortMessage?: string; message?: string; code?: number };
  if (anyE?.code === 4001) return "Request rejected in wallet.";
  const msg = anyE?.shortMessage ?? anyE?.message ?? "Something went wrong.";
  if (/insufficient funds|insufficient balance/i.test(msg)) return "Not enough MON to cover the total plus gas.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
