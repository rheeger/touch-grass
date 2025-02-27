'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren, useEffect } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';

// Suppress non-critical wallet errors in development
const suppressWalletErrors = () => {
  const originalError = console.error;
  console.error = (...args) => {
    // Ignore specific wallet-related errors
    if (
      args[0]?.includes?.('chrome.runtime.sendMessage()') ||
      args[0]?.includes?.('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT') ||
      args[0]?.includes?.('Extension context invalidated')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
};

// Configure the wagmi client with Base mainnet
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(), // Uses Base's default public RPC endpoint
  },
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      suppressWalletErrors();
    }
  }, []);

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
          config={{
            loginMethods: ['wallet'],
            appearance: {
              theme: 'dark',
              accentColor: '#22C55E', // green-600
              showWalletLoginFirst: false,
            },
            defaultChain: base,
            supportedChains: [base],
            onboardingOnly: true
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 