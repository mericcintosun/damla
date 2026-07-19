import type { Abi } from "viem";

// Monad mainnet deployments.
export const CONTRACT = (process.env.NEXT_PUBLIC_CONTRACT ??
  "0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1") as `0x${string}`;

export const DROP_CONTRACT = (process.env.NEXT_PUBLIC_DROP_CONTRACT ??
  "0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394") as `0x${string}`;

export const GIFT_CONTRACT = (process.env.NEXT_PUBLIC_GIFT_CONTRACT ??
  "0x3c6a0f60d9FFe479E1e121b211D13703e4d80045") as `0x${string}`;

export const GIFT_ABI = [
  { type: "function", name: "claimGift", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }], outputs: [] },
  { type: "function", name: "claimedCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "remaining", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "MAX", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "GIFT", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimed", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "AlreadyGifted", inputs: [] },
  { type: "error", name: "SoldOut", inputs: [] },
  { type: "error", name: "PoolEmpty", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "BadInput", inputs: [] },
] as const satisfies Abi;

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
  { type: "error", name: "AlreadyExists", inputs: [] },
  { type: "error", name: "NothingHere", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "NotExpired", inputs: [] },
  { type: "error", name: "NotSender", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "BadInput", inputs: [] },
] as const satisfies Abi;

export const DROP_ABI = [
  {
    type: "function",
    name: "createDrop",
    stateMutability: "payable",
    inputs: [
      { name: "linkAddr", type: "address" },
      { name: "slots", type: "uint32" },
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
    name: "getPool",
    stateMutability: "view",
    inputs: [{ name: "linkAddr", type: "address" }],
    outputs: [
      { name: "sender", type: "address" },
      { name: "amountPerClaim", type: "uint256" },
      { name: "remaining", type: "uint256" },
      { name: "slots", type: "uint32" },
      { name: "claimed", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
  },
  { type: "error", name: "AlreadyExists", inputs: [] },
  { type: "error", name: "NothingHere", inputs: [] },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "DropEmpty", inputs: [] },
  { type: "error", name: "AlreadyClaimedThis", inputs: [] },
  { type: "error", name: "NotExpired", inputs: [] },
  { type: "error", name: "NotSender", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "BadInput", inputs: [] },
] as const satisfies Abi;
