import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  hardhat,
  sepolia,
} from 'wagmi/chains';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'My NFT Launchpad',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get one from cloud.walletconnect.com
  chains: [hardhat, sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#9E7FFF',
          accentColorForeground: 'white',
          borderRadius: 'large',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
