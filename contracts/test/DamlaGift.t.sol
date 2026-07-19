// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DamlaGift} from "../src/DamlaGift.sol";

contract DamlaGiftTest is Test {
    DamlaGift internal gift;
    address internal owner = address(0xABBA);
    address internal stranger = address(0xBAD);

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.prank(owner);
        gift = new DamlaGift{value: 12 ether}();
    }

    function testInitialState() public view {
        assertEq(gift.owner(), owner);
        assertEq(gift.claimedCount(), 0);
        assertEq(gift.remaining(), 20);
        assertEq(address(gift).balance, 12 ether);
    }

    function testOwnerGifts() public {
        address u = address(0x1234);
        vm.prank(owner);
        gift.claimGift(u);
        assertEq(u.balance, 0.6 ether);
        assertEq(gift.claimedCount(), 1);
        assertEq(gift.remaining(), 19);
        assertTrue(gift.claimed(u));
    }

    function testOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(DamlaGift.NotOwner.selector);
        gift.claimGift(address(0x1234));
    }

    function testNoDoubleGift() public {
        address u = address(0x1234);
        vm.startPrank(owner);
        gift.claimGift(u);
        vm.expectRevert(DamlaGift.AlreadyGifted.selector);
        gift.claimGift(u);
        vm.stopPrank();
    }

    function testCapAt20() public {
        vm.startPrank(owner);
        for (uint160 i = 1; i <= 20; i++) {
            gift.claimGift(address(uint160(0x100000) + i));
        }
        assertEq(gift.claimedCount(), 20);
        assertEq(gift.remaining(), 0);
        vm.expectRevert(DamlaGift.SoldOut.selector);
        gift.claimGift(address(0xABCD));
        vm.stopPrank();
    }

    function testWithdraw() public {
        address sink = address(0xF00D);
        vm.prank(owner);
        gift.withdraw(sink);
        assertEq(sink.balance, 12 ether);
        assertEq(address(gift).balance, 0);
    }

    function testPoolEmptyReverts() public {
        // drain via withdraw, then a gift should fail with PoolEmpty
        vm.startPrank(owner);
        gift.withdraw(owner);
        vm.expectRevert(DamlaGift.PoolEmpty.selector);
        gift.claimGift(address(0x1234));
        vm.stopPrank();
    }
}
