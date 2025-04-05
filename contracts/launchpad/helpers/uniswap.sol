// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "hardhat/console.sol";

contract UniswapHelper {
    IUniswapV2Factory public immutable uniswapV2Factory =
        IUniswapV2Factory(0x6725F303b657a9451d8BA641348b6761A6CC7a17);

    IUniswapV2Router02 public immutable uniswapV2Router =
        IUniswapV2Router02(0xD99D1c33F9fC3444f8101754aBC46c52416550D1);

    function getPair(address tokenA, address tokenB) public view returns (address) {
        return uniswapV2Factory.getPair(tokenA, tokenB);
    }

    function getWeth() public pure returns (address) {
        return IUniswapV2Router02(0xD99D1c33F9fC3444f8101754aBC46c52416550D1).WETH();
    }

    function getReserves(address pair) public view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) {
        return IUniswapV2Pair(pair).getReserves();
    }

    function test() public {
        address factoryAddress = uniswapV2Router.factory();
        console.log("Uniswap Factory Address: ", factoryAddress);

        address pair = IUniswapV2Factory(factoryAddress).getPair(
            address(0x0055d398326f99059ff775485246999027b3197955),
            address(0x00bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c)
        );
        console.log("Uniswap Pair: ", pair);

        (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) = IUniswapV2Pair(pair).getReserves();

        console.log("Uniswap Reserve 0: ", _reserve0);
        console.log("Uniswap Reserve 1: ", _reserve1);
        console.log("Uniswap Block Timestamp Last: ", _blockTimestampLast);

        (bool success, bytes memory data) = address(uniswapV2Factory).call(
            abi.encodeWithSelector(
                IUniswapV2Factory.getPair.selector,
                address(0x0055d398326f99059ff775485246999027b3197955),
                address(0x00bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c)
            )
        );

        console.log("Success: ", success);
        console.log("Data: ", abi.decode(data, (address)));
    }

}
