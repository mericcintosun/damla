// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Damla LinkDrop
/// @notice Send native MON by link. The recipient claims walletless and gasless: a relayer may
///         submit the claim transaction and pay gas, but the funds can ONLY reach the payout
///         address that the link's ephemeral key signed. The relayer can never steal or redirect.
contract DamlaLinkDrop {
    struct Drop {
        address sender;
        uint256 amount;
        uint64 expiry;
        bool claimed;
    }

    /// keyed by the link's ephemeral address (the address of the secret carried in the URL fragment)
    mapping(address => Drop) public drops;

    event Deposited(address indexed linkAddr, address indexed sender, uint256 amount, uint64 expiry);
    event Claimed(address indexed linkAddr, address indexed payout, uint256 amount);
    event Reclaimed(address indexed linkAddr, address indexed sender, uint256 amount);

    error AlreadyExists();
    error NothingHere();
    error AlreadyClaimed();
    error BadSignature();
    error NotExpired();
    error NotSender();
    error TransferFailed();
    error BadInput();

    /// @notice Sender locks msg.value MON for whoever holds the link secret for linkAddr.
    function deposit(address linkAddr, uint64 expiry) external payable {
        if (linkAddr == address(0) || msg.value == 0) revert BadInput();
        if (drops[linkAddr].sender != address(0)) revert AlreadyExists();
        drops[linkAddr] = Drop({sender: msg.sender, amount: msg.value, expiry: expiry, claimed: false});
        emit Deposited(linkAddr, msg.sender, msg.value, expiry);
    }

    /// @notice Anyone (a relayer paying gas) may submit; funds go ONLY to the signed payout.
    function claim(address linkAddr, address payout, bytes calldata sig) external {
        if (payout == address(0)) revert BadInput();
        Drop storage d = drops[linkAddr];
        if (d.sender == address(0)) revert NothingHere();
        if (d.claimed) revert AlreadyClaimed();

        bytes32 digest = _digest(linkAddr, payout);
        if (_recover(digest, sig) != linkAddr) revert BadSignature();

        d.claimed = true; // effects before interaction
        uint256 amount = d.amount;
        (bool ok,) = payout.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Claimed(linkAddr, payout, amount);
    }

    /// @notice After expiry, the original sender can reclaim an unclaimed drop.
    function reclaim(address linkAddr) external {
        Drop storage d = drops[linkAddr];
        if (d.sender == address(0)) revert NothingHere();
        if (d.claimed) revert AlreadyClaimed();
        if (block.timestamp < d.expiry) revert NotExpired();
        if (msg.sender != d.sender) revert NotSender();

        d.claimed = true;
        uint256 amount = d.amount;
        (bool ok,) = d.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Reclaimed(linkAddr, d.sender, amount);
    }

    /// @notice Convenience view returning a drop as a tuple.
    function getDrop(address linkAddr)
        external
        view
        returns (address sender, uint256 amount, uint64 expiry, bool claimed)
    {
        Drop storage d = drops[linkAddr];
        return (d.sender, d.amount, d.expiry, d.claimed);
    }

    /// @notice EIP-191 personal_sign digest, bound to this contract and chain (anti-replay).
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
