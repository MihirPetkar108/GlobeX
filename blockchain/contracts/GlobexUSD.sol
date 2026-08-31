// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GlobexUSD is ERC20, Ownable {
    constructor() ERC20("GLOBEX USD", "gUSD") Ownable(msg.sender) {
        // Mint 1,000,000 gUSD to the deployer for testing
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}