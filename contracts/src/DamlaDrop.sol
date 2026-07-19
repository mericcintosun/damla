// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Damla Drop — one public link, the first N people each claim an equal slice.
/// @notice Like DamlaLinkDrop but many-claim: a sender funds a pool split into `slots` equal
///         shares. Anyone who opens the (public) link can claim one share, walletless and gasless,
///         because a relayer submits the tx. As with the single link, the share can ONLY be paid to
///         the address the claimer signed for, so the relayer can never redirect funds. Each payout
///         address may claim at most once; leftover shares are reclaimable by the sender after expiry.
contract DamlaDrop {
    struct Pool {
        address sender;
        uint256 amountPerClaim;
        uint256 remaining;
        uint32 slots;
        uint32 claimed;
        uint64 expiry;
    }

    /// keyed by the link's address (the address of the secret shared in the public link)
    mapping(address => Pool) public pools;
    /// pool link => payout => already claimed
    mapping(address => mapping(address => bool)) public claimedBy;

    event DropCreated(address indexed linkAddr, address indexed sender, uint256 total, uint32 slots, uint64 expiry);
    event DropClaimed(address indexed linkAddr, address indexed payout, uint256 amount, uint32 claimed, uint32 slots);
    event DropReclaimed(address indexed linkAddr, address indexed sender, uint256 amount);

    error AlreadyExists();
    error NothingHere();
    error BadSignature();
    error DropEmpty();
    error AlreadyClaimedThis();
    error NotExpired();
    error NotSender();
    error TransferFailed();
    error BadInput();

    /// @notice Fund a pool of `slots` equal shares behind `linkAddr`.
    function createDrop(address linkAddr, uint32 slots, uint64 expiry) external payable {
        if (linkAddr == address(0) || slots == 0 || msg.value < slots) revert BadInput();
        if (pools[linkAddr].sender != address(0)) revert AlreadyExists();
        uint256 per = msg.value / slots;
        pools[linkAddr] = Pool({
            sender: msg.sender,
            amountPerClaim: per,
            remaining: msg.value,
            slots: slots,
            claimed: 0,
            expiry: expiry
        });
        emit DropCreated(linkAddr, msg.sender, msg.value, slots, expiry);
    }

    /// @notice Claim one share to the signed `payout`. Submittable by anyone (a relayer pays gas).
    function claim(address linkAddr, address payout, bytes calldata sig) external {
        if (payout == address(0)) revert BadInput();
        Pool storage p = pools[linkAddr];
        if (p.sender == address(0)) revert NothingHere();
        if (p.claimed >= p.slots) revert DropEmpty();
        if (claimedBy[linkAddr][payout]) revert AlreadyClaimedThis();

        bytes32 digest = _digest(linkAddr, payout);
        if (_recover(digest, sig) != linkAddr) revert BadSignature();

        claimedBy[linkAddr][payout] = true;
        p.claimed += 1;
        uint256 amount = p.amountPerClaim;
        p.remaining -= amount;

        (bool ok,) = payout.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit DropClaimed(linkAddr, payout, amount, p.claimed, p.slots);
    }

    /// @notice After expiry, the sender reclaims any unclaimed shares (and dust).
    function reclaim(address linkAddr) external {
        Pool storage p = pools[linkAddr];
        if (p.sender == address(0)) revert NothingHere();
        if (block.timestamp < p.expiry) revert NotExpired();
        if (msg.sender != p.sender) revert NotSender();
        uint256 amount = p.remaining;
        if (amount == 0) revert DropEmpty();
        p.remaining = 0;
        (bool ok,) = p.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit DropReclaimed(linkAddr, p.sender, amount);
    }

    function getPool(address linkAddr)
        external
        view
        returns (
            address sender,
            uint256 amountPerClaim,
            uint256 remaining,
            uint32 slots,
            uint32 claimed,
            uint64 expiry
        )
    {
        Pool storage p = pools[linkAddr];
        return (p.sender, p.amountPerClaim, p.remaining, p.slots, p.claimed, p.expiry);
    }

    function _digest(address linkAddr, address payout) internal view returns (bytes32) {
        bytes32 inner = keccak256(abi.encodePacked(address(this), block.chainid, linkAddr, payout));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
    }

    function _recover(bytes32 digest, bytes calldata sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }
}
