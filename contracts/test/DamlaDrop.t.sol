// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamlaDrop} from "../src/DamlaDrop.sol";

contract DamlaDropTest is Test {
    DamlaDrop internal drop;

    address internal sender = address(0xA11CE);
    address internal relayer = address(0xB0B);

    uint256 internal linkPk = 0xD40A0000000000000000000000000000000000000000000000000000000000A1;
    address internal linkAddr;

    function setUp() public {
        drop = new DamlaDrop();
        linkAddr = vm.addr(linkPk);
        vm.deal(sender, 100 ether);
    }

    function _sign(uint256 pk, address _link, address _payout) internal view returns (bytes memory) {
        bytes32 inner = keccak256(abi.encodePacked(address(drop), block.chainid, _link, _payout));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _create(uint256 total, uint32 slots, uint64 expiry) internal {
        vm.prank(sender);
        drop.createDrop{value: total}(linkAddr, slots, expiry);
    }

    function testCreateSplitsEqually() public {
        _create(3 ether, 3, uint64(block.timestamp + 1 days));
        (address s, uint256 per, uint256 rem, uint32 slots, uint32 claimed,) = drop.getPool(linkAddr);
        assertEq(s, sender);
        assertEq(per, 1 ether);
        assertEq(rem, 3 ether);
        assertEq(slots, 3);
        assertEq(claimed, 0);
    }

    function testCreateRejectsZeroSlots() public {
        vm.prank(sender);
        vm.expectRevert(DamlaDrop.BadInput.selector);
        drop.createDrop{value: 1 ether}(linkAddr, 0, uint64(block.timestamp + 1 days));
    }

    function testCreateRejectsValueBelowSlots() public {
        vm.prank(sender);
        vm.expectRevert(DamlaDrop.BadInput.selector);
        drop.createDrop{value: 2}(linkAddr, 3, uint64(block.timestamp + 1 days));
    }

    function testNPeopleEachClaimAShare() public {
        _create(3 ether, 3, uint64(block.timestamp + 1 days));
        address[3] memory ppl = [address(0x1111), address(0x2222), address(0x3333)];
        for (uint256 i = 0; i < 3; i++) {
            bytes memory sig = _sign(linkPk, linkAddr, ppl[i]);
            vm.prank(relayer); // a third-party relayer submits each claim
            drop.claim(linkAddr, ppl[i], sig);
            assertEq(ppl[i].balance, 1 ether);
        }
        (,, uint256 rem,, uint32 claimed,) = drop.getPool(linkAddr);
        assertEq(claimed, 3);
        assertEq(rem, 0);
    }

    function testFourthClaimRevertsWhenEmpty() public {
        _create(2 ether, 2, uint64(block.timestamp + 1 days));
        bytes memory s1 = _sign(linkPk, linkAddr, address(0x1111));
        bytes memory s2 = _sign(linkPk, linkAddr, address(0x2222));
        drop.claim(linkAddr, address(0x1111), s1);
        drop.claim(linkAddr, address(0x2222), s2);
        bytes memory s3 = _sign(linkPk, linkAddr, address(0x3333));
        vm.expectRevert(DamlaDrop.DropEmpty.selector);
        drop.claim(linkAddr, address(0x3333), s3);
    }

    function testSamePayoutCannotClaimTwice() public {
        _create(3 ether, 3, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, address(0x1111));
        drop.claim(linkAddr, address(0x1111), sig);
        vm.expectRevert(DamlaDrop.AlreadyClaimedThis.selector);
        drop.claim(linkAddr, address(0x1111), sig);
    }

    function testRelayerCannotRedirectShare() public {
        _create(2 ether, 2, uint64(block.timestamp + 1 days));
        // signature names 0x1111 as payout; relayer passes itself -> BadSignature
        bytes memory sig = _sign(linkPk, linkAddr, address(0x1111));
        vm.prank(relayer);
        vm.expectRevert(DamlaDrop.BadSignature.selector);
        drop.claim(linkAddr, relayer, sig);
    }

    function testWrongSignerReverts() public {
        _create(2 ether, 2, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(0xBADBAD, linkAddr, address(0x1111));
        vm.expectRevert(DamlaDrop.BadSignature.selector);
        drop.claim(linkAddr, address(0x1111), sig);
    }

    function testReclaimUnclaimedAfterExpiry() public {
        _create(3 ether, 3, uint64(block.timestamp + 1 days));
        bytes memory sig = _sign(linkPk, linkAddr, address(0x1111));
        drop.claim(linkAddr, address(0x1111), sig); // 1 of 3 claimed, 2 ether left

        vm.warp(block.timestamp + 2 days);
        uint256 before = sender.balance;
        vm.prank(sender);
        drop.reclaim(linkAddr);
        assertEq(sender.balance, before + 2 ether);
    }

    function testReclaimBeforeExpiryReverts() public {
        _create(2 ether, 2, uint64(block.timestamp + 1 days));
        vm.prank(sender);
        vm.expectRevert(DamlaDrop.NotExpired.selector);
        drop.reclaim(linkAddr);
    }

    function testReclaimByNonSenderReverts() public {
        _create(2 ether, 2, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 2 days);
        vm.prank(relayer);
        vm.expectRevert(DamlaDrop.NotSender.selector);
        drop.reclaim(linkAddr);
    }

    function testDustStaysReclaimable() public {
        // 10 wei across 3 slots => 3 per claim, 1 wei dust remains
        _create(10, 3, uint64(block.timestamp + 1 days));
        (, uint256 per,,,,) = drop.getPool(linkAddr);
        assertEq(per, 3);
        bytes memory sig = _sign(linkPk, linkAddr, address(0x1111));
        drop.claim(linkAddr, address(0x1111), sig);
        vm.warp(block.timestamp + 2 days);
        uint256 before = sender.balance;
        vm.prank(sender);
        drop.reclaim(linkAddr);
        assertEq(sender.balance, before + 7); // 10 - 3 claimed
    }
}
