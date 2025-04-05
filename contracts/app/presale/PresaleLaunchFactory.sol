// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./PresaleLaunchProgram.sol";
import "./PresaleLaunchBase.sol";

import "hardhat/console.sol";

contract PresaleLaunchFactory is Ownable {
    using Address for address payable;

    uint256 public flatFee;
    address public feeTo;

    mapping(address => PresaleLaunchBase.presaleInfo)
        public presaleLaunchPrograms;

    event PresaleLaunchProgramCreated(address indexed presaleLaunchProgram);

    constructor() Ownable() {
        feeTo = msg.sender;
        flatFee = 500_000_000 gwei;
        console.log("* PresaleLaunchFactory deployed");
    }

    function calculateTokensNeeded(
        uint BNBFee,
        uint hardCap,
        uint presaleRate,
        uint listingRate,
        uint liquidityPercent
    ) internal pure returns (uint tokensNeeded_wei, uint tokensCharged) {
        require(BNBFee == 2 || BNBFee == 4, "BNBFee must either be 2 or 4");

        if (BNBFee == 4) {
            uint totalTokenBeingSold = (hardCap * presaleRate);
            uint totalTokensForLiquidity = ((hardCap * 96) *
                (listingRate * liquidityPercent)) / 10000;

            uint totalTokensNeeded = totalTokenBeingSold +
                totalTokensForLiquidity;

            return (totalTokensNeeded, 0);
        } else if (BNBFee == 2) {
            uint totalTokenBeingSold = (hardCap * presaleRate);
            uint totalTokensForLiquidity = ((hardCap * 98) *
                (listingRate * liquidityPercent)) / 10000;

            uint totalTokensNeeded = totalTokenBeingSold +
                totalTokensForLiquidity;

            uint tokensFeeToCharge = (totalTokenBeingSold * 15) / 1000;

            totalTokensNeeded =
                ((1015 * (hardCap * presaleRate)) / 1000) +
                totalTokensForLiquidity;

            return (totalTokensNeeded, tokensFeeToCharge);
        }
    }

    function create(
        PresaleLaunchBase.presaleInfo memory _presaleInfo
    ) external payable returns (address) {
        address presaleLaunchProgram = address(new PresaleLaunchProgram());

        (uint tokensNeeded, uint tokensBill) = calculateTokensNeeded(
            _presaleInfo.BNBFee,
            _presaleInfo.hardCap,
            _presaleInfo.presaleRate,
            _presaleInfo.listingRate,
            _presaleInfo.liquidityPercent
        );

        payable(feeTo).sendValue(flatFee);

        ERC1967Proxy proxy = new ERC1967Proxy(
            presaleLaunchProgram,
            abi.encodeWithSelector(
                PresaleLaunchProgram(address(0)).initialize.selector,
                msg.sender,
                tokensNeeded,
                tokensBill,
                feeTo,
                _presaleInfo
            )
        );

        presaleLaunchPrograms[address(proxy)] = _presaleInfo;

        emit PresaleLaunchProgramCreated(address(proxy));

        return address(proxy);
    }

    function setFeeTo(address feeReceivingAddress) external onlyOwner {
        feeTo = feeReceivingAddress;
    }

    function setFlatFee(uint256 fee) external onlyOwner {
        flatFee = fee;
    }
}
