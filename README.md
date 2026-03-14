# 🚀 My NFT Launchpad: A Full-Stack Web3 Project

Welcome to the My NFT Launchpad, a comprehensive, production-grade platform for launching and minting ERC721 NFTs. This project provides a complete ecosystem, from smart contract development and off-chain tooling to a modern Next.js frontend and Dockerized deployment.

## ✨ Project Overview

This launchpad is designed to be robust, secure, and user-friendly, incorporating best practices for Web3 development. It features:

*   **Hardhat Smart Contract Project:** A well-tested Solidity contract for ERC721 NFTs with advanced features.
*   **Off-chain Scripts:** Tools for Merkle tree generation and IPFS metadata uploads.
*   **Next.js Frontend DApp:** An intuitive interface for wallet connection and NFT minting.
*   **Docker Containerization:** Seamless local development and deployment setup.
*   **Comprehensive Testing:** Unit tests for smart contract logic.
*   **Environment Configuration:** Easy management of API keys and contract addresses.
*   **Portfolio-Quality Documentation:** This README!

## 🏗️ Architecture

The project follows a standard full-stack Web3 architecture:

*   **Smart Contracts (Solidity/Hardhat):** The core logic for NFT minting, ownership, and sale phases resides on the Ethereum blockchain.
*   **Off-chain Scripts (Node.js):** Utility scripts handle tasks like generating Merkle proofs for allowlists and uploading NFT metadata to IPFS.
*   **Frontend DApp (Next.js/React):** A client-side application that interacts with the smart contract via `wagmi` and `ethers.js`, providing a user interface for minting.
*   **Local Blockchain (Hardhat Network):** For development and testing, a local Ethereum network is spun up.
*   **IPFS (Pinata):** Decentralized storage for NFT metadata and assets.
*   **Docker:** Containerizes the Hardhat node and Next.js frontend for consistent development and deployment environments.

```
+-------------------+       +-------------------+       +-------------------+
|   Next.js DApp    | <---> |   Hardhat Node    | <---> |  MyNFT.sol (EVM)  |
| (Wallet, Mint UI) |       | (Local Blockchain)|       |                   |
+-------------------+       +-------------------+       +-------------------+
         ^                           ^
         |                           |
         |                           |
+-------------------+       +-------------------+
|  Off-chain Scripts| ----> |    IPFS/Pinata    |
| (Merkle, IPFS)    |       | (Metadata Storage)|
+-------------------+       +-------------------+
```

## 💎 Smart Contract Features (`contracts/MyNFT.sol`)

The `MyNFT.sol` contract is built on OpenZeppelin standards and includes:

*   **ERC721 Standard:** Full compliance with the ERC721 non-fungible token standard.
*   **ERC721URIStorage:** Efficient storage for token URIs.
*   **ERC2981 Royalties:** Built-in support for NFT royalties, allowing creators to earn on secondary sales.
*   **Ownable Access Control:** Secure ownership management, restricting sensitive functions to the contract deployer.
*   **Merkle Tree Allowlist:** Implements `MerkleProof` verification for a gas-efficient allowlist (whitelist) minting phase.
*   **Phased Minting:**
    *   `enum SaleState { Paused, Allowlist, Public }`: Controls the current minting phase.
    *   `allowlistMint(bytes32[] calldata proof, uint256 quantity)`: Allows allowlisted users to mint with a Merkle proof.
    *   `publicMint(uint256 quantity)`: Enables public minting.
*   **Reveal Mechanism:**
    *   `s_revealed` flag and `reveal()` function to switch between a placeholder URI and the final revealed URI.
    *   `tokenURI` logic dynamically adjusts based on the reveal status.
*   **Owner Controls:**
    *   `setPrice()`: Adjusts the price per NFT.
    *   `setBaseURI()`: Sets the base URI for unrevealed tokens.
    *   `setRevealedURI()`: Sets the base URI for revealed tokens.
    *   `setMerkleRoot()`: Updates the Merkle root for the allowlist.
    *   `setSaleState()`: Changes the current minting phase.
