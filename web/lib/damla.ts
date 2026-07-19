import {
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, CHAIN_ID, RPC_URL } from "./chain";
import { CONTRACT } from "./contract";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL),
});

// Recreate the exact inner digest the contract hashes over. The link key signs this
// as an EIP-191 personal_sign message, which matches _digest() in DamlaLinkDrop.sol.
export function claimInnerDigest(linkAddr: `0x${string}`, payout: `0x${string}`): Hex {
  return keccak256(
    encodePacked(
      ["address", "uint256", "address", "address"],
      [CONTRACT, BigInt(CHAIN_ID), linkAddr, payout]
    )
  );
}

// Sign a claim authorization with the ephemeral link key carried in the URL fragment.
export async function signClaim(
  secret: Hex,
  linkAddr: `0x${string}`,
  payout: `0x${string}`
): Promise<Hex> {
  const link = privateKeyToAccount(secret);
  const inner = claimInnerDigest(linkAddr, payout);
  // raw message => EIP-191: keccak256("\x19Ethereum Signed Message:\n32" || inner)
  return link.signMessage({ message: { raw: inner } });
}

export function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
