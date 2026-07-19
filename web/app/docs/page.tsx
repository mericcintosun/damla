import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/Brand";
import { CONTRACT, DROP_CONTRACT } from "@/lib/contract";
import { addrUrl } from "@/lib/chain";
import "./docs.css";

export const metadata: Metadata = {
  title: "Developer Docs · Damla",
  description:
    "Developer documentation for Damla: the two Monad contracts, the walletless and gasless model, the claim signature scheme, the contract reference, the relayer API, and how to run it locally.",
};

const ARCH_DIAGRAM = `  sender wallet
       |
       |  deposit(linkAddr, expiry)  /  createDrop(linkAddr, slots, expiry)
       v
  +-------------------+        the money is now escrowed against linkAddr,
  |  Damla contract   |  <---  released only to an address the link key signs
  |  (escrow on Monad)|
  +-------------------+
       ^
       |  claim(linkAddr, payout, sig)   <- tx submitted and paid by relayer
       |
  +-------------------+        recipient signs "pay this drop to <payout>"
  |  relayer (server) |  <---  with the ephemeral link key from the URL fragment
  +-------------------+
       |
       |  contract recovers signer, checks it equals linkAddr, then pays out
       v
  payout address (recipient's throwaway wallet)  -- receives the funds, pays no gas`;

const SIG_SNIPPET = `import { keccak256, encodePacked, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// The exact digest both contracts hash over in _digest().
// keccak256(abi.encodePacked(contractAddress, chainId, linkAddr, payout))
function claimInnerDigest(
  contract: \`0x\${string}\`,
  chainId: number,
  linkAddr: \`0x\${string}\`,
  payout: \`0x\${string}\`
): Hex {
  return keccak256(
    encodePacked(
      ["address", "uint256", "address", "address"],
      [contract, BigInt(chainId), linkAddr, payout]
    )
  );
}

// The ephemeral link private key (carried in the URL fragment) signs the digest.
// signMessage with { raw } produces an EIP-191 personal_sign:
//   keccak256("\\x19Ethereum Signed Message:\\n32" || inner)
async function signClaim(
  secret: Hex,               // the link private key from the fragment
  contract: \`0x\${string}\`,
  chainId: number,
  linkAddr: \`0x\${string}\`,   // = address derived from the secret
  payout: \`0x\${string}\`      // where the funds must go
): Promise<Hex> {
  const link = privateKeyToAccount(secret);
  const inner = claimInnerDigest(contract, chainId, linkAddr, payout);
  return link.signMessage({ message: { raw: inner } });
}`;

const REQ_CLAIM = `POST /api/relay
Content-Type: application/json

{
  "action": "claim",
  "linkAddr": "0xLinkAddressDerivedFromTheSecret",
  "payout": "0xRecipientPayoutAddress",
  "sig": "0x<130 hex chars: r || s || v>"
}`;

const RES_OK = `{ "hash": "0xTransactionHash" }`;
const RES_ERR = `{ "error": "Signature check failed for this payout." }`;

const REQ_DROPCLAIM = `POST /api/relay
Content-Type: application/json

{
  "action": "dropclaim",
  "linkAddr": "0xPoolLinkAddress",
  "payout": "0xRecipientPayoutAddress",
  "sig": "0x<130 hex chars>"
}`;

const REQ_RECLAIM = `POST /api/relay
Content-Type: application/json

{
  "action": "reclaim",
  "linkAddr": "0xLinkAddress"
}`;

const REQ_SPONSOR = `POST /api/relay
Content-Type: application/json

{
  "action": "sponsor",
  "to": "0xThrowawayWalletAddress"
}`;

const RES_SPONSOR = `{ "hash": "0xTransactionHash", "amount": "60000000000000000" }`;

