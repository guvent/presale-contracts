// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

contract PresaleLaunchBase {
    struct presaleInfo{
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
        require(msg.sender == address(this), "Only PresaleLaunchProgram can call this function");
        _;
    }
}
