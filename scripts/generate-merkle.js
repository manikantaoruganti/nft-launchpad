const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const fs = require("fs");
const path = require("path");

async function main() {
  const allowlistPath = path.join(__dirname, "../allowlist.json");
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));

  // Hash each address to create leaves
  const leaves = allowlist.map((address) => keccak256(address));

  // Create Merkle Tree
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  const merkleRoot = merkleTree.getHexRoot();
  console.log("Merkle Root:", merkleRoot);

  // Generate proofs for each address and export
  const proofs = {};
  for (const address of allowlist) {
    const leaf = keccak256(address);
    proofs[address] = merkleTree.getHexProof(leaf);
  }

  const proofsPath = path.join(__dirname, "../frontend/contracts/proofs.json");
  fs.writeFileSync(proofsPath, JSON.stringify(proofs, null, 2));

  console.log("Proofs exported to:", proofsPath);
  console.log("\nRemember to update the Merkle Root in your deployed contract using `setMerkleRoot()`.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
