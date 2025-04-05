// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "./FairLaunchBase.sol";

import "hardhat/console.sol";

contract FairLaunchProgram is FairLaunchBase, OwnableUpgradeable, UUPSUpgradeable {
    // amount of tokens for claiming
    uint256 public tokensForClaiming;
    // amount of tokens for liquidity
    uint256 public tokensForLiquidity;
    // total amount of ETH deposited
    uint256 public totalEthDeposited;

    // cancel fair launch
    bool public cancelFairLaunch = false;
    // liquidity added
    bool public liquidityAdded = false;

    // scaling factor
    uint64 constant private SCALING = 10 ** 18;

    IUniswapV2Router02 public immutable uniswapV2Router =
        IUniswapV2Router02(PancakeRouter_Test);

    IUniswapV2Factory public immutable uniswapV2Factory =
        IUniswapV2Factory(PancakeFactory_Test);

    IERC20 tokenOnSaleContract;
    IERC20 wethContract;

    mapping(address => uint256) public deposits;

    constructor() {
        // locks implementation to prevent it from being initialized in the future
        _disableInitializers();
    }

    function initialize(
        address _owner,
        FairLaunchBase.fairLaunchInfo memory _fairLaunchInfo
    ) public initializer {
        __Ownable_init();
        transferOwnership(_owner);

        info = _fairLaunchInfo;

        tokenOnSaleContract = IERC20(_fairLaunchInfo.tokenOnSale);
        wethContract = IERC20(_fairLaunchInfo.wethAddress); 

        uint256 blockTimestamp = block.timestamp;
        uint256 blockNumber = block.number;

        console.log("Launchpad Block Timestamp: ", blockTimestamp);
        console.log("Launchpad Block Number: ", blockNumber);

        require(
            uniswapV2Factory.getPair(_fairLaunchInfo.tokenOnSale, _fairLaunchInfo.wethAddress) == address(0),
            "Error: ALREADY_EXISTING_POOL"
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function depositTokens(uint256 _amountClaiming, uint256 _amountForLiquidity) public {
        require(block.timestamp >= info.saleStartTime, "Sale has not started yet");
        require(block.timestamp <= info.saleEndTime, "Sale has ended");

        console.log("Msg Sender: ", msg.sender);

        tokenOnSaleContract.transferFrom(msg.sender, address(this), _amountClaiming + _amountForLiquidity);
        tokensForClaiming += _amountClaiming;
        tokensForLiquidity += _amountForLiquidity;
        
        emit DepositTokens(msg.sender, _amountClaiming, _amountForLiquidity);
    }
    

    function finalize() external onlyOwner {
        require(hasDepositsFinished(), "Error: DEPOSITS_STILL_ACTIVE");
        require(totalEthDeposited != 0 && tokensForLiquidity != 0, "Error: INVALID_ETH_BALANCE");

        uint256 _teamShare = (totalEthDeposited * info.teamShare) / 100;
        uint256 ethForLiquidity = totalEthDeposited - _teamShare;

        // providing liquidity
        (uint amountToken, uint amountETH,) = uniswapV2Router.addLiquidityETH{value : ethForLiquidity}(
            info.tokenOnSale,
            tokensForLiquidity,
            tokensForLiquidity,
            ethForLiquidity,
            owner(),
            block.timestamp + 600
        );
        require(amountToken == tokensForLiquidity && amountETH == ethForLiquidity, "Error: addLiquidityETH_FAILED");

        // enable token withdrawals
        liquidityAdded = true;

        // sending team share to the owner
        payable(owner()).transfer(_teamShare);

        emit Finalize(_msgSender(), tokensForLiquidity, totalEthDeposited);
    }

    function cancel() external onlyOwner {
        require(!cancelFairLaunch, "Error: FAILED_LAUNCH_CANCELLED");
        cancelFairLaunch = true;

        // owner withdrawing previously deposited tokens
        tokenOnSaleContract.transfer(owner(), tokensForClaiming + tokensForLiquidity);

        emit CancelFairLaunch(_msgSender(), tokensForClaiming + tokensForLiquidity);
    }

    function depositETH() external payable {
        require(checkDepositsActive(), "Error: DEPOSITS_NOT_ACTIVE");
        require(msg.value >= info.minDeposit && msg.value + deposits[_msgSender()] <= info.maxDeposit, "Error: INVALID_DEPOSIT_AMOUNT");
        require(!cancelFairLaunch, "Error: FAIRLAUNCH_IS_CANCELLED");

        deposits[_msgSender()] += msg.value;
        totalEthDeposited += msg.value;

        emit DepositETH(_msgSender(), msg.value);
    }

    function claimTokens() external returns (uint256) {
        require(hasDepositsFinished(), "Error: CLAIMING_NOT_ACTIVE");
        require(getCurrentTokenShare() > 0, "Error: INVALID_TOKEN_SHARE");
        require(!cancelFairLaunch, "Error: FAIRLAUNCH_IS_CANCELLED");
        require(liquidityAdded, "Error: LIQUIDITY_NOT_ADDED");

        uint256 userTokens = getCurrentTokenShare();
        deposits[_msgSender()] = 0;
        tokenOnSaleContract.transfer(_msgSender(), userTokens);

        emit ClaimTokens(_msgSender(), userTokens);

        return userTokens;
    }

    function withdrawETH() external returns (uint256) {
        require(cancelFairLaunch, "Error: FAIRLAUNCH_NOT_CANCELLED");
        require(getCurrentTokenShare() > 0 && deposits[_msgSender()] > 0, "Error: INVALID_DEPOSIT_AMOUNT");

        uint256 userEthAmount = deposits[_msgSender()];
        deposits[_msgSender()] = 0;

        payable(_msgSender()).transfer(userEthAmount);

        emit WithdrawETH(_msgSender(), userEthAmount);

        return userEthAmount;
    }

    function getCurrentTokenShare() public view returns (uint256) {
        if (deposits[_msgSender()] > 0) {
            return (((deposits[_msgSender()] * SCALING) / totalEthDeposited) * tokensForClaiming) / SCALING;
        } else {
            return 0;
        }
    }

    function hasDepositsFinished() public view returns (bool) {
        return block.timestamp > info.saleStartTime && block.timestamp > info.saleEndTime;
    }

    function checkDepositsActive() public view returns (bool) {
        return block.timestamp > info.saleStartTime &&
        block.timestamp < info.saleEndTime &&
        tokensForClaiming != 0 &&
        tokensForLiquidity != 0;
    }
}
