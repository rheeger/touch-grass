import { type ConnectedWallet } from '@privy-io/react-auth';

export type ActiveWallet = ConnectedWallet;

/**
 * Retrieves the active wallet from the connected wallets.
 * 
 * @param user - The user object (unused)
 * @param wallets - Array of connected wallets
 * @returns A Promise resolving to the first connected wallet or null.
 */
export async function getActiveWallet(user: { email?: string } | null, wallets: ConnectedWallet[]): Promise<ActiveWallet | null> {
  // Simply return the first connected wallet if available.
  return wallets.length > 0 ? wallets[0] : null;
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