*   **Withdrawal Logic:** `withdraw()` function allows the owner to collect accumulated Ether from sales.
*   **Gas Optimizations:**
    *   Removed `ERC721Enumerable` to reduce contract size and gas costs.
    *   Uses custom errors (e.g., `error InvalidSaleState();`) instead of `require` strings for significant gas savings.

## 🌳 Allowlist Merkle Explanation

The allowlist mechanism uses a Merkle tree for efficient on-chain verification.

1.  **`allowlist.json`:** A list of Ethereum addresses (e.g., `["0xabc...", "0xdef..."]`) is maintained off-chain.
2.  **`scripts/generate-merkle.js`:** This script reads `allowlist.json`, hashes each address (creating "leaves"), and constructs a Merkle tree. It then calculates the `merkleRoot` and generates a `proofs.json` file containing a Merkle proof for each allowlisted address.
3.  **On-chain Verification:** When an allowlisted user calls `allowlistMint`, they provide their address and their corresponding Merkle proof. The smart contract uses `MerkleProof.verify()` to check if the provided proof, combined with the user's address (hashed as a leaf), matches the `s_merkleRoot` stored in the contract. This verifies that the user is indeed part of the allowlist without storing all addresses on-chain, saving significant gas.

## 🖼️ IPFS Metadata

NFT metadata and images are stored on IPFS for decentralization and immutability.

1.  **`images/` folder:** Contains the actual NFT image files (e.g., `1.png`, `2.png`). These should be uploaded to IPFS first.
2.  **`metadata/` folder:** Contains JSON files for each NFT (e.g., `1.json`, `2.json`). Each JSON file follows the ERC721 metadata standard:

    ```json
    {
      "name": "My NFT #1",
      "description": "Generative NFT",
      "image": "ipfs://<IMAGE_CID>/1.png", // IMPORTANT: This should be the IPFS CID of your images folder
      "attributes": [
        {
          "trait_type": "Background",
          "value": "Cosmic"
        }
      ]
    }
    ```

3.  **`scripts/upload-ipfs.js`:** This script uses the Pinata API to upload the `metadata/` folder to IPFS. It outputs the CID of the uploaded folder. This CID should then be set as the `_baseTokenURI` or `_revealedTokenURI` in your smart contract.

    **Note on Image CIDs:** Before running `upload-ipfs.js` for metadata, you should ideally upload your `images/` folder to IPFS separately (e.g., manually via Pinata or with another script) to get its CID. Then, update the `image` field in your `metadata/*.json` files to reference this image CID (e.g., `ipfs://YOUR_IMAGE_FOLDER_CID/1.png`). The provided `upload-ipfs.js` focuses on metadata upload, assuming image CIDs are already embedded.

## 🌐 Frontend Architecture (Next.js)

The frontend is a modern Next.js DApp designed for a smooth user experience.

*   **Framework:** Next.js with React.
*   **Wallet Connection:** Integrates `wagmi` and `RainbowKit` for easy and secure wallet connection.
*   **Contract Interaction:** Uses `wagmi` hooks (`useReadContract`, `useWriteContract`) to interact with the deployed `MyNFT` smart contract.
*   **Minting Interface:**
    *   `data-testid="connect-wallet-button"`: Connects user's wallet.
    *   `data-testid="connected-address"`: Displays the connected wallet address.
    *   `data-testid="quantity-input"`: Input field for the number of NFTs to mint.
    *   `data-testid="mint-button"`: Triggers the minting transaction.
    *   Dynamically calls `allowlistMint` or `publicMint` based on the contract's `s_saleState`.
*   **Contract Data Display:**
    *   `data-testid="mint-count"`: Shows the current number of minted NFTs.
    *   `data-testid="total-supply"`: Displays the maximum supply of NFTs.
    *   `data-testid="sale-status"`: Indicates the current sale phase (Paused, Allowlist, Public).
