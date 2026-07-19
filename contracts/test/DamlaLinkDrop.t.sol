// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamlaLinkDrop} from "../src/DamlaLinkDrop.sol";

contract DamlaLinkDropTest is Test {
    DamlaLinkDrop internal drop;

    address internal sender = address(0xA11CE);
    address internal relayer = address(0xB0B); // pays gas, must not be able to steal
    address internal payout = address(0xCAFE);

    // ephemeral link key
    uint256 internal linkPk = 0xA11CE0000000000000000000000000000000000000000000000000000000001;
    address internal linkAddr;

    function setUp() public {
        drop = new DamlaLinkDrop();
        linkAddr = vm.addr(linkPk);
        vm.deal(sender, 100 ether);
    }

    // build the exact digest the contract signs over
    function _sign(uint256 pk, address _linkAddr, address _payout) internal view returns (bytes memory) {
        bytes32 inner = keccak256(abi.encodePacked(address(drop), block.chainid, _linkAddr, _payout));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _deposit(uint256 amount, uint64 expiry) internal {
        vm.prank(sender);
        drop.deposit{value: amount}(linkAddr, expiry);
    }

    function testDepositStoresDrop() public {
        _deposit(1 ether, uint64(block.timestamp + 1 days));
        (address s, uint256 a, uint64 e, bool c) = drop.getDrop(linkAddr);
        assertEq(s, sender);
        assertEq(a, 1 ether);
        assertEq(e, uint64(block.timestamp + 1 days));
        assertEq(c, false);
        assertEq(address(drop).balance, 1 ether);
    }

    function testDepositRejectsZeroValue() public {
        vm.prank(sender);
        vm.expectRevert(DamlaLinkDrop.BadInput.selector);
        drop.deposit{value: 0}(linkAddr, uint64(block.timestamp + 1 days));
    }

    function testDepositRejectsZeroLinkAddr() public {
        vm.prank(sender);
        vm.expectRevert(DamlaLinkDrop.BadInput.selector);
        drop.deposit{value: 1 ether}(address(0), uint64(block.timestamp + 1 days));
    }

    function testDepositRejectsDuplicate() public {
        _deposit(1 ether, uint64(block.timestamp + 1 days));
        vm.prank(sender);
        vm.expectRevert(DamlaLinkDrop.AlreadyExists.selector);
        drop.deposit{value: 1 ether}(linkAddr, uint64(block.timestamp + 1 days));
    }

    function testClaimPaysPayout() public {
        _deposit(5 ether, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, payout);

        uint256 before = payout.balance;
        drop.claim(linkAddr, payout, sig);
        assertEq(payout.balance, before + 5 ether);

        (,,, bool claimed) = drop.getDrop(linkAddr);
        assertTrue(claimed);
        assertEq(address(drop).balance, 0);
    }

    /// The key property: a third-party relayer submits the tx, but funds still go only to payout.
    function testRelayerCannotRedirect() public {
        _deposit(3 ether, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, payout);

        // relayer submits, but signature is over `payout`, not the relayer
        uint256 relayerBefore = relayer.balance;
        vm.prank(relayer);
        drop.claim(linkAddr, payout, sig);

        assertEq(payout.balance, 3 ether); // signed recipient got everything
        assertEq(relayer.balance, relayerBefore); // relayer got nothing

        // relayer trying to claim to itself with the payout-signed sig must fail
        // (fresh deposit under a new link)
        // handled by testClaimWrongPayoutReverts below
    }

    function testClaimRejectsSecondClaim() public {
        _deposit(2 ether, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, payout);
        drop.claim(linkAddr, payout, sig);

        vm.expectRevert(DamlaLinkDrop.AlreadyClaimed.selector);
        drop.claim(linkAddr, payout, sig);
    }

    function testClaimWrongPayoutReverts() public {
        _deposit(2 ether, uint64(block.timestamp + 1 days));
        // signature is for `payout`, but caller passes a different payout (relayer trying to steal)
        bytes memory sig = _sign(linkPk, linkAddr, payout);
        vm.prank(relayer);
        vm.expectRevert(DamlaLinkDrop.BadSignature.selector);
        drop.claim(linkAddr, relayer, sig);
    }

    function testClaimWrongSignerReverts() public {
        _deposit(2 ether, uint64(block.timestamp + 1 days));
        uint256 wrongPk = 0xDEAD;
        bytes memory sig = _sign(wrongPk, linkAddr, payout);
        vm.expectRevert(DamlaLinkDrop.BadSignature.selector);
        drop.claim(linkAddr, payout, sig);
    }

    function testClaimNothingHereReverts() public {
        bytes memory sig = _sign(linkPk, linkAddr, payout);
        vm.expectRevert(DamlaLinkDrop.NothingHere.selector);
        drop.claim(linkAddr, payout, sig);
    }

    function testReclaimBeforeExpiryReverts() public {
        _deposit(1 ether, uint64(block.timestamp + 1 days));
        vm.prank(sender);
        vm.expectRevert(DamlaLinkDrop.NotExpired.selector);
        drop.reclaim(linkAddr);
    }

    function testReclaimByNonSenderReverts() public {
        _deposit(1 ether, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 2 days);
        vm.prank(relayer);
        vm.expectRevert(DamlaLinkDrop.NotSender.selector);
        drop.reclaim(linkAddr);
    }

    function testReclaimAfterExpiryRefundsSender() public {
        _deposit(4 ether, uint64(block.timestamp + 1 days));
        uint256 before = sender.balance;
        vm.warp(block.timestamp + 2 days);
        vm.prank(sender);
        drop.reclaim(linkAddr);
        assertEq(sender.balance, before + 4 ether);
        (,,, bool claimed) = drop.getDrop(linkAddr);
        assertTrue(claimed);
    }

    function testReclaimAfterClaimReverts() public {
        _deposit(1 ether, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, payout);
        drop.claim(linkAddr, payout, sig);
        vm.warp(block.timestamp + 2 days);
        vm.prank(sender);
        vm.expectRevert(DamlaLinkDrop.AlreadyClaimed.selector);
        drop.reclaim(linkAddr);
    }
}
