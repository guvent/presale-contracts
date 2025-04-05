// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract FairLaunchBase {
    struct fairLaunchInfo {
        uint256 saleStartTime;
        uint256 saleEndTime;
        uint8 teamShare;
        address tokenOnSale;
        address wethAddress;
        uint128 minDeposit;
        uint128 maxDeposit;
        uint256 minBuyPerUser;
        uint256 maxBuyPerUser;
    }


    event DepositTokens(
        address indexed _address,
        uint256 _tokensForClaiming,
        uint256 _tokensForLiquidity
    );
    event Finalize(
        address indexed _address,
        uint256 _tokensForLiquidity,
        uint256 _totalEthDeposited
    );


    event CancelFairLaunch(address indexed _address, uint256 _amount);

    event DepositETH(address indexed _address, uint256 _amount);

    event ClaimTokens(address indexed _address, uint256 _amount);

    event WithdrawETH(address indexed _address, uint256 _amount);

    fairLaunchInfo public info;

    // PancakeRouter addresses
    address public constant PancakeRouter_Test =
        0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
    address public constant PancakeRouter_Main =
        0x10ED43C718714eb63d5aA57B78B54704E256024E;

    address public constant PancakeFactory_Test =
        0x6725F303b657a9451d8BA641348b6761A6CC7a17;
    address public constant PancakeFactory_Main =
        0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
}