*   **Styling:** Tailwind CSS for a clean, responsive, and modern UI, adhering to the provided design scheme.
*   **Accessibility:** Designed with accessibility in mind, including clear focus states and semantic HTML.

## 🐳 Docker Setup

The project is fully Dockerized for isolated and reproducible development environments.

*   **`Dockerfile`:** A multi-stage Dockerfile:
    *   **`contracts_stage`:** Installs Hardhat dependencies, copies contract files, and compiles the smart contracts.
    *   **`frontend_stage`:** Copies compiled contract ABIs from the `contracts_stage`, installs Next.js dependencies, and prepares the frontend for development.
*   **`docker-compose.yml`:** Orchestrates two services:
    *   **`hardhat-node`:** Runs a local Hardhat development blockchain on port `8545`. Includes a health check to ensure it's ready before the frontend starts.
    *   **`frontend`:** Runs the Next.js development server on port `3000`. It depends on `hardhat-node` being healthy, ensuring the blockchain is available for contract interaction.

## ⚙️ Environment Configuration (`.env.example`)

The `.env.example` file outlines all necessary environment variables. You should create a `.env` file based on this example and fill in your actual values.

*   `SEPOLIA_RPC_URL`: Your RPC endpoint for the Sepolia testnet (e.g., from Infura or Alchemy).
*   `PRIVATE_KEY`: The private key of the account used for deploying contracts to Sepolia. **Handle with extreme care; never commit to public repositories.**
*   `PINATA_API_KEY`, `PINATA_SECRET_API_KEY`: Your API keys for Pinata to upload files to IPFS.
*   `ETHERSCAN_API_KEY`: (Optional) For verifying contracts on Etherscan.
*   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect Project ID (required for RainbowKit).
*   `NEXT_PUBLIC_CONTRACT_ADDRESS`: The address of your deployed `MyNFT` contract. This will be automatically updated in `.env.example` after running the `deploy` script.

## 🧪 Unit Tests (`test/MyNFT.test.js`)

Comprehensive unit tests are written using Hardhat, Chai, and Ethers.js to ensure the smart contract's logic is sound and secure. Tests cover:

*   **Deployment:** Correct initialization of contract parameters.
*   **Allowlist Minting:**
    *   Successful minting by allowlisted users with valid proofs.
    *   Rejection of non-allowlisted users or invalid proofs.
    *   Restrictions based on `SaleState`.
    *   Handling of insufficient funds, zero quantity, and exceeding `MAX_MINT_PER_TX` or `MAX_SUPPLY`.
*   **Public Minting:**
    *   Successful minting by any user during the public sale.
    *   Restrictions based on `SaleState`.
    *   Handling of insufficient funds, zero quantity, and exceeding `MAX_MINT_PER_TX` or `MAX_SUPPLY`.
*   **Owner Controls:** Verification that only the owner can call administrative functions (`setPrice`, `setBaseURI`, `setRevealedURI`, `setMerkleRoot`, `setSaleState`).
*   **Reveal Mechanism:** Correct `tokenURI` behavior before and after reveal, and ensuring reveal can only happen once by the owner.
*   **Withdrawal:** Proper transfer of funds to the owner and rejection of non-owner withdrawals.
*   **Royalties (ERC2981):** Correct calculation and setting of royalty information.

## 🚀 Getting Started

Follow these steps to set up and run the project locally using Docker.

### Prerequisites

*   Docker and Docker Compose installed.
*   Node.js and npm (for initial setup and running scripts outside Docker if preferred).

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nft-launchpad
```

### 2. Environment Configuration

Create a `.env` file in the root directory based on `.env.example` and fill in your details.

```bash
cp .env.example .env
# Open .env and fill in your keys
```

**CRITICAL:** For `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, you need to get a Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com/).

### 3. Prepare Allowlist and Metadata

#### a. Create `allowlist.json`

Ensure your `allowlist.json` file (in the root directory) contains an array of Ethereum addresses for your allowlist. A dummy file is provided.

#### b. Prepare NFT Metadata and Images

