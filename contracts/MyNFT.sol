// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

/**
 * @title MyNFT
 * @dev A feature-rich ERC721 NFT contract with phased minting, Merkle tree allowlist,
 *      reveal mechanism, ERC2981 royalties, and owner controls.
 */
contract MyNFT is ERC721URIStorage, Ownable, ERC2981 {
    // Custom errors for gas efficiency and clarity
    error InvalidSaleState();
    error ExceedsSupply();
    error InvalidProof();
    error InsufficientFunds();
    error AlreadyRevealed();
    error NotRevealedYet();
    error ZeroQuantity();
    error MaxMintPerTxExceeded();
    error MaxSupplyReached();
    error TransferFailed();

    enum SaleState { Paused, Allowlist, Public }

    uint256 public immutable MAX_SUPPLY;
    uint256 public immutable MAX_MINT_PER_TX;

    uint256 public s_price; // Price per NFT
    bytes32 public s_merkleRoot; // Merkle root for allowlist
    SaleState public s_saleState; // Current state of the sale
    bool public s_revealed; // Whether the collection has been revealed

    string private s_baseTokenURI; // Base URI for unrevealed tokens
    string private s_revealedTokenURI; // Base URI for revealed tokens

    uint256 private s_currentTokenId; // Counter for minted tokens

    event Mint(address indexed minter, uint256 quantity, uint256 indexed fromTokenId, uint256 indexed toTokenId);
    event SaleStateChanged(SaleState newSaleState);
    event PriceChanged(uint256 newPrice);
    event MerkleRootChanged(bytes32 newMerkleRoot);
    event Revealed(string revealedURI);
    event BaseURIChanged(string newBaseURI);
    event RevealedURIChanged(string newRevealedURI);
    event Withdrawal(address indexed recipient, uint256 amount);

    /**
     * @dev Constructor to initialize the NFT collection.
     * @param name_ The name of the NFT collection.
     * @param symbol_ The symbol of the NFT collection.
     * @param maxSupply_ The maximum number of NFTs that can be minted.
     * @param maxMintPerTx_ The maximum number of NFTs that can be minted in a single transaction.
     * @param initialPrice_ The initial price per NFT.
     * @param initialBaseURI_ The initial base URI for unrevealed tokens.
     * @param initialRevealedURI_ The initial base URI for revealed tokens.
     * @param royaltyRecipient_ The address to receive royalties.
     * @param royaltyFeeNumerator_ The royalty fee numerator (e.g., 500 for 5%).
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 maxMintPerTx_,
        uint256 initialPrice_,
        string memory initialBaseURI_,
        string memory initialRevealedURI_,
        address royaltyRecipient_,
        uint96 royaltyFeeNumerator_
    ) ERC721(name_, symbol_) Ownable(msg.sender) ERC2981() {
        require(maxSupply_ > 0, "Max supply must be greater than 0");
        require(maxMintPerTx_ > 0, "Max mint per tx must be greater than 0");
        require(maxMintPerTx_ <= maxSupply_, "Max mint per tx cannot exceed max supply");
        require(royaltyRecipient_ != address(0), "Royalty recipient cannot be zero address");

        MAX_SUPPLY = maxSupply_;
        MAX_MINT_PER_TX = maxMintPerTx_;
        s_price = initialPrice_;
        s_baseTokenURI = initialBaseURI_;
        s_revealedTokenURI = initialRevealedURI_;
        s_saleState = SaleState.Paused; // Start in paused state
        s_revealed = false;
        s_currentTokenId = 0;

        _setDefaultRoyalty(royaltyRecipient_, royaltyFeeNumerator_);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     *      Returns the URI for a given token ID. Supports reveal mechanism.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (!_exists(tokenId)) revert ERC721NonexistentToken(tokenId);

        if (s_revealed) {
            return string(abi.encodePacked(s_revealedTokenURI, _toString(tokenId), ".json"));
        } else {
            return string(abi.encodePacked(s_baseTokenURI, _toString(tokenId), ".json"));
        }
    }

    /**
     * @dev Allows an allowlisted address to mint NFTs.
     * @param proof The Merkle proof for the minter's address.
     * @param quantity The number of NFTs to mint.
     */
    function allowlistMint(bytes32[] calldata proof, uint256 quantity) public payable {
        if (s_saleState != SaleState.Allowlist) revert InvalidSaleState();
        if (quantity == 0) revert ZeroQuantity();
        if (quantity > MAX_MINT_PER_TX) revert MaxMintPerTxExceeded();
        if (s_currentTokenId + quantity > MAX_SUPPLY) revert ExceedsSupply();
        if (msg.value < s_price * quantity) revert InsufficientFunds();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, s_merkleRoot, leaf)) revert InvalidProof();

        _mintNFTs(quantity);
    }

    /**
     * @dev Allows any address to mint NFTs during the public sale.
     * @param quantity The number of NFTs to mint.
     */
    function publicMint(uint256 quantity) public payable {
        if (s_saleState != SaleState.Public) revert InvalidSaleState();
        if (quantity == 0) revert ZeroQuantity();
        if (quantity > MAX_MINT_PER_TX) revert MaxMintPerTxExceeded();
        if (s_currentTokenId + quantity > MAX_SUPPLY) revert ExceedsSupply();
        if (msg.value < s_price * quantity) revert InsufficientFunds();

        _mintNFTs(quantity);
    }

    /**
     * @dev Internal function to handle the actual minting process.
     * @param quantity The number of NFTs to mint.
     */
    function _mintNFTs(uint256 quantity) internal {
        uint256 fromTokenId = s_currentTokenId + 1;
        uint256 toTokenId = s_currentTokenId + quantity;

        for (uint256 i = 0; i < quantity; i++) {
            if (s_currentTokenId >= MAX_SUPPLY) revert MaxSupplyReached();
            s_currentTokenId++;
            _safeMint(msg.sender, s_currentTokenId);
        }
        emit Mint(msg.sender, quantity, fromTokenId, toTokenId);
    }

    /**
     * @dev Sets the price per NFT. Only callable by the owner.
     * @param newPrice The new price per NFT.
     */
    function setPrice(uint256 newPrice) public onlyOwner {
        s_price = newPrice;
        emit PriceChanged(newPrice);
    }

    /**
     * @dev Sets the base URI for unrevealed tokens. Only callable by the owner.
     * @param newBaseURI The new base URI.
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        s_baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    /**
     * @dev Sets the base URI for revealed tokens. Only callable by the owner.
     * @param newRevealedURI The new revealed URI.
     */
    function setRevealedURI(string memory newRevealedURI) public onlyOwner {
        s_revealedTokenURI = newRevealedURI;
        emit RevealedURIChanged(newRevealedURI);
    }

    /**
     * @dev Sets the Merkle root for the allowlist. Only callable by the owner.
     * @param newMerkleRoot The new Merkle root.
     */
    function setMerkleRoot(bytes32 newMerkleRoot) public onlyOwner {
        s_merkleRoot = newMerkleRoot;
        emit MerkleRootChanged(newMerkleRoot);
    }

    /**
     * @dev Sets the current sale state. Only callable by the owner.
     * @param newState The new sale state.
     */
    function setSaleState(SaleState newState) public onlyOwner {
        s_saleState = newState;
        emit SaleStateChanged(newState);
    }

    /**
     * @dev Reveals the collection by setting the revealed flag to true.
     *      This changes the tokenURI to point to the revealed URI.
     *      Only callable by the owner. Can only be called once.
     */
    function reveal() public onlyOwner {
        if (s_revealed) revert AlreadyRevealed();
        s_revealed = true;
        emit Revealed(s_revealedTokenURI);
    }

    /**
     * @dev Withdraws all accumulated Ether to the contract owner. Only callable by the owner.
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) return;

        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();
        emit Withdrawal(owner(), balance);
    }

    /**
     * @dev Returns the current total supply of NFTs.
     */
    function totalSupply() public view returns (uint256) {
        return s_currentTokenId;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Helper function to convert uint256 to string
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
