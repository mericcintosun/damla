import type { ReactNode } from "react";
import Link from "next/link";

export type Post = {
  slug: string;
  title: string;
  date: string;
  dek: string;
  content: ReactNode;
};

export const posts: Post[] = [
  {
    slug: "why-i-built-damla",
    title: "Why I built Damla",
    date: "July 2026",
    dek: "The night I tried to send a friend a little crypto and gave up halfway through.",
    content: (
      <div className="prose">
        <h2>Why I built Damla</h2>
        <p>
          A few months ago I wanted to send a friend a small amount of crypto. Nothing dramatic, just
          a thank-you for helping me move some furniture. I opened a chat, started typing, and then
          it hit me: she does not have a wallet. So the real message I would have to send was not
          &quot;here is a little something&quot;. It was &quot;install this app, write down twelve
          words, do not lose them, now buy some of a second token so you can pay a fee to receive my
          gift, and paste this forty-two character address that starts with 0x.&quot;
        </p>
        <p>
          I closed the chat. I did not send anything. That is the part that bothered me for weeks.
          The technology was there, the money was there, and the two of us still could not make it
          happen because the on-ramp was a wall.
        </p>
        <p>
          I kept coming back to how <b>water</b> works. You do not think about plumbing when you fill
          a glass. You turn a tap and it flows. Money between people should feel closer to that. That
          is where the name came from. <b>Damla</b> means <b>drop</b> in Turkish, like a single drop
          from a faucet. On Monad you get your drops of MON from a faucet already, so the metaphor
          almost wrote itself: catch a few drops, then pass them to someone else with the same ease
          you got them.
        </p>
        <h3>The idea, stripped down</h3>
        <p>
          Damla is a link. You lock some MON, you get a URL, you send that URL however you already
          talk to people. Whoever opens it receives the money. No wallet to install, no seed phrase,
          no fee token to buy first. A throwaway wallet is created for them right in the browser, and
          a relayer covers the gas so they start from zero and still walk away with something.
        </p>
        <p>
          The person paying still uses a wallet, because you can only give away what you already
          hold. But the person receiving connects nothing. That asymmetry is the whole trick, and it
          is the reason my furniture-moving friend could have just tapped a link and been done.
        </p>
        <p>
          I did not build this to chase a trend. I built it because I hit a wall on an ordinary
          Tuesday and refused to accept that sending someone ten dollars of value had to feel like
          onboarding them to a bank. If you want to see the mechanics, the{" "}
          <Link href="/how-it-works">how it works</Link> page lays them out. If you just want to feel
          it, go make a <Link href="/send">money link</Link> and send it to yourself.
        </p>
      </div>
    ),
  },
  {
    slug: "how-the-relayer-cannot-steal",
    title: "Why the relayer cannot steal your money",
    date: "July 2026",
    dek: "Gasless usually means trusting a middleman. Here is why Damla's relayer is trustless anyway.",
    content: (
      <div className="prose">
        <h2>Why the relayer cannot steal your money</h2>
        <p>
          The moment you hear &quot;a relayer pays the gas for you&quot;, a fair question shows up:
          if some server is submitting the transaction, what stops that server from pointing the
          money at itself? It is the right thing to worry about. A gasless system that quietly asks
          you to trust an operator is not much of an upgrade. So let me walk through why the Damla
          relayer can be completely untrusted and the money is still safe.
        </p>
        <h3>The link is a key, not a password</h3>
        <p>
          When you create a money link, Damla generates a fresh keypair just for that link. The
          public address goes on-chain as the owner of the escrowed funds. The private key lives in
          the part of the URL after the <span className="mono">#</span>, which browsers never send to
          any server. That private key is the whole secret. Whoever holds the link holds the key, and
          the key is the only thing the contract listens to.
        </p>
        <h3>The signature names the destination</h3>
        <p>
          Here is the part that closes the door on theft. To claim, the recipient&apos;s browser spins
          up its own throwaway wallet and produces a signature using the link key. That signature does
          not just say &quot;release the funds.&quot; It says &quot;release the funds{" "}
          <b>to this exact address</b>.&quot; The destination is baked into the signed message. The
          contract checks the signature against the link&apos;s public address and confirms the payout
          target matches what was signed.
        </p>
        <p>
          The relayer sits in the middle of this and carries the signed message to the chain, paying
          the gas along the way. But it cannot edit the message. If it swaps in its own address, the
          signature no longer matches and the contract rejects the whole thing. The relayer&apos;s
          only real power is <b>when</b> to submit, never <b>where</b> the money lands.
        </p>
        <h3>What you actually trust</h3>
        <p>
          You trust math you can verify: an ephemeral key, a signature that binds the payout address,
          and a contract that refuses to pay anyone else. You do not trust me, and you do not trust
          the relayer&apos;s good behavior. Worst case, a broken relayer means a claim is delayed, and
          since every link has a 24-hour expiry, the sender can always reclaim from{" "}
          <Link href="/links">my links</Link>. Funds never get stuck and never get stolen. That is the
          bar gasless should clear, and it is the bar Damla is built to.
        </p>
      </div>
    ),
  },
  {
    slug: "send-money-like-water",
    title: "Send money like water",
    date: "July 2026",
    dek: "One link, a walletless claim, group drops that split themselves. Where this is going.",
    content: (
      <div className="prose">
        <h2>Send money like water</h2>
        <p>
          I keep coming back to the same picture. You turn a tap and water flows, and you never once
          think about the reservoir or the pipes or the pressure. That invisibility is the goal. Money
          moving between people should ask for as little attention as filling a glass. Damla is my
          attempt to get there, one link at a time.
        </p>
        <p>
          The core is deliberately small. Lock some MON, get a link, share it. The person on the other
          end taps it and the money is theirs, with no wallet to install and no gas to buy. If you have
          ever tried to hand someone crypto and watched their eyes glaze over at the word
          &quot;seed phrase&quot;, you already understand why this matters. The drop should reach them
          before they have to learn anything.
        </p>
        <h3>From one drop to a stream</h3>
        <p>
          A single link is the raindrop. The next shape is a puddle everyone can dip into.{" "}
          <b>Group drops</b> are already here: you fund one pool, set how many shares it holds, and the
          first people to open the link each catch an equal splash. It is the tip jar, the giveaway,
          the &quot;first ten friends get lunch&quot; moment, without a spreadsheet of addresses. You
          can try it on the <Link href="/drop">drop page</Link> right now.
        </p>
        <p>
          Where does the stream go from there? I want links you can top up so a drop becomes an ongoing
          trickle. I want a claim that feels instant enough to hand across a table. I want the sender
          side to eventually loosen too, so even giving becomes lighter. None of that changes the
          promise at the center: the person receiving should never have to become a crypto user to
          receive.
        </p>
        <h3>Why the metaphor holds</h3>
        <p>
          Water is the honest comparison because water does not care who you are. It finds the lowest,
          easiest path and it gets there. Most crypto still makes people climb uphill to receive value,
          which is backwards. A drop should fall toward the person, not the other way around.
        </p>
        <p>
          So that is the direction. Fewer steps, fewer walls, more flow. If you want to feel it instead
          of read about it, go <Link href="/send">make a link</Link> and send it to someone who has
          never touched a wallet. Watch how fast the confusion turns into &quot;wait, that was it?&quot;
          That moment is the entire point.
        </p>
      </div>
    ),
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
