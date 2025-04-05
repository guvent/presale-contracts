// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

import "./PresaleLaunchBase.sol";

import "hardhat/console.sol";

contract PresaleLaunchProgram is PresaleLaunchBase, OwnableUpgradeable, UUPSUpgradeable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // total BNB received (in wei)
    uint256 public totalBNBReceivedInAllTier;

    // total tokens bought (in wei)
    uint256 public totalTokensBought;

    // total participants
    uint256 public totalparticipants;

    // total tokens
    uint256 public totalTokens;

    // total tokens bill
    uint256 public tokensBill;

    // mapping the user purchase
    mapping(address => uint256) public amountBoughtInBNB;

    //mapping to hold claimable balance for each user
    mapping(address => uint256) public claimableTokenBalance;

    // mapping to check if user has bought
    mapping(address => bool) public userHasBought;

    // mapping to check if user has claimed tokens
    mapping(address => bool) internal userClaimedTokens;

    // enum to check the type of sale
    enum buyType {
        publicSale,
        whiteListOnly
    }

    // boolean to check if the presale is finalized
    bool public presaleFinalized;

    // enum to check the state of the sale
    buyType public saleState;

    // address array for tier one whitelist
    address[] private whitelist;

    // ERC20 interface
    IERC20 private ERC20Interface;

    // fee to
    address public protocolAddress;

    IUniswapV2Router02 public uniswapV2Router =
        IUniswapV2Router02(PancakeRouter_Test);

    constructor() {
        // locks implementation to prevent it from being initialized in the future
        _disableInitializers();
    }

    function initialize(
        address _owner,
        uint256 _totalTokens,
        uint256 _tokensBill,
        address _feeTo,
        presaleInfo memory _presaleInfo
    ) public initializer {
        __Ownable_init();
        transferOwnership(_owner);
        
        info = _presaleInfo;

        totalTokens = _totalTokens;
        tokensBill = _tokensBill;
        protocolAddress = _feeTo;

        ERC20Interface = IERC20(info.tokenOnSale);

        console.log("** PresaleLaunchProgram owner: ", owner());
    }

    function _authorizeUpgrade(
        address _newImplementation
    ) internal override onlyOwner {}

    // calculate the amount of tokens per BNB
    function _amountOfTokens(uint _weiAmount) internal view returns (uint) {
        return (_weiAmount * info.presaleRate); //this will give the no. tokens per BNB
    }

    // add the address in Whitelist to invest
    function addWhitelist(address _address) external onlyOwner {
        require(_address != address(0), "Invalid address");
        whitelist.push(_address);
    }

    // add the addresses in Whitelist to invest
    function addManyWhitelist(address[] memory _address) external onlyOwner {
        uint i;

        for (i = 0; i < _address.length; i++) {
            require(_address[i] != address(0), "Invalid address");
            whitelist.push(_address[i]);
        }
    }

    // check the address in whitelist tier one
    function getWhitelist(address _address) public view returns (bool) {
        uint256 i;
        uint256 length = whitelist.length;
        for (i = 0; i < length; i++) {
            address _addressArr = whitelist[i];
            if (_addressArr == _address) {
                return true;
            }
        }
        return false;
    }

    // 0 for publicSale & 1 for whiteListOnly
    function setSaleType(uint choice) public onlyOwner {
        require(choice == 0 || choice == 1, "choice can only be 0 or 1");
        if (choice == 0) {
            saleState = buyType.publicSale;
        } else if (choice == 1) {
            saleState = buyType.whiteListOnly;
        }
    }

    function buyTokens() public payable {
        uint amount = msg.value;
        require(
            block.timestamp >= info.saleStartTime,
            "The sale has not started yet "
        ); // solhint-disable
        require(
            block.timestamp <= info.saleEndTime,
            "The sale is closed"
        ); // solhint-disable
        require(
            totalBNBReceivedInAllTier + amount <= info.hardCap,
            "buyTokens: purchase cannot exceed hardCap. Try Buying a smaller amount"
        );
        require(msg.sender != owner(), "Presale owner cannot participate");

        if (saleState == buyType.whiteListOnly) {
            if (getWhitelist(msg.sender)) {
                amountBoughtInBNB[msg.sender] += amount;
                require(
                    amountBoughtInBNB[msg.sender] >= info.minBuyPerUser,
                    "buyTokens: "
                );

                require(
                    amountBoughtInBNB[msg.sender] <= info.maxBuyPerUser,
                    "buyTokens: You are investing more than your limit!"
                );

                // increase amount of total BUSD received
                totalBNBReceivedInAllTier += amount;

                // Get amount of tokens user can get for BNB paid
                uint tokenAmount_wei = _amountOfTokens(amount);

                //for each time user buys tokens, add it to the amount he can claim
                claimableTokenBalance[msg.sender] = claimableTokenBalance[
                    msg.sender
                ].add(tokenAmount_wei);
                totalTokensBought += tokenAmount_wei;

                if (userHasBought[msg.sender] == false) {
                    userHasBought[msg.sender] = true;
                    totalparticipants += 1;
                }
            } else {
                revert("No a whitelisted address");
            }
        } else if (saleState == buyType.publicSale) {
            amountBoughtInBNB[msg.sender] += amount;
            require(
                amountBoughtInBNB[msg.sender] >= info.minBuyPerUser,
                "your purchasing Power is so Low"
            );

            require(
                amountBoughtInBNB[msg.sender] <= info.maxBuyPerUser,
                "buyTokens:You are investing more than your tier-1 limit!"
            );

            // increase amount of total BUSD received
            totalBNBReceivedInAllTier += amount;

            // Get amount of tokens user can get for money paid
            uint tokenAmount_wei = _amountOfTokens(amount);

            //for each time user buys tokens, add it to the amount he can claim
            claimableTokenBalance[msg.sender] = claimableTokenBalance[
                msg.sender
            ].add(tokenAmount_wei);
            totalTokensBought += tokenAmount_wei;

            if (userHasBought[msg.sender] == false) {
                userHasBought[msg.sender] = true;
                totalparticipants += 1;
            }
        }
    }

    // calculate the amount of tokens for liquidity
    function amountsNeededForLiquidity()
        internal
        view
        returns (
            uint tokensForLiquidity,
            uint _BNBForLiquidity,
            uint _BNBforCreator,
            uint _presaleExecutionFee
        )
    {
        if (info.BNBFee == 4) {
            // remove 6 zeros from the "totalBNBReceivedInAllTier"
            // before using it for computing
            uint totalBNBReceivedInAllTier_notWei = totalBNBReceivedInAllTier /
                1e6;

            uint totalTokensForLiquidity_wei = ((totalBNBReceivedInAllTier_notWei *
                    96) *
                    (info.listingRate * info.liquidityPercent)) *
                    10 ** 2;

            // find the total amount of BUSD required to send Liquidity to PancakeSwap
            uint totalBUSDforLiquidity_wei = (totalBNBReceivedInAllTier_notWei *
                info.liquidityPercent *
                96) * 1e2;

            // how much BUSD the creator of the contract will get (remainder after
            // sending to pancakeSwap and deducting fees)
            uint totalBUSDforCreator_wei = (totalBNBReceivedInAllTier_notWei *
                (100 - info.liquidityPercent) *
                96) * 1e2;

            uint presaleExecutionFee_BUSD = totalBNBReceivedInAllTier -
                (totalBUSDforCreator_wei + totalBUSDforLiquidity_wei);

            return (
                totalTokensForLiquidity_wei,
                totalBUSDforLiquidity_wei,
                totalBUSDforCreator_wei,
                presaleExecutionFee_BUSD
            );
        } else if (info.BNBFee == 2) {
            // remove all extra zeros from the "totalBNBReceivedInAllTier"
            // before using it for computing
            uint totalBNBReceivedInAllTier_notWei = totalBNBReceivedInAllTier /
                1e6;

            uint totalTokensForLiquidity_wei = ((totalBNBReceivedInAllTier_notWei *
                    985) *
                    (info.listingRate * info.liquidityPercent)) *
                    10 ** 1;

            // find the total amount of BUSD required to send Liquidity to PancakeSwap
            uint totalBUSDforLiquidity_wei = (totalBNBReceivedInAllTier_notWei *
                info.liquidityPercent *
                985) * 1e1;

            // how much BUSD the creator of the contract will get (remainder after
            // sending to pancakeSwap and deducting fees)
            uint totalBUSDforCreator_wei = (totalBNBReceivedInAllTier_notWei *
                (100 - info.liquidityPercent) *
                985) * 1e1;

            uint presaleExecutionFee_BUSD = totalBNBReceivedInAllTier -
                (totalBUSDforCreator_wei + totalBUSDforLiquidity_wei);

            return (
                totalTokensForLiquidity_wei,
                totalBUSDforLiquidity_wei,
                totalBUSDforCreator_wei,
                presaleExecutionFee_BUSD
            );
        }
    }

    function handleUnsoldTokens(uint _tokensSentToPS) internal {
        uint256 unsoldTokens = totalTokens -
            (totalTokensBought + _tokensSentToPS + tokensBill);

        if (info.refundType == 0) {
            // 0 = refund to creator
            ERC20Interface.transfer(owner(), unsoldTokens);
        } else if (info.refundType == 1) {
            // 1 = burn
            IERC20(info.tokenOnSale).transfer(
                0x000000000000000000000000000000000000dEaD,
                unsoldTokens
            );
        }
    }

    function sendPresaleExecutionFees(uint presaleExecutionFee) internal {
        //( , , , uint _presaleExecutionFee) = amountsNeededForLiquidity();

        // send BNB fees to E-Launch
        payable(protocolAddress).transfer(presaleExecutionFee);

        // if the fee model includes 2% of tokens, then transfer it to E-launch
        if (info.BNBFee == 2) {
            ERC20Interface.transfer(protocolAddress, tokensBill);
        }
    }

    function approveToRouter() internal {
        uint entireBalance = IERC20(info.tokenOnSale).balanceOf(
            address(this)
        );

        // the token is being approved for the contract
        IERC20(info.tokenOnSale).approve(
            PancakeRouter_Test,
            entireBalance
        );
    }

    function sendLiquidityToPancake(
        uint256 amountADesired,
        uint ethAmount
    ) internal returns (uint _amountA) {
        // approve
        approveToRouter();

        // add the liquidity
        (uint amountA, , ) = uniswapV2Router.addLiquidityETH{value: ethAmount}(
            info.tokenOnSale,
            amountADesired,
            0,
            0,
            address(this),
            (block.timestamp + 300)
        );

        return amountA;
    }

    function finalize() public onlyOwner {
        require(
            presaleFinalized == false,
            "finalize: presale already finalized"
        );
        require(
            totalBNBReceivedInAllTier == info.hardCap ||
                block.timestamp >= info.saleEndTime,
            "finalize: Hardcap not reached or sale has not ended"
        );
        require(
            totalBNBReceivedInAllTier >= info.softCap,
            "finalize: Project cannot proceed since softcap was not reached"
        );

        (
            uint tokensForLiquidity,
            uint _BNBForLiquidity,
            uint _BNBforCreator,
            uint _presaleExecutionFee
        ) = amountsNeededForLiquidity();

        sendPresaleExecutionFees(_presaleExecutionFee);

        uint tokensSentToPS = sendLiquidityToPancake(
            tokensForLiquidity,
            _BNBForLiquidity
        );

        // Send BUSD that was not added liquidity pool to the creator
        payable(owner()).transfer(_BNBforCreator);

        // burn or refund unsold tokens
        handleUnsoldTokens(tokensSentToPS);

        presaleFinalized = true;
    }

    function claimTokens() external {
        // Add boolean to ensure that liquidity pool has been created
        require(
            presaleFinalized == true,
            "claimTokens: User cannot claim tokenss till sale is finalized"
        );
        // Ensure investors can claim only once
        require(
            userClaimedTokens[msg.sender] == false,
            "User has already claimed"
        );

        uint claimableTokens = claimableTokenBalance[msg.sender];
        claimableTokenBalance[msg.sender] = 0;

        ERC20Interface.safeTransfer(msg.sender, claimableTokens);

        userClaimedTokens[msg.sender] = true;
    }
}
