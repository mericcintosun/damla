// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Damla Gift — a welcome gift of MON for the first users, tracked fully on-chain.
/// @notice The first `MAX` unique recipients each receive `GIFT` MON so they can transact on Monad.
///         Only the owner (the Damla relayer) may trigger a gift, so users never pay gas to receive
///         it, and each address can be gifted at most once. The counter is on-chain, so the
///         "N of 20 claimed" number shown in the app is the real, verifiable state.
contract DamlaGift {
    address public owner;
    uint256 public constant GIFT = 0.6 ether;
    uint32 public immutable MAX;
    uint32 public claimedCount;
    mapping(address => bool) public claimed;

    event Gifted(address indexed to, uint32 count);
    event OwnerChanged(address indexed newOwner);

    error NotOwner();
    error AlreadyGifted();
    error SoldOut();
    error PoolEmpty();
    error TransferFailed();
    error BadInput();

    constructor(uint32 maxGifts) payable {
        if (maxGifts == 0) revert BadInput();
        owner = msg.sender;
        MAX = maxGifts;
    }

    receive() external payable {}

    /// @notice Send the welcome gift to `to`. Owner only. One gift per address, capped at MAX.
    function claimGift(address to) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0)) revert BadInput();
        if (claimed[to]) revert AlreadyGifted();
        if (claimedCount >= MAX) revert SoldOut();
        if (address(this).balance < GIFT) revert PoolEmpty();

        claimed[to] = true;
        claimedCount += 1;
        (bool ok,) = to.call{value: GIFT}("");
        if (!ok) revert TransferFailed();
        emit Gifted(to, claimedCount);
    }

    /// @notice Gifts still available.
    function remaining() external view returns (uint32) {
        return claimedCount >= MAX ? 0 : MAX - claimedCount;
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        if (newOwner == address(0)) revert BadInput();
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }

    /// @notice Owner can recover leftover MON after the campaign.
    function withdraw(address to) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0)) revert BadInput();
        (bool ok,) = to.call{value: address(this).balance}("");
        if (!ok) revert TransferFailed();
    }
}
