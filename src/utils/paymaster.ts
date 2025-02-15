import { Address, Hash } from "viem";
import { base } from "viem/chains";
import { type ConnectedWallet } from "@privy-io/react-auth";
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account";
import { Bundler } from "@biconomy/bundler";
import { BiconomyPaymaster } from "@biconomy/paymaster";
import {
  ECDSAOwnershipValidationModule,
  DEFAULT_ECDSA_OWNERSHIP_MODULE,
} from "@biconomy/modules";
import {
  type TypedDataDomain,
  type TypedDataField,
} from "@ethersproject/abstract-signer";

// Helper function to wait for wallet initialization
const waitForWallet = async (wallet: ConnectedWallet): Promise<void> => {
  if (!wallet.address) {
    throw new Error("Wallet address not available");
  }

  console.log("Wallet state:", {
    address: wallet.address,
    type: wallet.walletClientType,
    chainId: wallet.chainId,
  });
};

export const createSmartAccountForEmail = async (
  wallet: ConnectedWallet
): Promise<BiconomySmartAccountV2> => {
  // Validate wallet state
  if (!wallet.address) {
    throw new Error("Wallet address not available");
  }

  // Wait for wallet to be fully initialized
  try {
    await waitForWallet(wallet);
    console.log("Wallet initialized successfully");
  } catch (error) {
    console.error("Wallet initialization failed:", error);
    throw new Error(
      "Failed to initialize wallet. Please refresh the page and try again."
    );
  }

  // Get the provider for signing
  console.log("Getting Ethereum provider...");
  const provider = await wallet.getEthereumProvider();
  console.log("Got Ethereum provider");

  // Initialize Biconomy Smart Account
  console.log("Creating smart account...");

  // Create a custom signer that implements the required interface
  const customSigner = {
    getAddress: async () => wallet.address as `0x${string}`,
    signMessage: async (message: string | Uint8Array) => {
      if (provider && provider.request) {
        const signature = await provider.request({
          method: "personal_sign",
          params: [
            typeof message === "string"
              ? message
              : Buffer.from(message).toString("hex"),
            wallet.address,
          ],
        });
        return signature as string;
      }
      throw new Error("Provider not available");
    },
    _signTypedData: async (
      domain: TypedDataDomain,
      types: Record<string, Array<TypedDataField>>,
      value: Record<string, unknown>
    ) => {
      if (provider && provider.request) {
        return (await provider.request({
          method: "eth_signTypedData_v4",
          params: [
            wallet.address,
            JSON.stringify({ domain, types, message: value }),
          ],
        })) as string;
      }
      throw new Error("Provider not available");
    },
  };

  // Initialize validation module
  const validationModule = await ECDSAOwnershipValidationModule.create({
    signer: customSigner,
    moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE,
  });

  // Initialize Biconomy bundler and paymaster
  const bundler = new Bundler({
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL || "",
    chainId: base.id,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
  });

  const paymaster = new BiconomyPaymaster({
    paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL || "",
  });

  // Create and return the smart account
  const biconomySmartAccount = await BiconomySmartAccountV2.create({
    chainId: base.id,
    bundler,
    paymaster,
    entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
    defaultValidationModule: validationModule,
    activeValidationModule: validationModule,
  });

  return biconomySmartAccount;
};

export const sendSponsoredTransaction = async (
  smartAccount: BiconomySmartAccountV2,
  to: Address,
  data: Hash,
  value: bigint = BigInt(0)
): Promise<string> => {
  try {
    const userOp = await smartAccount.buildUserOp([{
      to,
      data,
      value
    }]);

    const paymasterAndDataResponse = await smartAccount.paymaster?.getPaymasterAndData(userOp);
    if (paymasterAndDataResponse) {
      Object.assign(userOp, { paymasterAndData: paymasterAndDataResponse });
    }

    const userOpResponse = await smartAccount.sendUserOp(userOp);
    const transactionDetails = await userOpResponse.wait();

    return transactionDetails.receipt.transactionHash;
  } catch (error) {
    console.error('Error in sendSponsoredTransaction:', error);
    throw error;
  }
};
