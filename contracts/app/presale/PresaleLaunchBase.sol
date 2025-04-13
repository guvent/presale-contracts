// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

uint256 constant PRECISION_RATE_SCALE = 10 ** 18;

contract PresaleLaunchBase {
    struct presaleInfo {
        uint256 saleStartTime;
        uint256 saleEndTime;
        uint256 minBuyPerUser;
        uint256 maxBuyPerUser;
        uint256 hardCap;
        uint256 softCap;
        //////
        address saleTokenAddress;
        address fundTokenAddress;
        //////
        uint256 presaleRate;
        //////
        uint256 listingRate;
        uint256 liquidityRate;
        uint256 protocolFeeRate;
        //////
        uint8 refundType; // "0" for refund, "1" for burn
    }

    // PancakeRouter addresses
    address public constant PancakeRouterAddress =
        0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

    // presale info
    presaleInfo public info;

    modifier onlyPresaleActive(uint256 _amount) {
        require(_amount > 0, "Token amount is 0");
        require(_amount >= info.minBuyPerUser, "Amount is less than min buy");
        require(_amount <= info.maxBuyPerUser, "Amount is more than max buy");
        require(block.timestamp <= info.saleEndTime, "Sale ended");
        require(block.timestamp >= info.saleStartTime, "Sale not started");
        _;
    }

    event Burned(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);
    event Refunded(address indexed user, uint256 amount);
    event UnsoldTokens(address indexed user, uint256 amount);
    event Withdrawn(
        address indexed user,
        address indexed token,
        uint256 amount
    );
    event TokenBought(
        address indexed user,
        uint256 amount,
        uint256 tokenAmount
    );
    event PresaleInitialized(
        presaleInfo info,
        address protocolAddress,
        address presaleLaunchProgram
    );
    event PresaleFinalized(uint256 totalSaleBought, uint256 totalFundReceived);
    event MintLiquidity(uint256 amountA, uint256 amountB, uint256 liquidity);
}
