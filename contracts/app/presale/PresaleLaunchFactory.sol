// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./PresaleLaunchBase.sol";
import "./PresaleLaunch.sol";

import "../../libs/UQ112x112.sol";

import "hardhat/console.sol";

contract PresaleLaunchFactory is Ownable {
    using Address for address payable;
    using SafeMath for uint256;
    using UQ112x112 for uint224;
    using UQ112x112 for uint112;

    uint256 public flatFee;
    address public feeTo;
    uint256 public precisionRateScale;

    mapping(address => PresaleLaunchBase.presaleInfo) public presaleLaunchs;

    event PresaleLaunchCreated(address indexed presaleLaunch);

    constructor() Ownable() {
        feeTo = msg.sender;
        // Required flat fee for testing with fund token...
        flatFee = 1 ether;
        precisionRateScale = PRECISION_RATE_SCALE;
    }

    function calculateNeeded(
        uint256 _hardCap,
        uint256 _presaleRate,
        uint256 _listingRate,
        uint256 _liquidityRate
    ) internal view returns (uint256, uint256, uint256) {
        uint256 tokensForSale = _hardCap.mul(_presaleRate).div(100).div(
            precisionRateScale
        );
        uint256 tokensForListing = _hardCap.mul(_listingRate).div(100).div(
            precisionRateScale
        );
        uint256 tokensForLiquidity = _hardCap.mul(_liquidityRate).div(100).div(
            precisionRateScale
        );
        return (tokensForSale, tokensForListing, tokensForLiquidity);
    }

    function create(
        PresaleLaunchBase.presaleInfo memory _presaleInfo
    ) external payable returns (address) {
        address presaleLaunch = address(new PresaleLaunch());

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
            uint256 tokensForSale,
            uint256 tokensForListing,
            uint256 tokensForLiquidity
        ) = calculateNeeded(
                _presaleInfo.hardCap,
                _presaleInfo.presaleRate,
                _presaleInfo.listingRate,
                _presaleInfo.liquidityRate
            );

        IERC20(_presaleInfo.saleTokenAddress).transferFrom(
            msg.sender,
            address(proxy),
            tokensForListing.add(tokensForLiquidity).add(tokensForSale)
        );

        if (_presaleInfo.fundTokenAddress != address(0)) {
            IERC20(_presaleInfo.fundTokenAddress).transferFrom(
                msg.sender,
                address(proxy),
                tokensForListing.add(tokensForLiquidity)
            );
        } else {
            payable(feeTo).sendValue(flatFee);
        }

        uint112 _a = 8 ether;
        uint112 _b = 2 ether;

        uint224 _ae = uint112(_a).encode();
        uint224 _be = uint112(_b).encode();

        uint224 _au = _ae.uqdiv(2**112-1);
        uint224 _bu = _be.uqdiv(2**112-1);

        // uint224 _adivb = _ae.uqdiv(_b);
        // uint112 _adivb2 = _ae.uqdiv(_b).decode();

        uint224 _amulb = _ae.uqmul(_b);
        uint112 _amulb2 = _amulb.decode();

        // uint112 _a2 = uint224(111);

        console.log("AAAEE: ",_ae);
        console.log("BBBEE: ",_be);

        console.log("AAAA: ",_au);
        console.log("BBBB: ",_bu);

        // console.log("ADIVB: ",_adivb);
        // console.log("ADIVB2: ",_adivb2);

        console.log("AMULB: ",_amulb);
        console.log("AMULB2: ",_amulb2);

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
