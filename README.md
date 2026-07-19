# Damla

[![CI](https://github.com/mericcintosun/damla/actions/workflows/ci.yml/badge.svg)](https://github.com/mericcintosun/damla/actions/workflows/ci.yml)

**Send money by a link. The recipient taps it and it is theirs, with no wallet, no gas, no app.**

Damla lets you lock native MON behind a one-time link and share it anywhere (WhatsApp, a text,
a DM). Whoever opens the link claims the money. A relayer pays the gas, so the recipient needs no
gas token and, by default, no pre-existing wallet at all. The claim is walletless and gasless.

Think of it as send-by-link, but open, onchain, and trustless: the relayer pays the gas yet
**mathematically cannot touch or redirect your money**, on the fastest EVM chain.

- **Live app:** https://getdamla.vercel.app
- **LinkDrop contract (one-to-one):** [`0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1`](https://monadscan.com/address/0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1)
- **Drop contract (one-to-many):** [`0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394`](https://monadscan.com/address/0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394)
- **Chain:** Monad mainnet (chainId `143`)

## Features

- **Send by link**, lock MON, get a link, share it. The recipient claims walletless and gasless.
- **Group drop**, one link, the first N people each claim an equal share. Tip a group chat or run
  a giveaway without collecting a single address. (`DamlaDrop` contract.)
- **Sponsored demo**, no wallet? A relayer funds a throwaway in-browser wallet with a tiny amount
  so you can experience the whole send → claim loop with zero setup.
- **QR code + private note**, every link gets a QR to scan in person, and an optional message
  ("Happy birthday 🎂") carried privately in the URL fragment.
- **My links**, a dashboard reading live on-chain status of what you sent; reclaim expired,
  unclaimed drops in one click.
- **On-chain proof everywhere**, real balances, real tx hashes, all linking to the Monad explorer.
  No placeholder data, no fake success states.

---

## The problem

Sending crypto to someone who is not already set up is miserable. You ask for their address, make
them install a wallet, and then make them buy a gas token just to *receive* money. Most people give
up before the transfer ever happens.

## The solution

Damla removes every one of those steps. You lock the money, you get a link, you send the link. The
person on the other end taps it and the money lands in a fresh wallet created for them in the
browser, or in their own wallet if they have one. They never install anything, never buy gas, and
never see a seed phrase to receive.

## The security property (why this is safe)

The claim transaction can be submitted by *anyone*, that is how the relayer pays the gas. But the
funds can **only** move to the payout address that the link's secret key signed. The relayer pays
gas yet **cannot steal or redirect a single wei**. Even if the relayer key leaked, user funds are
safe: the contract enforces that the money reaches the signed recipient and no one else.

---

## How it works

```
 Sender (wallet + MON)                 Recipient (no wallet, no gas)
        │                                       │
        │ deposit{value}(linkAddr, expiry)      │  opens /c/<linkAddr>#<secret>
        ▼                                       ▼
 ┌─────────────────────┐  claim(linkAddr, payout, sig)  ┌──────────────┐
 │  DamlaLinkDrop.sol   │◄───────────────────────────────│   Relayer    │  (pays gas)
 │  (Monad mainnet)     │                                │  /api/relay  │
 └─────────────────────┘   funds ──► signed payout        └──────────────┘
```

1. **Send**, the sender generates an ephemeral key in the browser. Its address is the `linkAddr`;
   its private key is the secret. The sender calls `deposit(linkAddr, expiry)` locking `msg.value`
   MON. The secret is placed in the URL fragment (`/c/<linkAddr>#<secret>`) and never touches a
   server.
2. **Claim**, the recipient opens the link. The page reads the drop from the chain, then mints a
   fresh in-browser burner wallet (walletless), signs an EIP-191 authorization with the link key
   naming the burner as `payout`, and posts it to the relayer. The relayer submits `claim` and pays
   gas. The contract verifies the signature and pays the burner.
3. **Reclaim**, if no one claims before the expiry window, the original sender calls `reclaim` and
   gets the money back. Nothing is ever stuck.

Everything shown in the UI is real: balances are read from Monad and every transaction hash links
to the Monad explorer. There are no placeholder numbers and no fake success states.

---

## Repository layout

```
contracts/            Foundry: DamlaLinkDrop.sol (one-to-one), DamlaDrop.sol (one-to-many), tests, deploy
web/                  Next.js (App Router) + viem
  app/
    page.tsx          landing
    send/             create a one-to-one money link
    c/[linkAddr]/     walletless + gasless claim
    drop/             create a group drop (first N split it)
    d/[linkAddr]/     claim a share from a group drop
    links/            your sent links + reclaim
    proof/            live on-chain proof, read straight from the chain
    how-it-works/, faq/, docs/, blog/, roadmap/, brand-kit/, report/
    api/relay/        the relayer (claim / dropclaim / reclaim / sponsor)
  lib/                chain, contract ABIs, signing helpers
  components/         brand mark, top bar, footer, ambient background
  public/brand/       optimized brand imagery (WebP)
design/               original rendered brand assets (source)
docs/                 submission notes and image prompts
.github/workflows/    CI (forge test + web build)
```

## Smart contract

`contracts/src/DamlaLinkDrop.sol` is a minimal native-MON escrow keyed by an ephemeral link address.
It is checks-effects-interactions ordered, single-claim, and its claim signature is bound to the
contract address and chain id (anti-replay).

Run the tests:

```bash
cd contracts
forge test -vvv
```

26 tests across both contracts cover deposit/createDrop, the signature-gated claim, the
relayer-cannot-redirect property, wrong signer / wrong payout rejection, double-claim, the
first-N-split and drop-empty paths, dust handling, and the reclaim/expiry paths.

Deploy:

```bash
cd contracts
export MONAD_RPC_URL=https://rpc.monad.xyz
export DEPLOYER_PRIVATE_KEY=0x...   # funded from a funded account
forge script script/Deploy.s.sol --rpc-url "$MONAD_RPC_URL" --broadcast
```

## Web app

```bash
cd web
cp .env.example .env.local   # fill in the deployed contract + a funded relayer key
npm install
npm run dev
```

Environment variables (`web/.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CONTRACT` | Deployed `DamlaLinkDrop` address |
| `NEXT_PUBLIC_DROP_CONTRACT` | Deployed `DamlaDrop` address |
| `NEXT_PUBLIC_CHAIN_ID` | `143` (Monad mainnet) |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.monad.xyz` |
| `NEXT_PUBLIC_EXPLORER` | `https://monadscan.com` |
| `RELAYER_PRIVATE_KEY` | **Server-only.** A funded mainnet key used only to pay gas for `claim` / `reclaim`. |

The relayer route (`web/app/api/relay/route.ts`) is deliberately narrow: it only ever calls our
contract's `claim` / `reclaim`, validates the address checksums and the 65-byte signature,
simulates before sending, enforces a per-transaction gas cap, and rate-limits per IP.

## Tech

Solidity 0.8.28 · Foundry · Next.js 16 (App Router) · viem · TypeScript · deployed on Vercel.

## License

MIT, see [LICENSE](LICENSE).
