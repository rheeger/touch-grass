import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { type WalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";

// Base Mainnet EAS Contract: https://base.easscan.org/
const EAS_CONTRACT_ADDRESS = "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587" as const;
const SCHEMA_REGISTRY_ADDRESS = "0x720c2bA66D19A725143FBf5fDC5b4ADA2742682E" as const;
const EAS_GRAPHQL_API = "https://base.easscan.org/graphql" as const;

// Schema definition
const SCHEMA_STRING = "bool isTouchingGrass, int256 lat, int256 lon" as const;
let SCHEMA_UID: string | null = null;

// Zero hash for refUID
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

interface GraphQLAttestation {
  id: string;
  attester: string;
  recipient: string;
  time: number;
  data: string;
  revoked: boolean;
  txid: string;
}

export interface Attestation {
  id: `0x${string}`;
  attester: `0x${string}`;
  recipient: `0x${string}`;
  timestamp: Date;
  isTouchingGrass: boolean;
  lat: number;
  lon: number;
  txHash: `0x${string}`;
}

// Convert fixed point to floating point
function fromFixed(num: bigint): number {
  return Number(num) / 10000000;
}

// Convert floating point to fixed point with 7 decimal places
function toFixed(num: number): bigint {
  return BigInt(Math.round(num * 10000000));
}

// Enhanced error logging
function logError(error: unknown, context: Record<string, unknown> = {}) {
  console.error('=== EAS Attestation Error Details ===');
  console.error('Context:', JSON.stringify(context, null, 2));
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    // Log cause if available
    if ('cause' in error && error.cause) {
      console.error('Error cause:', error.cause);
    }
  } else {
    console.error('Raw error:', error);
  }
  console.error('=====================================');
}

// Decode attestation data
function decodeAttestationData(encodedData: string): { isTouchingGrass: boolean; lat: number; lon: number } {
  const schemaEncoder = new SchemaEncoder("bool isTouchingGrass, int256 lat, int256 lon");
  const decodedData = schemaEncoder.decodeData(encodedData);
  
  return {
    isTouchingGrass: decodedData[0].value.value as boolean,
    lat: fromFixed(decodedData[1].value.value as bigint),
    lon: fromFixed(decodedData[2].value.value as bigint)
  };
}

// Initialize schema UID by checking for existing schema
async function initializeSchemaUID(): Promise<void> {
  try {
    const schemaQuery = `
      query GetSchema {
        schemata(where: { schema: { equals: "bool isTouchingGrass, int256 lat, int256 lon" } }) {
          id
          schema
          resolver
          revocable
        }
      }
    `;

    const response = await fetch(EAS_GRAPHQL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: schemaQuery
      })
    });

    const json = await response.json();
    console.log('Schema search response:', json);
    
    if (json.data?.schemata?.length > 0) {
      SCHEMA_UID = json.data.schemata[0].id;
      console.log('Found existing schema:', SCHEMA_UID);
    }
  } catch (error) {
    console.error('Failed to initialize schema UID:', error);
  }
}

// Call initialization on module load
initializeSchemaUID().catch(console.error);

