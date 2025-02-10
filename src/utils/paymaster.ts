import { Address, Hash } from 'viem';
import { base } from 'viem/chains';
import { type ConnectedWallet } from '@privy-io/react-auth';
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account";
import { Bundler } from '@biconomy/bundler';
import { BiconomyPaymaster } from '@biconomy/paymaster';
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE } from "@biconomy/modules";
import { type TypedDataDomain, type TypedDataField } from '@ethersproject/abstract-signer';
import { PaymasterMode } from '@biconomy/paymaster';

// Helper function to wait for wallet initialization
const waitForWallet = async (wallet: ConnectedWallet): Promise<void> => {
  if (!wallet.address) {
    throw new Error('Wallet address not available');
  }

  console.log('Wallet state:', {
    address: wallet.address,
    type: wallet.walletClientType,
    chainId: wallet.chainId
  });
};

export const createSmartAccountForEmail = async (wallet: ConnectedWallet) => {
  // Validate wallet state
  if (!wallet.address) {
    throw new Error('Wallet address not available');
  }

  // Wait for wallet to be fully initialized
  try {
    await waitForWallet(wallet);
    console.log('Wallet initialized successfully');
  } catch (error) {
    console.error('Wallet initialization failed:', error);
    throw new Error('Failed to initialize wallet. Please refresh the page and try again.');
  }

  // Get the provider for signing
  console.log('Getting Ethereum provider...');
  const provider = await wallet.getEthereumProvider();
  console.log('Got Ethereum provider');

  // Initialize Biconomy Smart Account
  console.log('Creating smart account...');
  
  // Create a custom signer that implements the required interface
  const customSigner = {
    getAddress: async () => wallet.address as `0x${string}`,
    signMessage: async (message: string | Uint8Array) => {
      const messageStr = typeof message === 'string' ? message : Buffer.from(message).toString('hex');
      return provider.request({
        method: 'personal_sign',
        params: [messageStr, wallet.address]
      });
    },
    signTypedData: async (
      domain: TypedDataDomain,
      types: Record<string, Array<TypedDataField>>,
      message: Record<string, unknown>
    ) => {
      return provider.request({
        method: 'eth_signTypedData_v4',
        params: [wallet.address, JSON.stringify({ domain, types, message })]
      });
    },
    signMessageSmartAccountSigner: async (message: string | Uint8Array) => {
      const messageStr = typeof message === 'string' ? message : Buffer.from(message).toString('hex');
      return provider.request({
        method: 'personal_sign',
        params: [messageStr, wallet.address]
      });
    },
    provider: {
      ...provider,
      getNetwork: async () => ({ chainId: base.id }),
      _provider: provider
    },
    _signTypedData: async (
      domain: TypedDataDomain,
      types: Record<string, Array<TypedDataField>>,
      message: Record<string, unknown>
    ) => {
      return provider.request({
        method: 'eth_signTypedData_v4',
        params: [wallet.address, JSON.stringify({ domain, types, message })]
      });
    },
    connect: () => customSigner
  };

  const ownershipModule = await ECDSAOwnershipValidationModule.create({
    signer: customSigner,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
  });

  // Create bundler instance
  console.log('Creating bundler with URL:', process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL);
  const bundler = new Bundler({
    bundlerUrl: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL as string,
    chainId: base.id,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  });

  // Create paymaster instance
  console.log('Creating paymaster with URL:', process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL);
  const paymaster = new BiconomyPaymaster({
    paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_RPC_URL as string
  });

  const biconomyAccount = await BiconomySmartAccountV2.create({
    chainId: base.id,
    bundler,
    paymaster,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: ownershipModule,
    activeValidationModule: ownershipModule,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL as string
  });
  
  const address = await biconomyAccount.getAccountAddress();
  console.log('Smart account created:', address);

  return { 
    account: biconomyAccount,
    address: address as `0x${string}`
  };
};

export const sendSponsoredTransaction = async (
  smartAccount: BiconomySmartAccountV2,
  to: Address,
  data: Hash,
  value: bigint = BigInt(0)
) => {
  const calls = [{
    to,
    data,
    value
  }];

  console.log('Transaction Details:', {
    to,
    dataLength: data.length,
    dataHex: data,
    value: value.toString()
  });

  try {
    console.log('Building user operation...');
    const userOp = await smartAccount.buildUserOp(calls, {
      paymasterServiceData: {
        mode: PaymasterMode.SPONSORED,
        calculateGasLimits: true
      }
    });

    console.log('Sending user operation...');
    const userOpResponse = await smartAccount.sendUserOp(userOp);
    console.log('User operation hash:', userOpResponse.userOpHash);

    const transactionDetails = await userOpResponse.wait();
    console.log('Transaction receipt:', transactionDetails);
    
    return transactionDetails;
  } catch (error) {
    console.error('Transaction failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause
      });

      // Check for specific error types
      if (error.message.includes('max global sponsorship limit reached')) {
        throw new Error('Transaction cost too high for sponsorship. Please try again later or use a regular wallet transaction.');
      } else if (error.message.includes('AA13')) {
        throw new Error('Smart account initialization failed. Please try again with a different wallet.');
      } else if (error.message.includes('paymaster')) {
        throw new Error('Paymaster service is temporarily unavailable. Please try again in a few minutes.');
      } else if (error.message.includes('cannot sign')) {
        throw new Error('Failed to sign the transaction. Please ensure your wallet is properly connected and try again.');
      } else if (error.message.includes('maxFeePerGas') || error.message.includes('maxPriorityFeePerGas')) {
        throw new Error('Gas price configuration error. Please try again.');
      } else if (error.message.includes('execution reverted')) {
        console.error('Full execution revert error:', error);
        throw new Error('Transaction failed due to insufficient gas. Please try again with higher gas limits.');
      }
    }
    throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 