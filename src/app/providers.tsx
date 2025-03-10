'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { PropsWithChildren, useEffect } from 'react';
import { WagmiConfig, createConfig } from 'wagmi';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import Logger from '@/utils/logger';
import { libraries } from '@/config/mapConfig';

// Global variable to track Google Maps loading status
let googleMapsLoaded = false;

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

// Function to load Google Maps API if not already loaded
const loadGoogleMapsScript = (callback?: () => void) => {
  if (typeof window === 'undefined') return; // Guard against SSR
  
  // Check if script already exists
  if (document.getElementById('google-maps-script')) {
    if (callback && typeof callback === 'function') {
      callback();
    }
    return;
  }
  
  // Check if Google Maps is already available
  if (
    typeof window !== 'undefined' && 
    typeof window.google !== 'undefined' && 
    typeof window.google.maps !== 'undefined'
  ) {
    googleMapsLoaded = true;
    if (callback && typeof callback === 'function') {
      callback();
    }
    return;
  }
  
  // Create and append the script
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=${libraries.join(',')}&loading=async`;
  script.async = true;
  script.defer = true;
  
  // Set up load callback
  script.onload = () => {
    googleMapsLoaded = true;
    Logger.info('Google Maps script loaded via Providers');
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
  
  script.onerror = (error) => {
    Logger.error('Error loading Google Maps script', { error });
  };
  
  document.head.appendChild(script);
};

export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      suppressWalletErrors();
    }
    
    // Load Google Maps once at the app level
    if (!googleMapsLoaded) {
      loadGoogleMapsScript();
    }
    
    return () => {
      // No need to clean up the script since we want it to persist
    };
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
            supportedChains: [base]
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 