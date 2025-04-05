// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

enum TokenType {
    standard,
    liquidityGenerator,
    baby,
    buybackBaby
}

abstract contract ITokenBase {
    event TokenCreated(
        address indexed owner,
        address indexed token,
        TokenType tokenType,
        uint256 version
    );
}

