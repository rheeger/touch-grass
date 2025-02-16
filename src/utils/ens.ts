import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create a public client for ENS resolution (using Ethereum mainnet)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Cache for ENS names to avoid unnecessary lookups
const ensCache: { [address: string]: string | null } = {};

/**
 * Resolves an Ethereum address to its ENS name
 * @param address The Ethereum address to resolve
 * @returns The ENS name if found, null otherwise
 */
export async function resolveEnsName(address: string): Promise<string | null> {
  // Check cache first
  if (ensCache[address] !== undefined) {
    return ensCache[address];
  }

  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`,
    });

    // Cache the result (even if null)
    ensCache[address] = ensName;
    return ensName;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    ensCache[address] = null;
    return null;
  }
}

/**
 * Formats an address with its ENS name if available
 * @param address The Ethereum address to format
 * @returns Formatted string with ENS name if available, or shortened address
 */
export function formatAddressOrEns(address: string, ensName: string | null): string {
  if (ensName) {
    return ensName;
  }
  // Return shortened address if no ENS name
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Clear the cache periodically (every hour)
setInterval(() => {
  Object.keys(ensCache).forEach(key => delete ensCache[key]);
}, 3600000); 