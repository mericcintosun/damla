import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  getAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "@/lib/chain";
import { CONTRACT, DAMLA_ABI } from "@/lib/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only claim/reclaim on our own contract may be relayed. Nothing else spends the relayer key.
const ALLOWED = new Set(["claim", "reclaim"]);

// Cap on gas the relayer will pay per tx — a sanity ceiling far above a normal claim (~60k).
const GAS_CAP = 200_000n;

// Tiny in-memory rate limit. Fine for a demo; resets on cold start.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

function relayerAccount() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) return null;
  return privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return Response.json({ error: "Too many requests. Wait a moment and try again." }, { status: 429 });
  }

  const account = relayerAccount();
  if (!account) {
    return Response.json({ error: "Relayer is not configured." }, { status: 500 });
  }

  let body: { action?: string; linkAddr?: string; payout?: string; sig?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request body." }, { status: 400 });
  }

  const action = body.action ?? "claim";
  if (!ALLOWED.has(action)) {
    return Response.json({ error: "Unsupported action." }, { status: 400 });
  }
  if (!body.linkAddr || !isAddress(body.linkAddr)) {
    return Response.json({ error: "Invalid link address." }, { status: 400 });
  }

  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

  try {
    if (action === "claim") {
      if (!body.payout || !isAddress(body.payout)) {
        return Response.json({ error: "Invalid payout address." }, { status: 400 });
      }
      if (typeof body.sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(body.sig)) {
        return Response.json({ error: "Invalid signature." }, { status: 400 });
      }
      const args = [getAddress(body.linkAddr), getAddress(body.payout), body.sig as Hex] as const;

      // Simulate first: catches BadSignature / AlreadyClaimed with a clean revert, and gives a gas estimate.
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

    // reclaim: only the original sender's own tx makes sense, but we still allow relaying it.
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
    // Combine every layer so a decoded custom-error name (e.g. AlreadyClaimed) is visible to cleanRevert.
    const combined = [anyE?.shortMessage, anyE?.message, ...(anyE?.metaMessages ?? [])]
      .filter(Boolean)
      .join(" ");
    return Response.json({ error: cleanRevert(combined || "Relay failed.") }, { status: 400 });
  }
}

function cleanRevert(msg: string): string {
  if (/AlreadyClaimed/.test(msg)) return "This link has already been claimed.";
  if (/BadSignature/.test(msg)) return "Signature check failed for this payout.";
  if (/NothingHere/.test(msg)) return "There is no drop behind this link.";
  if (/insufficient funds/i.test(msg)) return "The relayer is out of gas funds. Try again shortly.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
