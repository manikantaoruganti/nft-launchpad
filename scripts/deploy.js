const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const MyNFT = await ethers.getContractFactory("MyNFT");

  // Constructor arguments for MyNFT
  const name = "My Awesome NFT";
  const symbol = "MANFT";
  const maxSupply = 10000;
  const maxMintPerTx = 5;
  const initialPrice = ethers.parseEther("0.05"); // 0.05 ETH
  const initialBaseURI = "ipfs://QmVzXgYhJkLpMnNqRsStUvWxYzAaBcDeFgHiJkL/"; // Placeholder for unrevealed metadata
  const initialRevealedURI = "ipfs://QmRevealedCID/"; // Placeholder for revealed metadata
  const royaltyRecipient = deployer.address; // Owner receives royalties
  const royaltyFeeNumerator = 500; // 5% (500/10000)

  const myNFT = await MyNFT.deploy(
    name,
    symbol,
    maxSupply,
    maxMintPerTx,
    initialPrice,
    initialBaseURI,
    initialRevealedURI,
    royaltyRecipient,
    royaltyFeeNumerator
  );

  await myNFT.waitForDeployment();

  const contractAddress = await myNFT.getAddress();
  console.log("MyNFT deployed to:", contractAddress);

  // Export ABI to frontend
  const artifactsPath = path.join(__dirname, "../artifacts/contracts/MyNFT.sol/MyNFT.json");
  const artifact = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
  const abi = artifact.abi;

  const frontendContractsDir = path.join(__dirname, "../frontend/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const frontendAbiPath = path.join(frontendContractsDir, "MyNFT.json");
  fs.writeFileSync(frontendAbiPath, JSON.stringify({ address: contractAddress, abi: abi }, null, 2));

  console.log("Contract ABI and address exported to:", frontendAbiPath);

  // Update .env.example with the deployed address
  const envExamplePath = path.join(__dirname, "../.env.example");
  let envExampleContent = fs.readFileSync(envExamplePath, "utf8");
  envExampleContent = envExampleContent.replace(
    /^NEXT_PUBLIC_CONTRACT_ADDRESS=.*$/m,
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync(envExamplePath, envExampleContent);
  console.log(".env.example updated with contract address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
