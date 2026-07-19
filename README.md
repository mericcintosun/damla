# Damla

**Send money by a link. The recipient taps it and it is theirs — no wallet, no gas, no app.**

Damla lets you lock native MON behind a one-time link and share it anywhere (WhatsApp, a text,
a DM). Whoever opens the link claims the money. A relayer pays the gas, so the recipient needs no
gas token and, by default, no pre-existing wallet at all. The claim is walletless and gasless.

- **Live app:** https://damla-nu.vercel.app
- **Contract (Monad Testnet):** [`0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1`](https://testnet.monadexplorer.com/address/0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1)
- **Chain:** Monad Testnet (chainId `10143`)

---

## The problem

Sending crypto to someone who is not already set up is miserable. You ask for their address, make
them install a wallet, and then make them buy a gas token just to *receive* money. Most people give
up before the transfer ever happens.

## The solution

Damla removes every one of those steps. You lock the money, you get a link, you send the link. The
person on the other end taps it and the money lands in a fresh wallet created for them in the
browser — or in their own wallet if they have one. They never install anything, never buy gas, and
never see a seed phrase to receive.

## The security property (why this is safe)

The claim transaction can be submitted by *anyone* — that is how the relayer pays the gas. But the
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
 │  (Monad Testnet)     │                                │  /api/relay  │
 └─────────────────────┘   funds ──► signed payout        └──────────────┘
```

1. **Send** — the sender generates an ephemeral key in the browser. Its address is the `linkAddr`;
   its private key is the secret. The sender calls `deposit(linkAddr, expiry)` locking `msg.value`
   MON. The secret is placed in the URL fragment (`/c/<linkAddr>#<secret>`) and never touches a
   server.
2. **Claim** — the recipient opens the link. The page reads the drop from the chain, then mints a
   fresh in-browser burner wallet (walletless), signs an EIP-191 authorization with the link key
   naming the burner as `payout`, and posts it to the relayer. The relayer submits `claim` and pays
   gas. The contract verifies the signature and pays the burner.
3. **Reclaim** — if no one claims before the expiry window, the original sender calls `reclaim` and
   gets the money back. Nothing is ever stuck.

Everything shown in the UI is real: balances are read from Monad and every transaction hash links
to the Monad explorer. There are no placeholder numbers and no fake success states.

---

## Repository layout

```
contracts/   Foundry project — DamlaLinkDrop.sol, tests, deploy script
web/         Next.js (App Router) + viem — landing, /send, /c/[linkAddr], /api/relay
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

14 tests cover deposit, the signature-gated claim, the relayer-cannot-redirect property, wrong
signer / wrong payout rejection, double-claim, and the reclaim/expiry paths.

Deploy:

```bash
cd contracts
export MONAD_RPC_URL=https://testnet-rpc.monad.xyz
export DEPLOYER_PRIVATE_KEY=0x...   # funded from https://faucet.monad.xyz
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
| `NEXT_PUBLIC_CHAIN_ID` | `10143` (Monad Testnet) |
| `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc.monad.xyz` |
| `NEXT_PUBLIC_EXPLORER` | `https://testnet.monadexplorer.com` |
| `RELAYER_PRIVATE_KEY` | **Server-only.** A funded testnet key used only to pay gas for `claim` / `reclaim`. |

The relayer route (`web/app/api/relay/route.ts`) is deliberately narrow: it only ever calls our
contract's `claim` / `reclaim`, validates the address checksums and the 65-byte signature,
simulates before sending, enforces a per-transaction gas cap, and rate-limits per IP.

## Tech

Solidity 0.8.28 · Foundry · Next.js 16 (App Router) · viem · TypeScript · deployed on Vercel.

## License

MIT — see [LICENSE](LICENSE).
