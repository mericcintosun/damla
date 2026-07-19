# Damla — Spark submission

**Title:** Damla

**Category:** testnet (Monad Testnet, chainId 10143)

**Project URL:** https://damla-nu.vercel.app

**GitHub:** https://github.com/mericcintosun/damla

**Contract addresses (Monad Testnet):**
- DamlaLinkDrop (one-to-one): `0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1`
- DamlaDrop (one-to-many): `0x7d105954B5A597375CFA4b6a5e08fB8e4bfb953d`

---

**Description**

Damla is send-money-by-a-link for Monad. You lock some MON behind a one-time link and share it
anywhere. Whoever opens it claims the money walletless and gasless — a relayer pays the gas and a
fresh wallet is created for them in the browser, so they need no wallet, no gas token, and no
signup to receive. There is also a group drop: one link the first N people each split, so you can
tip a group chat or run a giveaway without collecting a single address. The elegant part is the
security: the relayer submits the claim and pays gas, but funds can only ever reach the address the
link's ephemeral key signed — the relayer can never redirect a single wei. No wallet has more than
tiny test amounts, no data is faked, and every balance and transaction hash in the UI is real and
resolvable on the Monad explorer. If you have no wallet at all, a sponsored demo funds a throwaway
wallet so you can feel the whole loop end to end.

**What problem are you trying to solve?**

Sending crypto to someone who is not already set up is miserable. You have to ask for their
address, make them install a wallet, and then make them buy a gas token just to receive. Most
people give up before the transfer happens. I wanted to send a friend a small amount and there was
no way to do it without walking them through a wallet setup first.

**How is your project the solution?**

Damla removes every one of those steps for the person receiving. They tap a link and the money is
theirs — a wallet is created for them in the browser and a relayer pays the gas. The sender funds
it from their own wallet (you can only give away money you hold), and if no one claims within the
expiry window the sender reclaims it, so nothing is ever stuck. A small escrow contract holds the
funds and releases them only to the address signed by the link key, which makes the gasless relayer
trustless: it pays the gas but cannot steal or redirect the money. The group drop extends the same
guarantee to many claimers from one link.

---

## Demo video script (~2.5 min)

1. **Hook (0:00–0:20):** "Sending crypto to someone who isn't set up is painful — address, wallet,
   gas. Watch me send money with just a link." Open https://damla-nu.vercel.app.
2. **Send (0:20–1:00):** Go to /send → "Try a sponsored demo" (no wallet). Enter 0.01 MON, add a
   note "coffee on me ☕". Create the link. Show the QR + link on screen.
3. **Claim (1:00–1:45):** Open the link in a fresh/incognito window (or scan the QR with a phone).
   Show the amount + note, no wallet connected. Tap "Claim — no wallet needed." Show the real
   balance arrive and click the tx hash to the Monad explorer.
4. **Safety (1:45–2:05):** Point at the "the relayer can only pay the address you sign for" panel.
   One line: gasless but trustless.
5. **Group drop (2:05–2:35):** Go to /drop, fund a 3-person drop, show the one link, claim a share
   in another window, watch the progress bar tick "1 of 3 claimed" live on Monad.
6. **Close:** "Real contract on Monad, real transactions, no wallet needed to receive. That's
   Damla."

## Viral post draft (X)

> I built a way to send money by a link on @monad.
>
> No wallet. No gas. No signup. You tap the link and it's yours.
>
> First 5 people to open this each get testnet MON 👇 [live drop link]
>
> The relayer pays the gas but *cannot* touch your money. Here's how it works 🧵
