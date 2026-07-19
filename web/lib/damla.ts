import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadChain, CHAIN_ID, RPC_URL } from "./chain";
import { CONTRACT } from "./contract";

export const publicClient = createPublicClient({
  chain: monadChain,
  transport: http(RPC_URL),
});

// Recreate the exact inner digest a Damla contract hashes over. The link key signs this as an
// EIP-191 personal_sign message, which matches _digest() in both DamlaLinkDrop and DamlaDrop.
export function claimInnerDigest(
  contract: `0x${string}`,
  linkAddr: `0x${string}`,
  payout: `0x${string}`
): Hex {
  return keccak256(
    encodePacked(
      ["address", "uint256", "address", "address"],
      [contract, BigInt(CHAIN_ID), linkAddr, payout]
    )
  );
}

// Sign a claim authorization with the ephemeral link key carried in the URL fragment.
// `contract` defaults to the single-link contract for backward compatibility.
export async function signClaim(
  secret: Hex,
  linkAddr: `0x${string}`,
  payout: `0x${string}`,
  contract: `0x${string}` = CONTRACT
): Promise<Hex> {
  const link = privateKeyToAccount(secret);
  const inner = claimInnerDigest(contract, linkAddr, payout);
  // raw message => EIP-191: keccak256("\x19Ethereum Signed Message:\n32" || inner)
  return link.signMessage({ message: { raw: inner } });
}

export function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// The URL fragment carries the link secret and an optional private note. Both live only in the
// fragment (after #), which browsers never send to a server. Two shapes are supported:
//   #0x<64 hex>                      (secret only, original form)
//   #k=0x<64 hex>&m=<base64url note> (secret + note)
function b64urlEncode(s: string): string {
  const b = btoa(unescape(encodeURIComponent(s)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b)));
}

export function buildFragment(secret: Hex, note?: string): string {
  if (!note) return secret;
  return `k=${secret}&m=${b64urlEncode(note.slice(0, 140))}`;
}

export function parseFragment(hash: string): { secret: Hex | null; note: string | null } {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return { secret: raw as Hex, note: null };
  const params = new URLSearchParams(raw);
  const k = params.get("k");
  const m = params.get("m");
  const secret = k && /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
  let note: string | null = null;
  if (m) {
    try {
      note = b64urlDecode(m);
    } catch {
      note = null;
    }
  }
  return { secret, note };
}
