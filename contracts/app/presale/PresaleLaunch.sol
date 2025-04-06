// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./PresaleLaunchBase.sol";

import "hardhat/console.sol";

pragma solidity ^0.8.0;

contract PresaleLaunch is
    PresaleLaunchBase,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeMath for uint256;

    // @define total amount of fund token received
    uint256 public totalFundReceived;
    // @define total amount of sale token bought
    uint256 public totalSaleBought;

    // @define amount of BNB received by each user
    mapping(address => uint256) public amountReceivedBNB;
    // @define amount of tokens that can be claimed by each user
    mapping(address => uint256) public claimableTokenBalance;
    // @define boolean to check if the user has claimed the tokens
    mapping(address => bool) public userClaimedTokens;

    // @define address of the protocol fee recipient
    address public protocolAddress;

    // @define boolean to check if the presale is finalized
    bool public isFinalized;

    /// @notice Constructor
    /// @dev Locks the implementation to prevent it from being initialized in the future
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the presale
    /// @param _info The presale info
    /// @param _protocolAddress The address of the protocol
    function initialize(
        address _owner,
        presaleInfo memory _info,
        address _protocolAddress
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        transferOwnership(_owner);

        info = _info;
        protocolAddress = _protocolAddress;

        emit PresaleInitialized(_info, _protocolAddress);
    }

    /// # Internal Functions

    /// @notice Authorize the upgrade
    /// @param newImplementation The address of the new implementation
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /// @notice Buy tokens
    /// @param _amount The amount of tokens to buy
    function _buyToken(uint256 _amount) internal onlyPresaleActive(_amount) {
        // check if user has bought before
        uint256 userBNBReceived = amountReceivedBNB[msg.sender];
        require(
            userBNBReceived + _amount <= info.maxBuyPerUser,
            "Amount is more than max buy"
        );
        require(
            userBNBReceived + _amount >= info.minBuyPerUser,
            "Amount is less than min buy"
        );
        require(
            totalFundReceived + _amount <= info.hardCap,
            "Hard cap reached"
        );

        // increase amount of total BNB received
        amountReceivedBNB[msg.sender] = amountReceivedBNB[msg.sender].add(
            _amount
        );
        totalFundReceived = totalFundReceived.add(_amount);

        // calculate the amount of tokens to be received
        uint256 userTokenAmount = _amount * info.presaleRate;

        // increase the amount of tokens to be received
        claimableTokenBalance[msg.sender] = claimableTokenBalance[msg.sender]
            .add(userTokenAmount);

        // increase the amount of total tokens bought
        totalSaleBought = totalSaleBought.add(userTokenAmount);

        emit TokenBought(msg.sender, _amount, userTokenAmount);
    }

    /// @notice Send the protocol fee to the protocol address
    /// @param _totalFundReceived The total amount of fund received
    /// @return The amount of fund received after sending the protocol fee
    function _sendProtocolFee(
        uint256 _totalFundReceived
    ) internal returns (uint256) {
        uint256 protocolFee = _totalFundReceived.mul(info.protocolFeeRate).div(
            100
        );

        // send protocol fee to protocol address
        if (info.fundTokenAddress == address(0)) {
            payable(protocolAddress).transfer(protocolFee);
        } else {
            IERC20(info.fundTokenAddress).transfer(
                protocolAddress,
                protocolFee
            );
        }

        // update total fund received
        return _totalFundReceived.sub(protocolFee);
    }

    /// @notice Mint the liquidity amount
    /// @param _totalFundReceived The total amount of fund received
    /// @return
    function _mintLiquidityAmount(
        uint256 _totalFundReceived
    ) internal returns (uint256) {
        uint256 liquidityAmount = _totalFundReceived
            .mul(info.liquidityRate)
            .div(100);
        uint256 saleTokenAmount = _totalFundReceived.mul(info.presaleRate).div(
            100
        );

        require(liquidityAmount > 0, "Liquidity amount is 0");
        require(saleTokenAmount > 0, "Sale token amount is 0");

        uint256 liquidityAmountMin = liquidityAmount.mul(95).div(100);
        uint256 saleTokenAmountMin = saleTokenAmount.mul(95).div(100);

        // mint liquidity amount
        IERC20(info.saleTokenAddress).approve(
            address(PancakeRouterAddress),
            type(uint256).max
        );

        if (info.fundTokenAddress == address(0)) {
            // add liquidity
            (uint256 amountA, , ) = IUniswapV2Router02(PancakeRouterAddress)
                .addLiquidityETH{value: liquidityAmount}(
                info.saleTokenAddress,
                saleTokenAmount,
                liquidityAmountMin,
                saleTokenAmountMin,
                address(this),
                block.timestamp + 1000 * 60 * 30 // 30 minutes
            );

            return amountA;
        } else {
            // add liquidity
            IERC20(info.fundTokenAddress).approve(
                address(PancakeRouterAddress),
                type(uint256).max
            );

            (uint256 amountA, , ) = IUniswapV2Router02(
                PancakeRouterAddress
            ).addLiquidity(
                info.saleTokenAddress,
                info.fundTokenAddress,
                saleTokenAmount,
                liquidityAmount,
                    liquidityAmountMin,
                    saleTokenAmountMin,
                    address(this),
                    block.timestamp + 1000 * 60 * 30 // 30 minutes
                );

            return amountA;
        }
    }

    /// @notice Refund the unsold tokens
    /// @param _amount The amount of unsold tokens to refund
    function _refund(uint256 _amount) internal {
        // if (info.fundTokenAddress == address(0)) {
        //     payable(owner()).transfer(_amount);
        // } else {
        //     IERC20(info.fundTokenAddress).transfer(owner(), _amount);
        // }

        // refund to creator
        if (info.refundType == 0) {
            IERC20(info.saleTokenAddress).transfer(owner(), _amount);
            emit Refunded(owner(), _amount);
        } else if (info.refundType == 1) {
            IERC20(info.saleTokenAddress).transfer(
                0x000000000000000000000000000000000000dEaD,
                _amount
            );
            emit Burned(0x000000000000000000000000000000000000dEaD, _amount);
        }
    }

    /// # External Functions

    /// @notice Buy tokens with ERC20 token
    /// @param _amount The amount of ERC20 token to buy
    function buyERC20Token(uint256 _amount) public {
        // increase amount of user token balance
        _buyToken(_amount);

        IERC20(info.fundTokenAddress).approve(address(this), type(uint256).max);

        // transfer tokens to contract
        IERC20(info.fundTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _amount
        );
    }

    /// @notice Buy tokens with native token
    function buyNativeToken() public payable {
        // increase amount of user token balance
        _buyToken(msg.value);
    }

    /// @notice Finalize the presale
    function finalize() public onlyOwner {
        require(!isFinalized, "Presale already finalized");
        require(block.timestamp >= info.saleEndTime, "Sale not ended");
        require(totalFundReceived >= info.softCap, "Soft cap not reached");
        require(totalFundReceived == info.hardCap, "Hard cap not reached"); // ???

        uint256 _totalFundReceived = totalFundReceived;

        // send protocol fee to protocol address
        _totalFundReceived = _sendProtocolFee(_totalFundReceived);

        // mint liquidity amount
        _totalFundReceived = _mintLiquidityAmount(_totalFundReceived);

        // handle unsold tokens
        if (_totalFundReceived > 0) {
            _refund(_totalFundReceived);
        }

        // set the presale as finalized
        isFinalized = true;
        emit PresaleFinalized(totalSaleBought, totalFundReceived);
    }

    /// @notice Claim the tokens
    function claim() external {
        require(isFinalized, "Presale not finalized");
        require(
            userClaimedTokens[msg.sender] == false,
            "Tokens already claimed"
        );

        // get the claimable tokens
        uint claimableTokens = claimableTokenBalance[msg.sender];
        require(claimableTokens > 0, "No tokens to claim");

        claimableTokenBalance[msg.sender] = 0;
        IERC20(info.saleTokenAddress).transfer(msg.sender, claimableTokens);

        userClaimedTokens[msg.sender] = true;
        emit Claimed(msg.sender, claimableTokens);
    }

    /// @notice Withdraw the tokens
    function withdraw() external onlyOwner {
        require(isFinalized, "Presale not finalized");

        uint256 saleTokenBalance = IERC20(info.saleTokenAddress).balanceOf(
            address(this)
        );

        if (saleTokenBalance > 0) {
            IERC20(info.saleTokenAddress).transfer(owner(), saleTokenBalance);
            emit Withdrawn(owner(), info.saleTokenAddress, saleTokenBalance);
        }

        if (info.fundTokenAddress != address(0)) {
            uint256 fundTokenBalance = IERC20(info.fundTokenAddress).balanceOf(
                address(this)
            );
            if (fundTokenBalance > 0) {
                IERC20(info.fundTokenAddress).transfer(owner(), fundTokenBalance);
                emit Withdrawn(owner(), info.fundTokenAddress, fundTokenBalance);
            }
        } else {
            payable(owner()).transfer(address(this).balance);
            emit Withdrawn(owner(), address(0), address(this).balance);
        }
    }
}
