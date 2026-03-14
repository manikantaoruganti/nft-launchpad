const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MyNFT", function () {
  let MyNFT;
  let myNFT;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;
  let merkleTree;
  let merkleRoot;
  let allowlistAddresses;

  const NAME = "My Awesome NFT";
  const SYMBOL = "MANFT";
  const MAX_SUPPLY = 100;
  const MAX_MINT_PER_TX = 5;
  const INITIAL_PRICE = ethers.parseEther("0.05");
  const INITIAL_BASE_URI = "ipfs://QmVzXgYhJkLpMnNqRsStUvWxYzAaBcDeFgHiJkL/";
  const INITIAL_REVEALED_URI = "ipfs://QmRevealedCID/";
  const ROYALTY_FEE_NUMERATOR = 500; // 5%

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Setup allowlist
    allowlistAddresses = [addr1.address, addr2.address];
    const leaves = allowlistAddresses.map((address) => keccak256(address));
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getHexRoot();

    MyNFT = await ethers.getContractFactory("MyNFT");
    myNFT = await MyNFT.deploy(
      NAME,
      SYMBOL,
      MAX_SUPPLY,
      MAX_MINT_PER_TX,
      INITIAL_PRICE,
      INITIAL_BASE_URI,
      INITIAL_REVEALED_URI,
      owner.address,
      ROYALTY_FEE_NUMERATOR
    );
    await myNFT.waitForDeployment();

    // Set Merkle root and initial sale state
    await myNFT.setMerkleRoot(merkleRoot);
    await myNFT.setSaleState(1); // Set to Allowlist
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await myNFT.name()).to.equal(NAME);
      expect(await myNFT.symbol()).to.equal(SYMBOL);
    });

    it("Should set the correct owner", async function () {
      expect(await myNFT.owner()).to.equal(owner.address);
    });

    it("Should set initial parameters correctly", async function () {
      expect(await myNFT.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
      expect(await myNFT.MAX_MINT_PER_TX()).to.equal(MAX_MINT_PER_TX);
      expect(await myNFT.s_price()).to.equal(INITIAL_PRICE);
      expect(await myNFT.s_merkleRoot()).to.equal(merkleRoot);
      expect(await myNFT.s_saleState()).to.equal(1); // Allowlist
      expect(await myNFT.s_revealed()).to.be.false;
      expect(await myNFT.totalSupply()).to.equal(0);
    });

    it("Should support ERC2981 interface", async function () {
      const ERC2981_INTERFACE_ID = "0x2a55205a";
      expect(await myNFT.supportsInterface(ERC2981_INTERFACE_ID)).to.be.true;
    });
  });

  describe("Allowlist Minting", function () {
    it("Should allow an allowlisted user to mint", async function () {
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 1;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE }))
        .to.emit(myNFT, "Mint")
        .withArgs(addr1.address, quantity, 1, 1);

      expect(await myNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await myNFT.totalSupply()).to.equal(1);
    });

    it("Should not allow a non-allowlisted user to mint", async function () {
      const leaf = keccak256(addr3.address); // addr3 is not in allowlist
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 1;

      await expect(myNFT.connect(addr3).allowlistMint(proof, quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidProof");
    });

    it("Should not allow minting with invalid proof", async function () {
      const quantity = 1;
      // Provide a random proof or proof for a different address
      const invalidProof = [ethers.keccak256(ethers.toUtf8Bytes("invalid"))];

      await expect(myNFT.connect(addr1).allowlistMint(invalidProof, quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidProof");
    });

    it("Should not allow minting if sale is paused", async function () {
      await myNFT.setSaleState(0); // Paused
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 1;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidSaleState");
    });

    it("Should not allow minting if sale is public", async function () {
      await myNFT.setSaleState(2); // Public
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 1;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidSaleState");
    });

    it("Should not allow minting with insufficient funds", async function () {
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 1;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE - 1n }))
        .to.be.revertedWithCustomError(myNFT, "InsufficientFunds");
    });

    it("Should not allow minting zero quantity", async function () {
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = 0;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "ZeroQuantity");
    });

    it("Should not allow minting more than MAX_MINT_PER_TX", async function () {
      const leaf = keccak256(addr1.address);
      const proof = merkleTree.getHexProof(leaf);
      const quantity = MAX_MINT_PER_TX + 1;

      await expect(myNFT.connect(addr1).allowlistMint(proof, quantity, { value: INITIAL_PRICE * BigInt(quantity) }))
        .to.be.revertedWithCustomError(myNFT, "MaxMintPerTxExceeded");
    });

    it("Should not allow minting if exceeds MAX_SUPPLY", async function () {
      const leaf1 = keccak256(addr1.address);
      const proof1 = merkleTree.getHexProof(leaf1);
      await myNFT.connect(addr1).allowlistMint(proof1, MAX_MINT_PER_TX, { value: INITIAL_PRICE * BigInt(MAX_MINT_PER_TX) });

      const leaf2 = keccak256(addr2.address);
      const proof2 = merkleTree.getHexProof(leaf2);
      await myNFT.connect(addr2).allowlistMint(proof2, MAX_MINT_PER_TX, { value: INITIAL_PRICE * BigInt(MAX_MINT_PER_TX) });

      // Mint almost all supply
      for (let i = 0; i < Math.floor(MAX_SUPPLY / MAX_MINT_PER_TX) - 2; i++) {
        const tempAddr = addrs[i];
        allowlistAddresses.push(tempAddr.address);
        const newLeaves = allowlistAddresses.map((address) => keccak256(address));
        merkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
        await myNFT.setMerkleRoot(merkleTree.getHexRoot());
        const tempLeaf = keccak256(tempAddr.address);
        const tempProof = merkleTree.getHexProof(tempLeaf);
        await myNFT.connect(tempAddr).allowlistMint(tempProof, MAX_MINT_PER_TX, { value: INITIAL_PRICE * BigInt(MAX_MINT_PER_TX) });
      }

      // Try to mint one more than available
      const remainingSupply = MAX_SUPPLY - (await myNFT.totalSupply());
      const lastMinter = addrs[Math.floor(MAX_SUPPLY / MAX_MINT_PER_TX) - 1];
      allowlistAddresses.push(lastMinter.address);
      const newLeaves = allowlistAddresses.map((address) => keccak256(address));
      merkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
      await myNFT.setMerkleRoot(merkleTree.getHexRoot());
      const lastLeaf = keccak256(lastMinter.address);
      const lastProof = merkleTree.getHexProof(lastLeaf);

      await expect(myNFT.connect(lastMinter).allowlistMint(lastProof, remainingSupply + 1, { value: INITIAL_PRICE * BigInt(remainingSupply + 1) }))
        .to.be.revertedWithCustomError(myNFT, "ExceedsSupply");
    });
  });

  describe("Public Minting", function () {
    beforeEach(async function () {
      await myNFT.setSaleState(2); // Set to Public
    });

    it("Should allow any user to public mint", async function () {
      const quantity = 3;
      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE * BigInt(quantity) }))
        .to.emit(myNFT, "Mint")
        .withArgs(addr1.address, quantity, 1, 3);

      expect(await myNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await myNFT.ownerOf(2)).to.equal(addr1.address);
      expect(await myNFT.ownerOf(3)).to.equal(addr1.address);
      expect(await myNFT.totalSupply()).to.equal(3);
    });

    it("Should not allow public minting if sale is paused", async function () {
      await myNFT.setSaleState(0); // Paused
      const quantity = 1;

      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidSaleState");
    });

    it("Should not allow public minting if sale is allowlist", async function () {
      await myNFT.setSaleState(1); // Allowlist
      const quantity = 1;

      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "InvalidSaleState");
    });

    it("Should not allow public minting with insufficient funds", async function () {
      const quantity = 1;

      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE - 1n }))
        .to.be.revertedWithCustomError(myNFT, "InsufficientFunds");
    });

    it("Should not allow public minting zero quantity", async function () {
      const quantity = 0;

      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "ZeroQuantity");
    });

    it("Should not allow public minting more than MAX_MINT_PER_TX", async function () {
      const quantity = MAX_MINT_PER_TX + 1;

      await expect(myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE * BigInt(quantity) }))
        .to.be.revertedWithCustomError(myNFT, "MaxMintPerTxExceeded");
    });

    it("Should not allow public minting if exceeds MAX_SUPPLY", async function () {
      // Mint almost all supply
      for (let i = 0; i < Math.floor(MAX_SUPPLY / MAX_MINT_PER_TX); i++) {
        await myNFT.connect(addrs[i]).publicMint(MAX_MINT_PER_TX, { value: INITIAL_PRICE * BigInt(MAX_MINT_PER_TX) });
      }

      const remainingSupply = MAX_SUPPLY - (await myNFT.totalSupply());
      if (remainingSupply > 0) {
        await myNFT.connect(addr1).publicMint(remainingSupply, { value: INITIAL_PRICE * BigInt(remainingSupply) });
      }

      // Try to mint one more
      await expect(myNFT.connect(addr1).publicMint(1, { value: INITIAL_PRICE }))
        .to.be.revertedWithCustomError(myNFT, "ExceedsSupply");
    });
  });

  describe("Owner Controls", function () {
    it("Should allow owner to set price", async function () {
      const newPrice = ethers.parseEther("0.1");
      await expect(myNFT.connect(owner).setPrice(newPrice))
        .to.emit(myNFT, "PriceChanged")
        .withArgs(newPrice);
      expect(await myNFT.s_price()).to.equal(newPrice);
    });

    it("Should not allow non-owner to set price", async function () {
      const newPrice = ethers.parseEther("0.1");
      await expect(myNFT.connect(addr1).setPrice(newPrice))
        .to.be.revertedWithCustomError(myNFT, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to set base URI", async function () {
      const newURI = "ipfs://newBaseURI/";
      await expect(myNFT.connect(owner).setBaseURI(newURI))
        .to.emit(myNFT, "BaseURIChanged")
        .withArgs(newURI);
      // Check internal state (no direct getter for s_baseTokenURI, but tokenURI will reflect it)
      // Mint a token to check tokenURI
      await myNFT.setSaleState(2); // Public
      await myNFT.publicMint(1, { value: INITIAL_PRICE });
      expect(await myNFT.tokenURI(1)).to.equal(newURI + "1.json");
    });

    it("Should allow owner to set revealed URI", async function () {
      const newURI = "ipfs://newRevealedURI/";
      await expect(myNFT.connect(owner).setRevealedURI(newURI))
        .to.emit(myNFT, "RevealedURIChanged")
        .withArgs(newURI);
      // Check internal state (no direct getter for s_revealedTokenURI, but tokenURI will reflect it after reveal)
      await myNFT.setSaleState(2); // Public
      await myNFT.publicMint(1, { value: INITIAL_PRICE });
      await myNFT.reveal();
      expect(await myNFT.tokenURI(1)).to.equal(newURI + "1.json");
    });

    it("Should allow owner to set Merkle root", async function () {
      const newMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes("newRoot"));
      await expect(myNFT.connect(owner).setMerkleRoot(newMerkleRoot))
        .to.emit(myNFT, "MerkleRootChanged")
        .withArgs(newMerkleRoot);
      expect(await myNFT.s_merkleRoot()).to.equal(newMerkleRoot);
    });

    it("Should allow owner to set sale state", async function () {
      await expect(myNFT.connect(owner).setSaleState(0)) // Paused
        .to.emit(myNFT, "SaleStateChanged")
        .withArgs(0);
      expect(await myNFT.s_saleState()).to.equal(0);

      await expect(myNFT.connect(owner).setSaleState(2)) // Public
        .to.emit(myNFT, "SaleStateChanged")
        .withArgs(2);
      expect(await myNFT.s_saleState()).to.equal(2);
    });
  });

  describe("Reveal Mechanism", function () {
    beforeEach(async function () {
      await myNFT.setSaleState(2); // Public
      await myNFT.publicMint(1, { value: INITIAL_PRICE });
    });

    it("Should return base URI before reveal", async function () {
      expect(await myNFT.tokenURI(1)).to.equal(INITIAL_BASE_URI + "1.json");
    });

    it("Should allow owner to reveal the collection", async function () {
      await expect(myNFT.connect(owner).reveal())
        .to.emit(myNFT, "Revealed")
        .withArgs(INITIAL_REVEALED_URI);
      expect(await myNFT.s_revealed()).to.be.true;
      expect(await myNFT.tokenURI(1)).to.equal(INITIAL_REVEALED_URI + "1.json");
    });

    it("Should not allow non-owner to reveal", async function () {
      await expect(myNFT.connect(addr1).reveal())
        .to.be.revertedWithCustomError(myNFT, "OwnableUnauthorizedAccount");
    });

    it("Should not allow revealing twice", async function () {
      await myNFT.connect(owner).reveal();
      await expect(myNFT.connect(owner).reveal())
        .to.be.revertedWithCustomError(myNFT, "AlreadyRevealed");
    });

    it("Should revert for non-existent token", async function () {
      await expect(myNFT.tokenURI(999)).to.be.revertedWithCustomError(myNFT, "ERC721NonexistentToken");
    });
  });

  describe("Withdrawal", function () {
    it("Should allow owner to withdraw funds", async function () {
      await myNFT.setSaleState(2); // Public
      const quantity = 2;
      await myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE * BigInt(quantity) });

      const contractBalance = await ethers.provider.getBalance(myNFT.getAddress());
      expect(contractBalance).to.equal(INITIAL_PRICE * BigInt(quantity));

      const ownerInitialBalance = await ethers.provider.getBalance(owner.address);

      await expect(myNFT.connect(owner).withdraw())
        .to.emit(myNFT, "Withdrawal")
        .withArgs(owner.address, contractBalance);

      expect(await ethers.provider.getBalance(myNFT.getAddress())).to.equal(0);
      // Check owner's balance increased (approx due to gas costs)
      const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
      expect(ownerFinalBalance).to.be.closeTo(ownerInitialBalance + contractBalance, ethers.parseEther("0.001"));
    });

    it("Should not allow non-owner to withdraw funds", async function () {
      await myNFT.setSaleState(2); // Public
      const quantity = 1;
      await myNFT.connect(addr1).publicMint(quantity, { value: INITIAL_PRICE });

      await expect(myNFT.connect(addr1).withdraw())
        .to.be.revertedWithCustomError(myNFT, "OwnableUnauthorizedAccount");
    });

    it("Should do nothing if contract balance is zero", async function () {
      const ownerInitialBalance = await ethers.provider.getBalance(owner.address);
      await expect(myNFT.connect(owner).withdraw()).to.not.emit(myNFT, "Withdrawal");
      const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
      expect(ownerFinalBalance).to.be.closeTo(ownerInitialBalance, ethers.parseEther("0.0001")); // Only gas cost difference
    });
  });

  describe("Royalties (ERC2981)", function () {
    it("Should return default royalty info", async function () {
      const salePrice = ethers.parseEther("1");
      const royaltyInfo = await myNFT.royaltyInfo(1, salePrice);
      expect(royaltyInfo[0]).to.equal(owner.address); // Royalty recipient
      expect(royaltyInfo[1]).to.equal(salePrice * BigInt(ROYALTY_FEE_NUMERATOR) / 10000n); // 5% of salePrice
    });

    it("Should allow owner to set default royalty", async function () {
      const newRecipient = addr1.address;
      const newNumerator = 1000; // 10%
      await myNFT.connect(owner).setDefaultRoyalty(newRecipient, newNumerator);

      const salePrice = ethers.parseEther("1");
      const royaltyInfo = await myNFT.royaltyInfo(1, salePrice);
      expect(royaltyInfo[0]).to.equal(newRecipient);
      expect(royaltyInfo[1]).to.equal(salePrice * BigInt(newNumerator) / 10000n);
    });

    it("Should not allow non-owner to set default royalty", async function () {
      await expect(myNFT.connect(addr1).setDefaultRoyalty(addr1.address, 1000))
        .to.be.revertedWithCustomError(myNFT, "OwnableUnauthorizedAccount");
    });
  });
});