export async function getAttestations(address?: `0x${string}`): Promise<Attestation[]> {
  try {
    // If schema UID is not initialized, try to initialize it
    if (!SCHEMA_UID) {
      await initializeSchemaUID();
      // If still no schema UID after initialization, return empty array
      if (!SCHEMA_UID) {
        console.log('No schema found. Create an attestation to register the schema.');
        return [];
      }
    }

    // GraphQL query for attestations with more fields
    const query = `
      query GetAttestations($where: AttestationWhereInput) {
        attestations(
          where: $where,
          orderBy: { time: desc }
          take: 100
        ) {
          id
          attester
          recipient
          time
          data
          revoked
          txid
          schemaId
        }
      }
    `;

    const variables = {
      where: {
        schemaId: { equals: SCHEMA_UID },
        revoked: { equals: false },
        ...(address ? { attester: { equals: address.toLowerCase() } } : {})
      }
    };

    console.log('Fetching attestations with:', {
      endpoint: EAS_GRAPHQL_API,
      variables,
      address,
      schemaId: SCHEMA_UID
    });

    const response = await fetch(EAS_GRAPHQL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const json = await response.json();
    console.log('Raw attestation response:', json);
    
    if (json.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
    }

    // Process and decode the attestations
    const attestations = json.data.attestations.map((attestation: GraphQLAttestation) => {
      const decodedData = decodeAttestationData(attestation.data);
      
      return {
        id: attestation.id as `0x${string}`,
        attester: attestation.attester as `0x${string}`,
        recipient: attestation.recipient as `0x${string}`,
        timestamp: new Date(Number(attestation.time) * 1000),
        ...decodedData,
        txHash: attestation.txid as `0x${string}`
      };
    });

    return attestations;
  } catch (error) {
    console.error('Failed to fetch attestations:', error);
    throw error;
  }
}

async function ensureBaseChain(walletClient: WalletClient): Promise<void> {
  const chainId = await walletClient.getChainId();
  if (chainId === base.id) return;

  try {
    // Try to switch chain
    await walletClient.switchChain({ id: base.id });
    console.log('Successfully switched to Base');
  } catch (switchError) {
    logError(switchError, { action: 'switchChain', targetChain: base.id });
    
    // If the chain hasn't been added yet, try to add it
    if ((switchError as Error).message.includes('Unrecognized chain')) {
      try {
        await walletClient.addChain({ chain: base });
        // Try switching again after adding
        await walletClient.switchChain({ id: base.id });
        console.log('Successfully added and switched to Base');
      } catch (addError) {
        logError(addError, { action: 'addChain', chain: base });
        throw new Error('Failed to add Base network to wallet. Please add it manually.');
      }
    } else {
      throw new Error('Failed to switch to Base network. Please switch manually in your wallet.');
    }
  }
}

export async function createGrassAttestation(
  walletClient: WalletClient,
  lat: number,
  lon: number,
  isTouchingGrass: boolean
) {
  const context = {
    walletAddress: walletClient.account?.address,
    coordinates: { lat, lon },
    isTouchingGrass,
    targetChain: {
      id: base.id,
      name: base.name
    }
  };

  try {
    if (!walletClient.account) {
      throw new Error('No wallet account found');
    }

    // Ensure we're on Base network
    await ensureBaseChain(walletClient);

    // Initialize SchemaEncoder with the schema string
    const schemaEncoder = new SchemaEncoder("bool isTouchingGrass, int256 lat, int256 lon");
    const encodedData = schemaEncoder.encodeData([
      { name: "isTouchingGrass", type: "bool", value: isTouchingGrass },
      { name: "lat", type: "int256", value: toFixed(lat) },
      { name: "lon", type: "int256", value: toFixed(lon) }
    ]);

    console.log('Encoded data:', encodedData);

    // Create the attestation using viem directly
    const hash = await walletClient.writeContract({
      chain: base,
      account: walletClient.account.address,
      address: EAS_CONTRACT_ADDRESS as `0x${string}`,
      abi: [{
        name: "attest",
        type: "function",
        stateMutability: "payable",
        inputs: [
          {
            name: "request",
            type: "tuple",
            components: [
              { name: "schema", type: "bytes32" },
              { name: "data", type: "tuple", 
                components: [
                  { name: "recipient", type: "address" },
                  { name: "expirationTime", type: "uint64" },
                  { name: "revocable", type: "bool" },
                  { name: "refUID", type: "bytes32" },
                  { name: "data", type: "bytes" },
                  { name: "value", type: "uint256" }
                ]
              }
            ]
          }
        ],
        outputs: [{ name: "", type: "bytes32" }]
      }],
      functionName: "attest",
      args: [{
        schema: SCHEMA_UID || ZERO_BYTES32,
        data: {
          recipient: walletClient.account.address,
          expirationTime: BigInt(0),
          revocable: true,
          refUID: ZERO_BYTES32,
          data: encodedData as `0x${string}`,
          value: BigInt(0)
        }
      }],
      value: BigInt(0)
    });

    console.log('Transaction created:', hash);
    return hash;
  } catch (error) {
    logError(error, context);
    throw error; // Re-throw to handle in the component
  }
} 
