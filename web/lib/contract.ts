import type { Abi } from "viem";

export const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT ??
  "0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1") as `0x${string}`;

export const DAMLA_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "linkAddr", type: "address" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "linkAddr", type: "address" },
      { name: "payout", type: "address" },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reclaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "linkAddr", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getDrop",
    stateMutability: "view",
    inputs: [{ name: "linkAddr", type: "address" }],
    outputs: [
      { name: "sender", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiry", type: "uint64" },
      { name: "claimed", type: "bool" },
    ],
  },
] as const satisfies Abi;
