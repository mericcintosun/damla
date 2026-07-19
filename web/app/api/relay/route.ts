import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  getAddress,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI, DROP_CONTRACT, DROP_ABI } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The relayer key only ever: relays claim/reclaim on our two contracts, or sponsors a small demo
// amount to a burner so a walletless user can try the send side. Nothing else spends it.
const ALLOWED = new Set(["claim", "reclaim", "dropclaim", "sponsor"]);

// Cap on gas the relayer will pay per relayed tx, far above a normal claim (~60k).
const GAS_CAP = 200_000n;

// Sponsored demo: fixed, small. Enough to deposit a demo drop and pay Monad gas (~0.02 MON/tx).
const SPONSOR_AMOUNT = parseEther("0.06");
// Refuse to sponsor if the target already holds this much (prevents topping up / draining).
const SPONSOR_SKIP_ABOVE = parseEther("0.03");

// In-memory rate limits. Fine for a demo; reset on cold start.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const SPONSOR_WINDOW_MS = 10 * 60_000;
const SPONSOR_MAX = 2;
const hits = new Map<string, number[]>();
const sponsorHits = new Map<string, number[]>();

function limited(map: Map<string, number[]>, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const arr = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  map.set(key, arr);
  return arr.length > max;
}

function relayerAccount() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) return null;
  return privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(", ")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (limited(hits, ip, WINDOW_MS, MAX_PER_WINDOW)) {
    return Response.json({ error: "Too many requests. Wait a moment and try again." }, { status: 429 });
  }

  const account = relayerAccount();
  if (!account) {
    return Response.json({ error: "Relayer is not configured." }, { status: 500 });
  }

  let body: { action?: string; linkAddr?: string; payout?: string; sig?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request body." }, { status: 400 });
  }

  const action = body.action ?? "claim";
  if (!ALLOWED.has(action)) {
    return Response.json({ error: "Unsupported action." }, { status: 400 });
  }

  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

  try {
    // ---- Sponsored demo funding ------------------------------------------------------------
    if (action === "sponsor") {
      if (!body.to || !isAddress(body.to)) {
        return Response.json({ error: "Invalid target address." }, { status: 400 });
      }
      if (limited(sponsorHits, ip, SPONSOR_WINDOW_MS, SPONSOR_MAX)) {
        return Response.json(
          { error: "Demo funding limit reached for now. Try again later or use your own wallet." },
          { status: 429 }
        );
      }
      const to = getAddress(body.to);
      const bal = await pub.getBalance({ address: to });
      if (bal >= SPONSOR_SKIP_ABOVE) {
        return Response.json({ error: "This demo wallet is already funded." }, { status: 400 });
      }
      const hash = await wallet.sendTransaction({ to, value: SPONSOR_AMOUNT });
      return Response.json({ hash, amount: SPONSOR_AMOUNT.toString() });
    }

    if (!body.linkAddr || !isAddress(body.linkAddr)) {
      return Response.json({ error: "Invalid link address." }, { status: 400 });
    }

    // ---- Relayed multi-claim drop share ----------------------------------------------------
    if (action === "dropclaim") {
      if (!body.payout || !isAddress(body.payout)) {
        return Response.json({ error: "Invalid payout address." }, { status: 400 });
      }
      if (typeof body.sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(body.sig)) {
        return Response.json({ error: "Invalid signature." }, { status: 400 });
      }
      const args = [getAddress(body.linkAddr), getAddress(body.payout), body.sig as Hex] as const;
      const { request } = await pub.simulateContract({
        account,
        address: DROP_CONTRACT,
        abi: DROP_ABI,
        functionName: "claim",
        args,
      });
      const gas = await pub.estimateContractGas({
        account,
        address: DROP_CONTRACT,
        abi: DROP_ABI,
        functionName: "claim",
        args,
      });
      if (gas > GAS_CAP) {
        return Response.json({ error: "Gas estimate above the relayer cap." }, { status: 400 });
      }
      const hash = await wallet.writeContract(request);
      return Response.json({ hash });
    }

    // ---- Relayed claim ---------------------------------------------------------------------
    if (action === "claim") {
      if (!body.payout || !isAddress(body.payout)) {
        return Response.json({ error: "Invalid payout address." }, { status: 400 });
      }
      if (typeof body.sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(body.sig)) {
        return Response.json({ error: "Invalid signature." }, { status: 400 });
      }
      const args = [getAddress(body.linkAddr), getAddress(body.payout), body.sig as Hex] as const;

      const { request } = await pub.simulateContract({
        account,
        address: CONTRACT,
        abi: DAMLA_ABI,
        functionName: "claim",
        args,
      });
      const gas = await pub.estimateContractGas({
        account,
        address: CONTRACT,
        abi: DAMLA_ABI,
        functionName: "claim",
        args,
      });
      if (gas > GAS_CAP) {
        return Response.json({ error: "Gas estimate above the relayer cap." }, { status: 400 });
      }
      const hash = await wallet.writeContract(request);
      return Response.json({ hash });
    }

    // ---- Relayed reclaim (only succeeds if the relayer is the original sender) --------------
    const args = [getAddress(body.linkAddr)] as const;
    const { request } = await pub.simulateContract({
      account,
      address: CONTRACT,
      abi: DAMLA_ABI,
      functionName: "reclaim",
      args,
    });
    const hash = await wallet.writeContract(request);
    return Response.json({ hash });
  } catch (e) {
    const anyE = e as { shortMessage?: string; message?: string; metaMessages?: string[] };
    const combined = [anyE?.shortMessage, anyE?.message, ...(anyE?.metaMessages ?? [])]
      .filter(Boolean)
      .join(" ");
    return Response.json({ error: cleanRevert(combined || "Relay failed.") }, { status: 400 });
  }
}

function cleanRevert(msg: string): string {
  if (/AlreadyClaimedThis/.test(msg)) return "You have already claimed from this drop.";
  if (/AlreadyClaimed/.test(msg)) return "This link has already been claimed.";
  if (/DropEmpty/.test(msg)) return "This drop is fully claimed, every share is gone.";
  if (/BadSignature/.test(msg)) return "Signature check failed for this payout.";
  if (/NothingHere/.test(msg)) return "There is no drop behind this link.";
  if (/NotSender/.test(msg)) return "Only the original sender can reclaim this link.";
  if (/NotExpired/.test(msg)) return "This link cannot be reclaimed until it expires.";
  if (/insufficient funds/i.test(msg)) return "The relayer is out of gas funds. Try again shortly.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
