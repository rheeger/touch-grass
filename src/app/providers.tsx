'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { http } from 'viem';
import { sepolia } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
});

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
          config={{
            loginMethods: ['email', 'wallet'],
            appearance: {
              theme: 'light',
              accentColor: '#22C55E', // green-600
              showWalletLoginFirst: false,
            },
            defaultChain: sepolia,
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 