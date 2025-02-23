import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { base } from "viem/chains";
import { Interface } from "@ethersproject/abi";
import type { UnsignedTransactionRequest } from "@privy-io/react-auth";
import { getWalletAddress, type ActiveWallet } from "@/utils/walletManager";
import Logger from '@/utils/logger';

const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
const EAS_GRAPHQL_API = "https://base.easscan.org/graphql" as const;

const EAS_ABI = [
  {
    name: "attest",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "schema", type: "bytes32" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "recipient", type: "address" },
              { name: "expirationTime", type: "uint64" },
              { name: "revocable", type: "bool" },
              { name: "refUID", type: "bytes32" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
];

const easInterface = new Interface(EAS_ABI);

const SCHEMA_UID = process.env.NEXT_PUBLIC_EAS_SCHEMA_UID as `0x${string}`;
const SCHEMA_RAW =
  "uint256 eventTimestamp,string srs,string locationType,string location,string[] recipeType,bytes[] recipePayload,string[] mediaType,string[] mediaData,string memo" as const;

const TOUCH_GRASS_MEDIA_TYPE = "rheeger/touch-grass-v0.1" as const;
const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

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

interface DecodedField {
  name: string;
  value: { value: unknown };
}

function toGeoJSON(lon: number, lat: number): string {
  return JSON.stringify({
    type: "Point",
    coordinates: [lon, lat],
  });
}

function fromGeoJSON(geoJSON: string): { lat: number; lon: number } {
  const data = JSON.parse(geoJSON);
  if (
    data.type !== "Point" ||
    !Array.isArray(data.coordinates) ||
    data.coordinates.length !== 2
  ) {
    throw new Error("Invalid GeoJSON format");
  }
  return {
    lon: data.coordinates[0],
    lat: data.coordinates[1],
  };
}

function createTouchGrassMediaData(isTouchingGrass: boolean): string {
  return JSON.stringify({
    isTouchingGrass,
    version: "0.1",
  });
}

function extractTouchGrassStatus(mediaData: string): boolean {
  try {
    const data = JSON.parse(mediaData);
    return !!data.isTouchingGrass;
  } catch (error) {
    Logger.error('Failed to parse touch grass media data', { error });
    return false;
  }
}

function decodeAttestationData(encodedData: string): {
  isTouchingGrass: boolean;
  lat: number;
  lon: number;
} {
  const schemaEncoder = new SchemaEncoder(SCHEMA_RAW);
  const decodedData = schemaEncoder.decodeData(encodedData) as DecodedField[];

  const location = decodedData.find((field: DecodedField) => field.name === "location")?.value.value as string;
  const mediaData = decodedData.find((field: DecodedField) => field.name === "mediaData")?.value.value as string[];

  if (!location || !mediaData?.length) {
    throw new Error("Missing required fields in attestation data");
  }

  const coordinates = fromGeoJSON(location);
  const isTouchingGrass = extractTouchGrassStatus(mediaData[0]);

  return {
    isTouchingGrass,
    lat: coordinates.lat,
    lon: coordinates.lon,
  };
}

async function initializeSchemaUID(): Promise<void> {
  try {
    const schemaQuery = `
      query GetSchema {
        schemata(where: { id: { equals: "${SCHEMA_UID}" } }) {
          id
          schema
          resolver
          revocable
        }
      }
    `;

    const response = await fetch(EAS_GRAPHQL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: schemaQuery }),
    });

    const json = await response.json();
    Logger.debug('Schema search response', { response: json });

    if (!json.data?.schemata?.length) {
      throw new Error("Schema not found. Please ensure you're using the correct schema UID.");
    }
  } catch (error) {
    Logger.error('Failed to verify schema', { error });
    throw error;
  }
}

initializeSchemaUID().catch((error) => Logger.error('Schema initialization failed', { error }));

interface AttestationFilter {
  schemaId?: { equals: `0x${string}` };
  revoked?: { equals: boolean };
  OR?: Array<{ attester?: { equals: `0x${string}` }; recipient?: { equals: `0x${string}` } }>;
}

interface AttestationWhereClause {
  AND: AttestationFilter[];
}

