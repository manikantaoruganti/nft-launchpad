import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'ethers';
import MyNFTAbi from '../contracts/MyNFT.json';
import proofs from '../contracts/proofs.json'; // Merkle proofs generated off-chain

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

const SaleState = {
  Paused: 0,
  Allowlist: 1,
  Public: 2,
};

const SaleStateNames = {
  0: 'Paused',
  1: 'Allowlist',
  2: 'Public',
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [merkleProof, setMerkleProof] = useState([]);
  const [mintStatus, setMintStatus] = useState('');

  // Read contract data
  const { data: saleState, isLoading: isLoadingSaleState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTAbi.abi,
    functionName: 's_saleState',
  });

  const { data: price, isLoading: isLoadingPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTAbi.abi,
    functionName: 's_price',
  });

  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTAbi.abi,
    functionName: 'totalSupply',
  });

  const { data: maxSupply, isLoading: isLoadingMaxSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTAbi.abi,
    functionName: 'MAX_SUPPLY',
  });

  const { data: maxMintPerTx, isLoading: isLoadingMaxMintPerTx } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MyNFTAbi.abi,
    functionName: 'MAX_MINT_PER_TX',
  });

  useEffect(() => {
    if (address && proofs[address]) {
      setMerkleProof(proofs[address]);
    } else {
      setMerkleProof([]);
    }
  }, [address]);

  // Write contract functions
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirmed) {
      setMintStatus('Mint successful!');
      // Optionally refetch data
    } else if (confirmError) {
      setMintStatus(`Mint failed: ${confirmError.shortMessage || confirmError.message}`);
    } else if (writeError) {
      setMintStatus(`Mint failed: ${writeError.shortMessage || writeError.message}`);
    } else if (isPending) {
      setMintStatus('Confirming transaction...');
    } else if (isLoadingSaleState || isLoadingPrice || isLoadingTotalSupply || isLoadingMaxSupply || isLoadingMaxMintPerTx) {
      setMintStatus('Loading contract data...');
    } else {
      setMintStatus('');
    }
  }, [isConfirmed, confirmError, writeError, isPending, isLoadingSaleState, isLoadingPrice, isLoadingTotalSupply, isLoadingMaxSupply, isLoadingMaxMintPerTx]);


  const handleMint = async () => {
    if (!isConnected || !CONTRACT_ADDRESS) {
      alert('Please connect your wallet and ensure contract address is set.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be at least 1.');
      return;
    }
    if (quantity > maxMintPerTx) {
      alert(`You can mint a maximum of ${maxMintPerTx} NFTs per transaction.`);
      return;
    }

    const value = price ? parseEther(formatEther(price) * quantity) : 0n;

    try {
      if (saleState === SaleState.Allowlist) {
        if (!merkleProof || merkleProof.length === 0) {
          alert('You are not on the allowlist or proof is missing.');
          return;
        }
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: MyNFTAbi.abi,
          functionName: 'allowlistMint',
          args: [merkleProof, BigInt(quantity)],
          value: value,
        });
      } else if (saleState === SaleState.Public) {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: MyNFTAbi.abi,
          functionName: 'publicMint',
          args: [BigInt(quantity)],
          value: value,
        });
      } else {
        alert('Minting is currently paused.');
      }
    } catch (err) {
      console.error('Minting error:', err);
      setMintStatus(`Minting failed: ${err.shortMessage || err.message}`);
    }
  };

  const isMintButtonDisabled = !isConnected || isPending || isConfirming || saleState === SaleState.Paused || (saleState === SaleState.Allowlist && merkleProof.length === 0);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-4 font-sans">
      <Head>
        <title>My NFT Launchpad</title>
        <meta name="description" content="A full-stack NFT launchpad" />
        <link rel="icon" href="https://www.pexels.com/photo/blue-and-purple-abstract-painting-167699/" /> {/* Placeholder Pexels image */}
      </Head>

      <header className="w-full max-w-4xl text-center py-8 mb-8 relative overflow-hidden rounded-xl shadow-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-20 animate-pulse-slow"></div>
        <img
          src="https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Abstract NFT background"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 p-8">
          <h1 className="text-6xl font-extrabold text-text mb-4 leading-tight tracking-tighter drop-shadow-lg">
            Unleash <span className="text-primary">Digital Art</span>
          </h1>
          <p className="text-xl text-textSecondary max-w-2xl mx-auto">
            Discover and mint unique NFTs from our exclusive collection. Join the future of digital ownership.
          </p>
        </div>
      </header>

      <main className="w-full max-w-md bg-surface rounded-xl shadow-lg p-8 border border-border animate-fade-in">
        <div className="flex justify-center mb-6">
          <ConnectButton data-testid="connect-wallet-button" />
        </div>

        {isConnected && (
          <div className="text-center mb-8 text-textSecondary">
            <p className="text-lg mb-2">
              Connected: <span data-testid="connected-address" className="text-primary font-medium">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </p>
            <hr className="border-border my-4" />
            <h2 className="text-2xl font-bold text-text mb-4">Mint Your NFT</h2>

            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="p-3 bg-background rounded-lg border border-border">
                <p className="text-sm text-textSecondary">Minted:</p>
                <p data-testid="mint-count" className="text-lg font-semibold text-primary">
                  {isLoadingTotalSupply ? '...' : totalSupply?.toString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg border border-border">
                <p className="text-sm text-textSecondary">Total Supply:</p>
                <p data-testid="total-supply" className="text-lg font-semibold text-primary">
                  {isLoadingMaxSupply ? '...' : maxSupply?.toString() || '0'}
                </p>
              </div>
              <div className="col-span-2 p-3 bg-background rounded-lg border border-border">
                <p className="text-sm text-textSecondary">Sale Status:</p>
                <p data-testid="sale-status" className={`text-lg font-semibold ${saleState === SaleState.Public ? 'text-success' : saleState === SaleState.Allowlist ? 'text-secondary' : 'text-error'}`}>
                  {isLoadingSaleState ? '...' : SaleStateNames[saleState]}
                </p>
              </div>
              <div className="col-span-2 p-3 bg-background rounded-lg border border-border">
                <p className="text-sm text-textSecondary">Price per NFT:</p>
                <p className="text-lg font-semibold text-primary">
                  {isLoadingPrice ? '...' : price ? `${formatEther(price)} ETH` : '0 ETH'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 mb-6">
              <label htmlFor="quantity-input" className="text-lg text-textSecondary">Quantity:</label>
              <input
                data-testid="quantity-input"
                id="quantity-input"
                type="number"
                min="1"
                max={maxMintPerTx?.toString() || "1"}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(Number(e.target.value), Number(maxMintPerTx || 1))))}
                className="w-24 p-2 rounded-lg bg-background border border-border text-text text-center focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
              />
            </div>

            <button
              data-testid="mint-button"
              onClick={handleMint}
              disabled={isMintButtonDisabled}
              className={`w-full py-3 px-6 rounded-xl text-lg font-bold transition-all duration-300
                ${isMintButtonDisabled
                  ? 'bg-surface text-textSecondary cursor-not-allowed opacity-60'
                  : 'bg-primary text-white hover:bg-primary/80 active:scale-98 shadow-lg hover:shadow-glow'
                }`}
            >
              {isPending || isConfirming ? 'Minting...' : 'Mint NFT'}
            </button>

            {mintStatus && (
              <p className={`mt-4 text-sm ${isConfirmed ? 'text-success' : 'text-error'}`}>
                {mintStatus}
              </p>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 text-textSecondary text-sm">
        <p>&copy; {new Date().getFullYear()} My NFT Launchpad. Powered by StackBlitz.</p>
      </footer>
    </div>
  );
}