1.  Create an `images/` folder in the root directory and place your NFT image files (e.g., `1.png`, `2.png`).
2.  Create a `metadata/` folder in the root directory. For each NFT, create a JSON file (e.g., `1.json`, `2.json`) following the ERC721 standard. **Ensure the `image` field in your JSON points to the IPFS CID of your uploaded images.**

    *Example `metadata/1.json`:*
    ```json
    {
      "name": "My NFT #1",
      "description": "A unique generative NFT from our collection.",
      "image": "ipfs://YOUR_IMAGE_FOLDER_CID/1.png",
      "attributes": [
        { "trait_type": "Background", "value": "Cosmic" }
      ]
    }
    ```

### 4. Build and Run with Docker Compose

This command will build the Docker images, start the Hardhat local node, and then start the Next.js frontend.

```bash
docker-compose up --build
```

This will:
*   Build the `hardhat-node` image, compile contracts, and start a local blockchain on `http://localhost:8545`.
*   Build the `frontend` image, copy the compiled contract ABI, install frontend dependencies, and start the Next.js dev server on `http://localhost:3000`.

### 5. Deploy Contract and Generate Merkle Proofs

Once `hardhat-node` is healthy (you'll see logs indicating it's running), you need to deploy your contract and generate Merkle proofs. You can do this by executing commands inside the running `hardhat-node` container.

#### a. Deploy the Contract

Open a new terminal and execute the deploy script inside the `hardhat-node` container:

```bash
docker exec -it hardhat-node npx hardhat run scripts/deploy.js --network localhost
```

This will:
*   Deploy `MyNFT.sol` to your local Hardhat network.
*   Log the deployed contract address.
*   Export the contract ABI and address to `frontend/contracts/MyNFT.json`.
*   Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in your local `.env.example` (you'll need to manually copy this to your `.env` if you want to persist it, or restart docker-compose to pick it up).

#### b. Generate Merkle Proofs

Next, generate the Merkle root and proofs:

```bash
docker exec -it hardhat-node node scripts/generate-merkle.js
```

This will:
*   Read `allowlist.json`.
*   Generate the Merkle root and print it.
*   Export `proofs.json` to `frontend/contracts/proofs.json`.

**IMPORTANT:** After deployment and Merkle generation, you'll need to manually set the Merkle root and initial sale state on your deployed contract. You can do this via a Hardhat console or by adding a script. For example, to set the Merkle root:

```bash
# Example: Open Hardhat console in the container
docker exec -it hardhat-node npx hardhat console --network localhost

# Inside the console:
# const MyNFT = await ethers.getContractFactory("MyNFT");
# const myNFT = await MyNFT.attach("YOUR_DEPLOYED_CONTRACT_ADDRESS");
# await myNFT.setMerkleRoot("YOUR_GENERATED_MERKLE_ROOT");
# await myNFT.setSaleState(1); // 1 for Allowlist, 2 for Public
```

### 6. Access the Frontend

Once the `frontend` service is running, open your browser and navigate to:

[http://localhost:3000](http://localhost:3000)

You should now be able to:
*   Connect your wallet (e.g., MetaMask connected to `localhost:8545`).
*   See the contract data (mint count, total supply, sale status).
*   Mint NFTs according to the current sale state and your allowlist status.

### 7. Upload Metadata to IPFS (Optional, but recommended for production)

To upload your `metadata/` folder to Pinata:

```bash
docker exec -it hardhat-node node scripts/upload-ipfs.js
```

**Note:** Ensure your `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` are set in your `.env` file. After uploading, you'll get a CID. You'll then need to call `setBaseURI()` and/or `setRevealedURI()` on your deployed contract with the `ipfs://YOUR_METADATA_CID/` prefix.

### 8. Running Tests

To run the smart contract unit tests:

```bash
docker exec -it hardhat-node npx hardhat test
```

### 9. Stopping Docker Compose

To stop and remove the Docker containers:

```bash
docker-compose down
```

## 🤝 Contributing

Feel free to fork this repository and contribute!

## 📄 License

This project is licensed under the MIT License.
