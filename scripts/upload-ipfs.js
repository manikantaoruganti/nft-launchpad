const pinataSDK = require("@pinata/sdk");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
  console.error("PINATA_API_KEY and PINATA_SECRET_API_KEY must be set in your .env file.");
  process.exit(1);
}

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY);

async function uploadFolderToIPFS(folderPath) {
  try {
    console.log(`Attempting to upload folder: ${folderPath}`);
    const options = {
      pinataMetadata: {
        name: path.basename(folderPath),
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };

    const result = await pinata.pinFromFS(folderPath, options);
    console.log("Successfully uploaded to Pinata!");
    console.log("IPFS CID:", result.IpfsHash);
    return result.IpfsHash;
  } catch (error) {
    console.error("Error uploading folder to Pinata:", error);
    throw error;
  }
}

async function main() {
  const metadataFolderPath = path.join(__dirname, "../metadata");

  // Ensure metadata folder exists
  if (!fs.existsSync(metadataFolderPath)) {
    console.error(`Error: Metadata folder not found at ${metadataFolderPath}`);
    console.error("Please create a 'metadata' folder with your ERC721 JSON files.");
    process.exit(1);
  }

  console.log("Authenticating with Pinata...");
  const authTest = await pinata.testAuthentication();
  console.log("Pinata Authentication Result:", authTest);

  const metadataCID = await uploadFolderToIPFS(metadataFolderPath);
  console.log(`\nMetadata folder uploaded. Use this CID for your contract's base URI: ipfs://${metadataCID}/`);
  console.log("Example: setBaseURI('ipfs://YOUR_METADATA_CID/')");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
