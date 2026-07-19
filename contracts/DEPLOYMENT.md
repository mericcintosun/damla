# Deployment

Live on Monad mainnet.

## DamlaLinkDrop (one to one)

| Field | Value |
|---|---|
| Network | Monad mainnet |
| Chain ID | 143 |
| Address | 0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1 |
| Deploy tx | 0x0ef8efca72389ba851368136ac23cee7c57c1d2368ddee1750ee483428a8bfa4 |
| Explorer | https://monadscan.com/address/0x367F9BFc8E0A7270025914Eb5EF457A718bC5aE1 |

## DamlaDrop (one to many)

| Field | Value |
|---|---|
| Network | Monad mainnet |
| Chain ID | 143 |
| Address | 0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394 |
| Deploy tx | 0x1e9ed6784f69bad6842e13eb2319c5fe1bbc2b8c6dc521b9a76e21b15aa45635 |
| Explorer | https://monadscan.com/address/0xd9A80881Ac5D810043bEbF1754a7B0Ef61D7c394 |

Rebuild and redeploy with `forge create` or `forge script script/Deploy.s.sol` (see repo README).

## DamlaGift (welcome gift, 20 x 0.6 MON)

| Field | Value |
|---|---|
| Network | Monad mainnet |
| Chain ID | 143 |
| Address | 0x3c6a0f60d9FFe479E1e121b211D13703e4d80045 |
| Explorer | https://monadscan.com/address/0x3c6a0f60d9FFe479E1e121b211D13703e4d80045 |
| Owner | dedicated mainnet-only relayer (never used on testnet) |

Note: an earlier relayer key was reused from a public testnet and swept by a bot. We rotated to a
fresh mainnet-only key, recovered the gift pool, and relaunched the gift under the new safe owner.
