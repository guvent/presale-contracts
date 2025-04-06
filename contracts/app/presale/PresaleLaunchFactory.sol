// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./PresaleLaunchBase.sol";
import "./PresaleLaunch.sol";

import "hardhat/console.sol";

contract PresaleLaunchFactory is Ownable {
    using Address for address payable;
    using SafeMath for uint256;

    uint256 public flatFee;
    address public feeTo;

    mapping(address => PresaleLaunchBase.presaleInfo) public presaleLaunchs;

    event PresaleLaunchCreated(address indexed presaleLaunch);

    constructor() Ownable() {
        feeTo = msg.sender;
        flatFee = 500_000_000 gwei;
        console.log("* PresaleLaunchFactory deployed");
    }

    function calculateNeeded(
        uint256 _hardCap,
        uint256 _presaleRate,
        uint256 _listingRate,
        uint256 _liquidityRate
    ) internal pure returns (uint256, uint256, uint256) {
        uint256 tokensForFee = _hardCap.mul(_presaleRate).div(100);
        uint256 tokensForListing = _hardCap.mul(_listingRate).div(100);
        uint256 tokensForLiquidity = _hardCap.mul(_liquidityRate).div(100);
        return (tokensForFee, tokensForListing, tokensForLiquidity);
    }

    function create(
        PresaleLaunchBase.presaleInfo memory _presaleInfo
    ) external payable returns (address) {
        address presaleLaunch = address(new PresaleLaunch());

        payable(feeTo).sendValue(flatFee);

        ERC1967Proxy proxy = new ERC1967Proxy(
            presaleLaunch,
            abi.encodeWithSelector(
                PresaleLaunch(address(0)).initialize.selector,
                msg.sender,
                _presaleInfo,
                feeTo
            )
        );

        (
            uint256 tokensForFee,
            uint256 tokensForListing,
            uint256 tokensForLiquidity
        ) = calculateNeeded(
                _presaleInfo.hardCap,
                _presaleInfo.presaleRate,
                _presaleInfo.listingRate,
                _presaleInfo.liquidityRate
            );

        uint256 allowance = IERC20(_presaleInfo.saleTokenAddress).allowance(
            msg.sender,
            address(this)
        );

        console.log("AAA allowance: ", allowance, address(this));

        IERC20(_presaleInfo.saleTokenAddress).transferFrom(
            msg.sender,
            address(proxy),
            tokensForFee + tokensForListing + tokensForLiquidity
        );

        presaleLaunchs[address(proxy)] = _presaleInfo;

        emit PresaleLaunchCreated(address(proxy));

        return address(proxy);
    }

    function setFeeTo(address feeReceivingAddress) external onlyOwner {
        feeTo = feeReceivingAddress;
    }

    function setFlatFee(uint256 fee) external onlyOwner {
        flatFee = fee;
    }
}
