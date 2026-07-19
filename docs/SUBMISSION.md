# Damla, Spark submission

**Title:** Damla

**Category:** mainnet (Monad mainnet, chainId 143) +500 XP
contracts are funded and deployed.

**Project URL:** https://getdamla.vercel.app

**GitHub:** https://github.com/mericcintosun/damla

**Contract addresses (Monad mainnet):**
- DamlaLinkDrop (one to one): `0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1`
- DamlaDrop (one to many): `0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394`
- DamlaGift (welcome gift, 20 x 0.6 MON): `0x3c6a0f60d9FFe479E1e121b211D13703e4d80045`

Contract address for the form: 0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1 (DamlaLinkDrop).

---

## Description (paste into the form)

Damla is send money by a link, built for Monad. You lock some MON behind a one time link and share
it anywhere. Whoever opens it claims the money walletless and gasless: a relayer pays the gas and a
fresh wallet is created for them in the browser, so they need no wallet, no gas token, and no signup
to receive. There is also a group drop, one link that the first N people each split, so you can tip
a group chat or run a giveaway without collecting a single address.

The part I am proud of is the safety. The relayer submits the claim and pays gas, but the money can
only ever reach the address the link key signed, so the relayer can never redirect a single wei.
Every balance and transaction hash in the app is real and resolvable on the Monad explorer, and if
you have no wallet at all a sponsored demo funds a throwaway wallet so you can feel the whole loop
end to end.

What I learned: how to make a gasless relayer trustless with a tiny signature bound to the contract
and chain, how Monad handles freshly funded balances, and how much friction a single link removes
compared to asking someone for an address and walking them through a wallet.

## What problem are you trying to solve?

Sending crypto to someone who is not already set up is painful. You have to ask for their address,
make them install a wallet, and then make them buy a gas token just to receive. Most people give up
before the transfer ever happens. I wanted to hand a friend a small amount and there was simply no
clean way to do it.

## How is your project the solution to your problem?

Damla removes every one of those steps for the person receiving. They tap a link and the money is
theirs, a wallet is made for them in the browser and a relayer pays the gas. The sender funds it
from their own wallet, and if no one claims within the expiry window the sender reclaims it, so
nothing is ever stuck. A small escrow contract holds the funds and releases them only to the address
signed by the link key, which makes the gasless relayer trustless. The group drop extends the same
guarantee to many claimers from one link.

---

## Demo video script (about 2.5 minutes, silent screen capture is fine)

1. Hook: open https://getdamla.vercel.app, say the problem in one line.
2. Send: /send, choose the sponsored demo (no wallet). Enter 0.01 MON, add a note. Create the link,
   show the QR and the link.
3. Claim: open the link in an incognito window (or scan the QR). Show the amount and note, no wallet
   connected. Tap claim. Show the real balance arrive and click the tx hash to the Monad explorer.
4. Safety: point at the "the relayer can only pay the address you sign for" panel.
5. Group drop: /drop, fund a 3 person drop, claim a share in another window, watch the progress bar
   tick "1 of 3 claimed" live.
6. Close: real contract, real transactions, no wallet needed to receive.

## Viral post (X, from @damla_monad)

> Send someone money with a link. They claim it with no wallet, no gas, no signup.
>
> That is Damla. You drop some MON into a link, send it however you send links, and the person on
> the other side just opens it. Nothing to install, nothing to sign up for.
>
> A relayer covers the gas so your recipient never pays. And by design that relayer can move your
> money to exactly one place, the person you are sending to. It cannot redirect it, cannot skim it,
> cannot keep it.
>
> The first users also get a 0.6 MON welcome gift to start with.
>
> getdamla.vercel.app

The full set of posts (viral, gift recipient, live drop dare) lives in
[SOCIAL_POSTS.md](./SOCIAL_POSTS.md).
