// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MyNFT is ERC721, ERC721Enumerable, ERC721Royalty, Ownable {
  enum SaleState { Paused, Allowlist, Public }
  
  uint256 public constant MAX_SUPPLY = 10000;
  uint256 public currentTokenId = 0;
  uint256 public price = 0.1 ether;
  string public baseURI = "ipfs://";
  string public revealedURI = "";
  bool public isRevealed = false;
  SaleState public saleState = SaleState.Paused;
  bytes32 public merkleRoot;
  
  mapping(address => bool) public allowlistClaimed;

  event Minted(address indexed to, uint256 tokenId, SaleState saleState);
  event Revealed(string revealedURI);

  constructor() ERC721("MyNFT", "MNFT") {}

  function allowlistMint(bytes32[] calldata proof, uint256 quantity) external payable {
    require(saleState == SaleState.Allowlist, "Allowlist sale not active");
    require(!allowlistClaimed[msg.sender], "Already claimed");
    require(msg.value >= price * quantity, "Insufficient payment");
    require(currentTokenId + quantity <= MAX_SUPPLY, "Exceeds max supply");
    require(MerkleProof.verify(proof, merkleRoot, keccak256(abi.encodePacked(msg.sender))), "Invalid proof");
    
    allowlistClaimed[msg.sender] = true;
    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(msg.sender, currentTokenId++);
      emit Minted(msg.sender, currentTokenId - 1, SaleState.Allowlist);
    }
  }

  function publicMint(uint256 quantity) external payable {
    require(saleState == SaleState.Public, "Public sale not active");
    require(msg.value >= price * quantity, "Insufficient payment");
    require(currentTokenId + quantity <= MAX_SUPPLY, "Exceeds max supply");
    
    for (uint256 i = 0; i < quantity; i++) {
      _safeMint(msg.sender, currentTokenId++);
      emit Minted(msg.sender, currentTokenId - 1, SaleState.Public);
    }
  }

  function reveal(string memory _revealedURI) external onlyOwner {
    require(!isRevealed, "Already revealed");
    isRevealed = true;
    revealedURI = _revealedURI;
    emit Revealed(_revealedURI);
  }

  function setSaleState(SaleState _state) external onlyOwner {
    saleState = _state;
  }

  function setPrice(uint256 _price) external onlyOwner {
    price = _price;
  }

  function setBaseURI(string memory _baseURI) external onlyOwner {
    baseURI = _baseURI;
  }

  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    merkleRoot = _merkleRoot;
  }

  function withdraw() external onlyOwner {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Withdraw failed");
  }

  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireMinted(tokenId);
    if (isRevealed) return revealedURI;
    return baseURI;
  }

  function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override(ERC721, ERC721Enumerable) {
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
  }

  function _burn(uint256 tokenId) internal override(ERC721, ERC721Royalty) {
    super._burn(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721Royalty) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
