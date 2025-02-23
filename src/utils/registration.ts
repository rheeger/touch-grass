import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import Logger from '@/utils/logger';

// Contract addresses
const COMMIT_CONTRACT_ADDRESS = '0xDc47402EBC739F6A33c008b7510240e7D5501207' as const;
const COMMIT_TOKEN_ID = 5n; // The specific token ID for Touch Grass Club
const START_BLOCK = 10_500_000n; // Approximate block number for Jan 1, 2025 on Base

// Minimal ABI for ERC1155 balance check
const ERC1155_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'TransferSingle',
    inputs: [
      { indexed: true, name: 'operator', type: 'address' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'id', type: 'uint256' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
  }
] as const;

// Initialize the public client for Base with custom RPC
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export interface RegistrationStatus {
  isRegistered: boolean;
  registrationDate?: Date;
}

/**
 * Checks if a wallet has registered (has the COMMIT NFT) and when they registered
 * @param walletAddress The wallet address to check
 * @returns Promise<RegistrationStatus> Registration status and date
 */
export async function getRegistrationStatus(walletAddress: string): Promise<RegistrationStatus> {
  try {
    Logger.info('Checking registration status', { walletAddress });
    
    const balance = await publicClient.readContract({
      address: COMMIT_CONTRACT_ADDRESS,
      abi: ERC1155_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`, COMMIT_TOKEN_ID],
    });

    const hasNFT = balance > 0n;
    
    if (!hasNFT) {
      return { isRegistered: false };
    }

    // Get the transfer event that minted the NFT to this address
    const transferEvents = await publicClient.getLogs({
      address: COMMIT_CONTRACT_ADDRESS,
      event: ERC1155_ABI[1],
      args: {
        from: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        to: walletAddress as `0x${string}`,
      },
      fromBlock: START_BLOCK,
    });

    // Filter events for our specific token ID after fetching
    const relevantEvents = transferEvents.filter(
      event => event.args && typeof event.args === 'object' && 'id' in event.args && event.args.id === COMMIT_TOKEN_ID
    );

    let registrationDate: Date | undefined;
    if (relevantEvents.length > 0) {
      const block = await publicClient.getBlock({
        blockNumber: relevantEvents[0].blockNumber,
      });
      registrationDate = new Date(Number(block.timestamp) * 1000);
    }

    Logger.info('Registration status checked', { 
      walletAddress, 
      hasNFT,
      registrationDate,
      balance: balance.toString() 
    });

    return { 
      isRegistered: hasNFT,
      registrationDate
    };
  } catch (error) {
    Logger.error('Failed to check registration status', { error, walletAddress });
    return { isRegistered: false };
  }
}

/**
 * Gets the registration URL for the Touch Grass Club
 * @returns string The URL to register
 */
export function getRegistrationUrl(): string {
  return 'https://www.commit.wtf/base/commit/5';
} 