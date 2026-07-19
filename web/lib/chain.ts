import { defineChain } from "viem";

// Monad mainnet parameters (verified live against docs.monad.xyz).
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 143);
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.monad.xyz";
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://monadscan.com";

export const monadChain = defineChain({
  id: CHAIN_ID,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: EXPLORER },
  },
  testnet: false,
});

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addrUrl = (addr: string) => `${EXPLORER}/address/${addr}`;
