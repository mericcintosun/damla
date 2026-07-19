// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DamlaLinkDrop} from "../src/DamlaLinkDrop.sol";

contract Deploy is Script {
    function run() external returns (DamlaLinkDrop dropContract) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        dropContract = new DamlaLinkDrop();
        vm.stopBroadcast();
        console.log("DamlaLinkDrop deployed at:", address(dropContract));
    }
}
