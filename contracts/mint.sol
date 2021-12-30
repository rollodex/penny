// SPDX-License-Identifier: MIT

/**
 *Penny Auction House - Mint NFTs (ERC-721) for test purposes
 *Deployed at: 0x5648912d6e2Ac50cf31107048C0C0dB94e43f3Da (Metis Stardust)
*/


pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;


import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v3.0.1/contracts/utils/Strings.sol";

contract TestMint is ERC721 {
    
    uint public nftCount;
    
    constructor() public ERC721("Test NFT", "TFT") {

    }
    
    /** 
     * @notice Mint a new NFT with id for testing purposes
     */ 
    function mintNFT() public {
         
         _mint(msg.sender,nftCount); //Mint NFT
         nftCount++;
         
         emit NFTMinted(nftCount - 1);
    }
    
    
    event NFTMinted(uint _id);
    
}