export async function getAttestations(address?: `0x${string}`): Promise<Attestation[]> {
  try {
    if (!SCHEMA_UID) {
      await initializeSchemaUID();
      if (!SCHEMA_UID) {
        Logger.info('No schema found. Create an attestation to register the schema.');
        return [];
      }
    }

    const whereClause: AttestationWhereClause = {
      AND: [
        { schemaId: { equals: SCHEMA_UID } },
        { revoked: { equals: false } }
      ]
    };

    if (address) {
      whereClause.AND.push({
        OR: [
          { attester: { equals: address } },
          { recipient: { equals: address } }
        ]
      });
    }

    const variables = { where: whereClause };

    const query = `
      query GetAttestations($where: AttestationWhereInput!) {
        attestations(
          where: $where
          orderBy: [{ time: desc }]
          take: 100
        ) {
          id
          attester
          recipient
          time
          data
          revoked
          txid
        }
      }
    `;

    Logger.debug('Fetching attestations', {
      endpoint: EAS_GRAPHQL_API,
      variables,
      address,
      schemaId: SCHEMA_UID,
      whereClause,
    });

    const response = await fetch(EAS_GRAPHQL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    Logger.debug('Raw attestation response', { response: json });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (json.errors) {
      Logger.error('GraphQL errors', { errors: json.errors });
      throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
    }

    if (!json.data?.attestations) {
      Logger.warn('No attestations found in response', { response: json });
      return [];
    }

    const attestations = json.data.attestations.map((attestation: GraphQLAttestation) => {
      const decodedData = decodeAttestationData(attestation.data);
      return {
        id: attestation.id as `0x${string}`,
        attester: attestation.attester as `0x${string}`,
        recipient: attestation.recipient as `0x${string}`,
        timestamp: new Date(Number(attestation.time) * 1000),
        ...decodedData,
        txHash: attestation.txid as `0x${string}`,
      };
    });

    return attestations;
  } catch (error) {
    Logger.error('Failed to fetch attestations', { error });
    throw error;
  }
}

export function prepareGrassAttestation(
  walletAddress: string,
  lat: number,
  lon: number,
  isTouchingGrass: boolean
): UnsignedTransactionRequest {
  const schemaEncoder = new SchemaEncoder(SCHEMA_RAW);
  const locationGeoJSON = toGeoJSON(lon, lat);
  const touchGrassData = createTouchGrassMediaData(isTouchingGrass);
  const eventTimestamp = BigInt(Math.floor(Date.now() / 1000));

  const encodedData = schemaEncoder.encodeData([
    { name: "eventTimestamp", type: "uint256", value: eventTimestamp },
    { name: "srs", type: "string", value: "gps" },
    { name: "locationType", type: "string", value: "GeoJSON:Point" },
    { name: "location", type: "string", value: locationGeoJSON },
    { name: "recipeType", type: "string[]", value: [] },
    { name: "recipePayload", type: "bytes[]", value: [] },
    { name: "mediaType", type: "string[]", value: [TOUCH_GRASS_MEDIA_TYPE] },
    { name: "mediaData", type: "string[]", value: [touchGrassData] },
    { name: "memo", type: "string", value: "" },
  ]);

  const attestationRequest = {
    schema: SCHEMA_UID,
    data: {
      recipient: walletAddress,
      expirationTime: BigInt(0),
      revocable: true,
      refUID: ZERO_BYTES32,
      data: encodedData,
      value: BigInt(0),
    },
  };

  const encodedFunction = easInterface.encodeFunctionData("attest", [attestationRequest]);

  Logger.info('Preparing attestation', {
    contract: EAS_CONTRACT_ADDRESS,
    schema: SCHEMA_UID,
    recipient: walletAddress,
    encodedData: encodedData,
    fullCallData: encodedFunction
  });

  return {
    to: EAS_CONTRACT_ADDRESS,
    data: encodedFunction,
    value: '0x0',
    chainId: base.id,
  };
}

export function getTransactionUIOptions(isTouchingGrass: boolean) {
  return {
    description: `Attest that you are ${isTouchingGrass ? '' : 'not '}touching grass`,
    buttonText: 'Create Attestation',
    successHeader: 'Attestation Created!',
    successDescription: `Successfully attested that you are ${isTouchingGrass ? '' : 'not '}touching grass`,
    transactionInfo: {
      title: 'Touch Grass Attestation',
      action: 'Create Attestation',
      contractInfo: {
        name: 'EAS (Ethereum Attestation Service)',
        url: 'https://base.easscan.org/',
      },
    },
  };
}

/**
 * Creates a grass attestation transaction and returns the transaction hash along with updated attestations.
 */
export async function createAttestation(
  activeWallet: ActiveWallet,
  location: { lat: number; lng: number },
  isTouchingGrass: boolean,
  currentCount: number
): Promise<{ transactionHash: string; attestations: Attestation[] }> {
  const accountAddress = await getWalletAddress(activeWallet);
  if (!accountAddress) {
    throw new Error('Active wallet does not have a valid address. Please connect a wallet to continue.');
  }

  const tx = prepareGrassAttestation(accountAddress, location.lat, location.lng, isTouchingGrass);
  if (!tx.to || !tx.data) {
    throw new Error("Invalid transaction payload from prepareGrassAttestation: missing 'to' address or data.");
  }

  const toAddress: string =
    typeof tx.to === 'string'
      ? tx.to
      : '0x' + Array.from(tx.to as ArrayLike<number>).map((num: number) => num.toString(16).padStart(2, '0')).join('');

  const dataString: string =
    typeof tx.data === 'string'
      ? tx.data
      : '0x' + Array.from(tx.data as ArrayLike<number>).map((num: number) => num.toString(16).padStart(2, '0')).join('');

  const txValue: bigint =
    tx.value !== undefined
      ? (typeof tx.value === 'bigint' ? tx.value : BigInt(tx.value))
      : BigInt(0);

  const provider = await activeWallet.getEthereumProvider();
  const transactionHash: string = await provider.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: activeWallet.address,
        to: toAddress,
        data: dataString,
        value: '0x' + txValue.toString(16),
      },
    ],
  });

  const newAttestations = await fetchAttestationHistoryWithRetry(accountAddress as `0x${string}`, currentCount + 1);
  return { transactionHash, attestations: newAttestations };
}

/**
 * Fetches the attestation history with retry logic until the expected count is reached.
 */
export async function fetchAttestationHistoryWithRetry(
  address: `0x${string}`,
  expectedCount: number,
  maxRetries = 5
): Promise<Attestation[]> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise<void>((resolve: () => void) => setTimeout(resolve, 3000 * (i + 1)));
    const history = await getAttestations(address);
    Logger.debug('Fetching attestation history', { 
      retry: i + 1, 
      found: history.length, 
      expected: expectedCount 
    });
    if (history.length >= expectedCount) {
      return history;
    }
  }
  throw new Error('Failed to get updated attestation history after multiple retries');
} 

