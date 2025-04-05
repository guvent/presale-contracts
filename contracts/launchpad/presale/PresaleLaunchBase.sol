// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

contract PresaleLaunchBase {
    struct presaleInfo {
        uint256 saleStartTime;
        uint256 saleEndTime;
        uint256 minBuyPerUser;
        uint256 maxBuyPerUser;
        address tokenOnSale;
        uint hardCap;
        uint softCap;
        uint presaleRate;
        uint listingRate;
        uint liquidityPercent;
        uint BNBFee;
        uint refundType; // "0" for refund, "1" for burn
    }

    modifier onlyPresaleLaunchProgram() {
        require(
            msg.sender == address(this),
            "Only PresaleLaunchProgram can call this function"
        );
        _;
    }

    presaleInfo public info;

    // PancakeRouter addresses
    address public constant PancakeRouter_Test =
        0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
    address public constant PancakeRouter_Main =
        0x10ED43C718714eb63d5aA57B78B54704E256024E;
}
