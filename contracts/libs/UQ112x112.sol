// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// a library for handling binary fixed point numbers (https://en.wikipedia.org/wiki/Q_(number_format))
// range: [0, 2**112 - 1]
// resolution: 1 / 2**112
library UQ112x112 {
    uint224 public constant Q112 = 2 ** 112;

    // encode a uint112 as a UQ112x112
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112; // never overflows
    }

    // decode a UQ112x112 to a uint112
    function decode(uint224 x) internal pure returns (uint112 z) {
        z = uint112(x / Q112);
    }

    // divide a UQ112x112 by a uint112, returning a UQ112x112
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }

    // multiply a UQ112x112 by a uint112, returning a UQ112x112
    function uqmul(uint224 x, uint112 y) internal pure returns (uint224 z) {
        uint224 _x = uint224(uint112(x / Q112));
        uint224 _y = uint224(y);
        z = _x * _y;
    }

    // format a UQ112x112 to a uint256
    function toSignificant(uint224 x) internal pure returns (uint256 z) {
        z = uint256(x) / (Q112 - 1);
    }

    // normalize a UQ112x112 to a uint256
    function toQuotient(uint224 x) internal pure returns (uint256 z) {
        z = toSignificant(x) * 1 ether;
    }
}
