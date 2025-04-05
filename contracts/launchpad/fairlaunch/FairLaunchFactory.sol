// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./FairLaunchProgram.sol";

import "hardhat/console.sol";

contract FairLaunchFactory is Ownable {
    event FairLaunchProgramCreated(address indexed _fairLaunchProgram);

    mapping(address => FairLaunchBase.fairLaunchInfo) public fairLaunchPrograms;

    constructor() Ownable() {
        console.log("* FairLaunchFactory deployed");
    }

    function create(
        FairLaunchBase.fairLaunchInfo memory _fairLaunchInfo,
        uint256 _tokenClaim, // in wei
        uint256 _tokenLiquidity // in wei
    ) public returns (address) {
        address fairLaunchProgram = address(new FairLaunchProgram());

        ERC1967Proxy proxy = new ERC1967Proxy(
            fairLaunchProgram,
            abi.encodeWithSelector(
                FairLaunchProgram(address(0)).initialize.selector,
                msg.sender,
                _fairLaunchInfo
            )
        );

        // FairLaunchProgram(address(proxy)).depositTokens(
        //     _tokenClaim,
        //     _tokenLiquidity
        // );

        (bool success, ) = address(proxy).delegatecall(
            abi.encodeWithSelector(
                FairLaunchProgram(address(0)).depositTokens.selector,
                _tokenClaim,
                _tokenLiquidity
            )
        );

        require(success, "Failed to deposit tokens");

        fairLaunchPrograms[address(proxy)] = _fairLaunchInfo;

        emit FairLaunchProgramCreated(address(proxy));

        return address(proxy);
    }
}