const ENV_BLOCK = `# Client-readable (safe to expose)
NEXT_PUBLIC_CONTRACT=0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1
NEXT_PUBLIC_DROP_CONTRACT=0x7d105954B5A597375CFA4b6a5e08fB8e4bfb953d
NEXT_PUBLIC_CHAIN_ID=143
NEXT_PUBLIC_RPC_URL=https://rpc.monad.xyz
NEXT_PUBLIC_EXPLORER=https://monadscan.com

# Server-only. A funded mainnet key used ONLY to pay gas for
# claim / dropclaim / reclaim and the demo sponsor. Never expose it.
RELAYER_PRIVATE_KEY=0xYourFundedRelayerKey`;

const LOCAL_STEPS = `git clone <your-fork-url> damla
cd damla/web
cp .env.example .env.local   # then fill in the values below
npm install
npm run dev                  # http://localhost:3000`;

export default function Docs() {
  return (
    <div className="wrap">
      <TopBar />
      <div className="card">
        <div className="prose">
          <h2>Build on Damla</h2>
          <p>
            Damla sends money by a link on Monad. The person receiving needs no
            wallet and pays no gas. This page covers the two on-chain contracts,
            the claim signature that keeps custody trustless, the relayer API,
            and how to run the app locally. Everything here targets{" "}
            <b>Monad</b> (chainId <span className="mono">143</span>).
          </p>

          <div className="docs-toc">
            <p className="docs-toc-title">On this page</p>
            <ol>
              <li>
                <a href="#overview">Overview</a>
              </li>
              <li>
                <a href="#architecture">Architecture</a>
              </li>
              <li>
                <a href="#signature">The signature scheme</a>
              </li>
              <li>
                <a href="#contracts">Contract reference</a>
              </li>
              <li>
                <a href="#relayer">Relayer API reference</a>
              </li>
              <li>
                <a href="#local">Run it locally</a>
              </li>
            </ol>
          </div>

          {/* 1. Overview ------------------------------------------------------ */}
          <div id="overview" className="docs-section">
            <h3>1. Overview</h3>
            <p>
              Damla is a link that carries money. A sender escrows MON against a
              fresh, single-use key; whoever opens the link claims the funds into
              any address they control. There are two contracts, both live on
              Monad:
            </p>
            <div className="row">
              <span className="k">DamlaLinkDrop</span>
              <span className="v">
                One-to-one. One deposit, one claim.{" "}
                <a
                  href={addrUrl(CONTRACT)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono link-accent"
                >
                  {CONTRACT} ↗
                </a>
              </span>
            </div>
            <div className="row">
              <span className="k">DamlaDrop</span>
              <span className="v">
                One-to-many. One deposit splits into <span className="mono">N</span>{" "}
                equal shares; the first N distinct claimers each take one.{" "}
                <a
                  href={addrUrl(DROP_CONTRACT)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono link-accent"
                >
                  {DROP_CONTRACT} ↗
                </a>
              </span>
            </div>
            <p>
              <b>Walletless</b> means the recipient never installs or connects a
              wallet: the page mints a throwaway key in the browser and claims to
              it. <b>Gasless</b> means the recipient holds zero balance, because
              a relayer submits the claim transaction and pays the gas. The
              relayer can only decide <b>when</b> a claim lands, never{" "}
              <b>where</b> the funds go, since the payout address is fixed inside
              a signature made by the link key.
            </p>
          </div>

          <div className="divider" />

          {/* 2. Architecture ------------------------------------------------- */}
          <div id="architecture" className="docs-section">
            <h3>2. Architecture</h3>
            <p>
              The flow is: sender escrows into the contract, the recipient signs
              a payout authorization with the link key, and the relayer relays
              that signature on-chain while paying gas. The contract releases
              funds only to the signed payout.
            </p>
            <pre className="docs-pre">{ARCH_DIAGRAM}</pre>
            <p>
              The key never touches a server. It lives in the URL fragment (after
              the <span className="mono">#</span>), which browsers do not send in
              requests. The relayer only ever sees a finished signature plus the
              payout it authorizes.
            </p>
          </div>

          <div className="divider" />

          {/* 3. Signature scheme --------------------------------------------- */}
          <div id="signature" className="docs-section">
            <h3>3. The signature scheme</h3>
            <p>
              A claim is authorized by an EIP-191 personal_sign over a keccak256
              digest. The inner digest is:
            </p>
            <pre className="docs-pre">
              {
                "inner = keccak256(abi.encodePacked(contractAddress, chainId, linkAddr, payout))\nsig   = personal_sign(inner)   // signed by the ephemeral link private key"
              }
            </pre>
            <p>
              The <span className="mono">payout</span> address is part of the
              signed bytes. The contract recovers the signer from{" "}
              <span className="mono">sig</span> and requires it to equal{" "}
              <span className="mono">linkAddr</span> (the address derived from the
              link key). Because the relayer never holds the link key, it cannot
              produce a signature for a different payout. Change the payout by one
              character and the recovered signer no longer matches{" "}
              <span className="mono">linkAddr</span>, so the contract reverts with{" "}
              <span className="mono">BadSignature</span>. A fully compromised
              relayer can waste its own gas and nothing else. Here is the exact
              signing code with viem:
            </p>
            <pre className="docs-pre">{SIG_SNIPPET}</pre>
            <p>
              Both contracts hash the same four fields in the same order, so the
              only difference between a link claim and a drop claim is which
              contract address you pass in.
            </p>
          </div>

          <div className="divider" />

          {/* 4. Contract reference ------------------------------------------- */}
          <div id="contracts" className="docs-section">
            <h3>4. Contract reference</h3>

            <p>
              <b>DamlaLinkDrop</b> (one-to-one).{" "}
              <a
                href={addrUrl(CONTRACT)}
                target="_blank"
                rel="noreferrer"
                className="mono link-accent"
              >
                {CONTRACT} ↗
              </a>
            </p>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Params</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="mono">deposit</span>
                      <br />
                      <span className="badge">payable</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>,{" "}
                      <span className="mono">uint64 expiry</span>
                    </td>
                    <td>
                      Escrows <span className="mono">msg.value</span> against{" "}
                      <span className="mono">linkAddr</span> until{" "}
                      <span className="mono">expiry</span>. One deposit per link
                      address.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">claim</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>,{" "}
                      <span className="mono">address payout</span>,{" "}
                      <span className="mono">bytes sig</span>
                    </td>
                    <td>
                      Verifies <span className="mono">sig</span> recovers to{" "}
                      <span className="mono">linkAddr</span>, then sends the full
                      amount to <span className="mono">payout</span>. Anyone can
                      submit; only the signed payout is paid.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">reclaim</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>
                    </td>
                    <td>
                      After <span className="mono">expiry</span>, returns the
                      escrowed amount to the original sender. Reverts if not
                      expired or not the sender.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">getDrop</span>
                      <br />
                      <span className="badge">view</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>
                    </td>
                    <td>
                      Returns{" "}
                      <span className="mono">
                        (address sender, uint256 amount, uint64 expiry, bool
                        claimed)
                      </span>
                      .
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <b>DamlaDrop</b> (one-to-many).{" "}
              <a
                href={addrUrl(DROP_CONTRACT)}
                target="_blank"
                rel="noreferrer"
                className="mono link-accent"
              >
                {DROP_CONTRACT} ↗
              </a>
            </p>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Function</th>
                    <th>Params</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="mono">createDrop</span>
                      <br />
                      <span className="badge">payable</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>,{" "}
                      <span className="mono">uint32 slots</span>,{" "}
                      <span className="mono">uint64 expiry</span>
                    </td>
                    <td>
                      Splits <span className="mono">msg.value</span> into{" "}
                      <span className="mono">slots</span> equal shares. The first{" "}
                      <span className="mono">slots</span> distinct payouts each
                      take one share.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">claim</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>,{" "}
                      <span className="mono">address payout</span>,{" "}
                      <span className="mono">bytes sig</span>
                    </td>
                    <td>
                      Verifies the signature, then sends one share to{" "}
                      <span className="mono">payout</span>. Each payout address can
                      claim at most once per pool.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">reclaim</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>
                    </td>
                    <td>
                      After <span className="mono">expiry</span>, returns any
                      unclaimed remainder to the original sender.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="mono">getPool</span>
                      <br />
                      <span className="badge">view</span>
                    </td>
                    <td>
                      <span className="mono">address linkAddr</span>
                    </td>
                    <td>
                      Returns{" "}
                      <span className="mono">
                        (address sender, uint256 amountPerClaim, uint256
                        remaining, uint32 slots, uint32 claimed, uint64 expiry)
                      </span>
                      .
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="divider" />

          {/* 5. Relayer API -------------------------------------------------- */}
          <div id="relayer" className="docs-section">
            <h3>5. Relayer API reference</h3>
            <p>
              One endpoint, <span className="mono">POST /api/relay</span>, takes a
              JSON body with an <span className="mono">action</span> field. It
              returns <span className="mono">{"{ hash }"}</span> on success or{" "}
              <span className="mono">{"{ error }"}</span> with a 4xx status.
              Requests are rate limited per IP. The relayer simulates and
              gas-caps every transaction before submitting.
            </p>

            <p>
              <b>claim</b> relays a single-link claim on DamlaLinkDrop.
            </p>
            <pre className="docs-pre">{REQ_CLAIM}</pre>
            <pre className="docs-pre">{RES_OK}</pre>
            <p className="hint">
              On a failed signature or an already-claimed link, the response is a
              4xx with an error string, for example:
            </p>
            <pre className="docs-pre">{RES_ERR}</pre>

            <p>
              <b>dropclaim</b> relays a share claim on DamlaDrop. Same shape as{" "}
              <span className="mono">claim</span>, but routed to the multi-claim
              contract.
            </p>
            <pre className="docs-pre">{REQ_DROPCLAIM}</pre>
            <pre className="docs-pre">{RES_OK}</pre>

            <p>
              <b>reclaim</b> relays a reclaim. It only succeeds if the relayer key
              is the original sender for that link, so in practice reclaim runs
              from the sender&apos;s own wallet in the app; this action exists for
              relayer-owned deposits.
            </p>
            <pre className="docs-pre">{REQ_RECLAIM}</pre>
            <pre className="docs-pre">{RES_OK}</pre>

            <p>
              <b>sponsor</b> funds a throwaway wallet with a small fixed amount so
              a walletless user can try the send side. It refuses if the target
              already holds a balance above the demo threshold.
            </p>
            <pre className="docs-pre">{REQ_SPONSOR}</pre>
            <pre className="docs-pre">{RES_SPONSOR}</pre>
            <p className="hint">
              <span className="mono">amount</span> is returned in wei. The value
              above is 0.06 MON.
            </p>
          </div>

          <div className="divider" />

          {/* 6. Run locally -------------------------------------------------- */}
          <div id="local" className="docs-section">
            <h3>6. Run it locally</h3>
            <p>
              The app is a Next.js project in the <span className="mono">web</span>{" "}
              directory. Clone it, install, and start the dev server:
            </p>
            <pre className="docs-pre">{LOCAL_STEPS}</pre>
            <p>
              Fill <span className="mono">.env.local</span> with the values below.
              The <span className="mono">NEXT_PUBLIC_</span> vars are read by the
              browser and safe to expose. <span className="mono">RELAYER_PRIVATE_KEY</span>{" "}
              is server-only: it signs relayed transactions and pays gas, so keep
              it out of the client and out of version control.
            </p>
            <pre className="docs-pre">{ENV_BLOCK}</pre>
            <div className="note">
              Use a dedicated, low-balance mainnet key for the relayer. It only
              needs enough MON to cover gas for claims and the small demo sponsor.
              Never reuse a key that holds real value.
            </div>
          </div>

          <div className="mt">
            <Link href="/how-it-works" className="btn ghost">
              How it works
            </Link>{" "}
            <Link href="/send" className="btn">
              Create a money link →
            </Link>
          </div>
        </div>
      </div>

      <div className="foot">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">Common questions</Link>
        <a
          href={addrUrl(CONTRACT)}
          target="_blank"
          rel="noreferrer"
          className="mono"
        >
          Contract ↗
        </a>
      </div>
    </div>
  );
}
