"use client";

import { useState } from "react";
import {
  createWalletClient,
  custom,
  parseEther,
  numberToHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { TopBar } from "@/components/Brand";
import { monadTestnet, CHAIN_ID, RPC_URL, EXPLORER, txUrl } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI } from "@/lib/contract";
import { publicClient, shortAddr } from "@/lib/damla";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getInjected(): EthProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EthProvider }).ethereum ?? null;
}

// The expiry window after which an unclaimed drop can be reclaimed by the sender.
const EXPIRY_HOURS = 24;

export default function SendPage() {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function connect() {
    setError(null);
    const eth = getInjected();
    if (!eth) {
      setError("No wallet found. Install a browser wallet like MetaMask, then reload.");
      return;
    }
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      await ensureChain(eth);
      setAccount(accs[0] as `0x${string}`);
    } catch (e) {
      setError(readableError(e));
    }
  }

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

  async function createLink() {
    setError(null);
    const eth = getInjected();
    if (!eth || !account) return;
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
    try {
      await ensureChain(eth);

      // Ephemeral link key: lives only in the URL fragment, never sent to a server.
      const secret = generatePrivateKey();
      const linkAddr = privateKeyToAccount(secret).address;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + EXPIRY_HOURS * 3600);

      const wallet = createWalletClient({
        account,
        chain: monadTestnet,
        transport: custom(eth),
      });

      const hash = await wallet.writeContract({
        address: CONTRACT,
        abi: DAMLA_ABI,
        functionName: "deposit",
        args: [linkAddr, expiry],
        value,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const url = `${window.location.origin}/c/${linkAddr}#${secret}`;
      setLink(url);
      setTxHash(hash);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const whatsapp = link
    ? `https://wa.me/?text=${encodeURIComponent(
        `I sent you some money. Tap to claim it (no wallet needed): ${link}`
      )}`
    : "#";

  return (
    <div className="wrap">
      <TopBar />

      {!link ? (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> Step 1 — Lock the money
          </span>
          <h2 style={{ margin: "12px 0 4px", fontSize: 24, letterSpacing: "-0.02em" }}>
            How much do you want to send?
          </h2>
          <p className="note mb-s">
            The amount is locked in the contract behind a one-time link. You can reclaim it after{" "}
            {EXPIRY_HOURS}h if no one claims.
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
              {["0.05", "0.1", "0.5", "1"].map((a) => (
                <button key={a} className="chip" onClick={() => setAmount(a)} disabled={busy}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mt">
            {!account ? (
              <button className="btn" onClick={connect} disabled={busy}>
                Connect wallet
              </button>
            ) : (
              <button className="btn" onClick={createLink} disabled={busy || !amount}>
                {busy ? (
                  <>
                    <span className="spinner" /> Locking {amount || "0"} MON…
                  </>
                ) : (
                  <>Create the money link →</>
                )}
              </button>
            )}
          </div>

          {account && (
            <p className="hint">
              Connected as <span className="mono">{shortAddr(account)}</span>
            </p>
          )}
          {error && <div className="status err">{error}</div>}
        </div>
      ) : (
        <div className="card">
          <span className="eyebrow">
            <span className="dot" /> Link is live
          </span>
          <h2 style={{ margin: "12px 0 4px", fontSize: 24, letterSpacing: "-0.02em" }}>
            {amount} MON is waiting behind this link.
          </h2>
          <p className="note">
            Share it with anyone. Whoever opens it claims the money — no wallet, no gas needed.
          </p>

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
          <button
            className="back"
            onClick={() => {
              setLink(null);
              setTxHash(null);
              setAmount("");
            }}
          >
            ← Send another
          </button>
        </div>
      )}

      <div className="foot">
        <span>Amount stays yours until claimed</span>
        <a href={txHash ? txUrl(txHash) : `${EXPLORER}/address/${CONTRACT}`} target="_blank" rel="noreferrer" className="mono">
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
