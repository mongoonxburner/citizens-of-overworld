// SPDX-License-Identifier: MIT
pragma solidity >=0.8.12 <0.9.0;

import "./Base64.sol";

contract StringHexConverter {

    string public stringIn;
    string public stringOut;

    bytes public bytesIn;
    bytes public bytesOut;

    string public animate = '<linearGradient id="2"><stop offset="0%" stop-color="#C8C8C8" stop-opacity="1"></stop><stop offset="50%" stop-color="#FFFFFF" stop-opacity="1"><animate attributeName="offset" values=".20;.40;.60;.80;.90;.80;.60;.40;.20;" dur="10s" repeatCount="indefinite"></animate></stop><stop offset="100%" stop-color="#666666" stop-opacity="1"></stop></linearGradient>';

    string[8] public animations;

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
    bytes memory tempEmptyStringTest = bytes(source);
    if (tempEmptyStringTest.length == 0) {
        return 0x0;
    }

    assembly {
        result := mload(add(source, 32))
    }
}

    function stringToHex(string memory stringToConvert) public {
        stringIn = stringToConvert;
        bytesOut = bytes(stringIn);
    }

    function hexToString(bytes memory bytesToConvert ) public {
        bytesIn = bytesToConvert;
        stringOut = string(bytesIn);   
    }

    function setAnimation(string memory animation) public {
        animations[0] = animation;
    }

    function shiftLeft(uint256 input) public pure returns (uint256)  {
        return input >>= 1;
    }

    function shiftRight(uint256 input) public pure returns (uint256)  {
        return input <<= 1;
    }
    function booleanShift(bool input) public pure returns (bool)  {
        input = !input;
        return input;
    }

}