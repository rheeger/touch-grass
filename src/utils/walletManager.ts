import { type ConnectedWallet } from '@privy-io/react-auth';

export type ActiveWallet = ConnectedWallet;

/**
 * Retrieves the active wallet from the connected wallets.
 * 
 * @param wallets - Array of connected wallets
 * @returns A Promise resolving to the first non-embedded wallet or null.
 */
export async function getActiveWallet(wallets: ConnectedWallet[]): Promise<ActiveWallet | null> {
  // Filter out Privy embedded wallets and return the first available wallet
  const availableWallets = wallets.filter(wallet => 
    wallet.connectorType !== 'embedded' && 
    wallet.walletClientType !== 'privy'
  );
  
  return availableWallets.length > 0 ? availableWallets[0] : null;
}

/**
 * Retrieves the wallet address from an ActiveWallet.
 * @param wallet - The active wallet
 * @returns A Promise resolving to the wallet address string if available.
 */
export async function getWalletAddress(wallet: ActiveWallet): Promise<string | undefined> {
  if ('address' in wallet && typeof wallet.address === 'string') {
    return wallet.address;
  } else if ('getAddress' in wallet && typeof wallet.getAddress === 'function') {
    return wallet.getAddress();
  }
  return undefined;
}

/**
 * Type guard to check if the provided wallet is a ConnectedWallet.
 * @param wallet - The wallet to check
 * @returns true if wallet has properties of ConnectedWallet
 */
export function isConnectedWallet(wallet: ActiveWallet): wallet is ConnectedWallet {
  return (wallet as ConnectedWallet).walletClientType !== undefined;
} 