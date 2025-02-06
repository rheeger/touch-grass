'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';

// Configure the wagmi client with Base mainnet
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(), // Uses Base's default public RPC endpoint
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
            defaultChain: base,
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 