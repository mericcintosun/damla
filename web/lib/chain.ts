import { defineChain } from "viem";

// Monad testnet parameters (verified live against docs.monad.xyz / chainlist).
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 10143);
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://testnet-rpc.monad.xyz";
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://testnet.monadexplorer.com";

export const monadTestnet = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: EXPLORER },
  },
  testnet: true,
});

export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addrUrl = (addr: string) => `${EXPLORER}/address/${addr}`;
