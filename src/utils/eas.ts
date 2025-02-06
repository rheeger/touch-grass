import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { base } from "viem/chains";
import { Interface } from "@ethersproject/abi";
import type { UnsignedTransactionRequest } from "@privy-io/react-auth";

// Base Mainnet EAS Contract: https://base.easscan.org/
const EAS_CONTRACT_ADDRESS =
  "0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587" as const;
const EAS_GRAPHQL_API = "https://base.easscan.org/graphql" as const;

// EAS ABI for the attest function
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

// Create interface for encoding
const easInterface = new Interface(EAS_ABI);

// Schema definition
const SCHEMA_UID =
  "0xba4171c92572b1e4f241d044c32cdf083be9fd946b8766977558ca6378c824e2" as const;
const SCHEMA_RAW =
  "uint256 eventTimestamp,string srs,string locationType,string location,string[] recipeType,bytes[] recipePayload,string[] mediaType,string[] mediaData,string memo" as const;

// Media type for touch grass attestations
const TOUCH_GRASS_MEDIA_TYPE = "rheeger/touch-grass-v0.1" as const;

// Zero hash for refUID
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

// Convert location to GeoJSON format
function toGeoJSON(lon: number, lat: number): string {
  return JSON.stringify({
    type: "Point",
    coordinates: [lon, lat],
  });
}

// Extract coordinates from GeoJSON
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

// Create media data for touch grass attestation
function createTouchGrassMediaData(isTouchingGrass: boolean): string {
  return JSON.stringify({
    isTouchingGrass,
    version: "0.1",
  });
}

// Extract touch grass status from media data
function extractTouchGrassStatus(mediaData: string): boolean {
  try {
    const data = JSON.parse(mediaData);
    return !!data.isTouchingGrass;
  } catch (error) {
    console.error("Failed to parse touch grass media data:", error);
    return false;
  }
}

// Decode attestation data
function decodeAttestationData(encodedData: string): {
  isTouchingGrass: boolean;
  lat: number;
  lon: number;
} {
  const schemaEncoder = new SchemaEncoder(SCHEMA_RAW);
  const decodedData = schemaEncoder.decodeData(encodedData);

  // Find the location and media data in the decoded array
  const location = decodedData.find((field) => field.name === "location")?.value
    .value as string;
  const mediaData = decodedData.find((field) => field.name === "mediaData")
    ?.value.value as string[];

  if (!location || !mediaData?.length) {
    throw new Error("Missing required fields in attestation data");
  }

  // Extract coordinates from GeoJSON
  const coordinates = fromGeoJSON(location);

  // Extract touch grass status from media data
  // We assume the first media data entry is the touch grass status
  const isTouchingGrass = extractTouchGrassStatus(mediaData[0]);

  return {
    isTouchingGrass,
    lat: coordinates.lat,
    lon: coordinates.lon,
  };
}

// Initialize schema UID by checking for existing schema
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
      body: JSON.stringify({
        query: schemaQuery,
      }),
    });

    const json = await response.json();
    console.log("Schema search response:", json);

    if (!json.data?.schemata?.length) {
      throw new Error(
        "Schema not found. Please ensure you're using the correct schema UID."
      );
    }
  } catch (error) {
    console.error("Failed to verify schema:", error);
    throw error;
  }
}

// Call initialization on module load
initializeSchemaUID().catch(console.error);

export async function getAttestations(
  address?: `0x${string}`
): Promise<Attestation[]> {
  try {
    // If schema UID is not initialized, try to initialize it
    if (!SCHEMA_UID) {
      await initializeSchemaUID();
      // If still no schema UID after initialization, return empty array
      if (!SCHEMA_UID) {
        console.log(
          "No schema found. Create an attestation to register the schema."
        );
        return [];
      }
    }

    // Build the where clause
    const whereClause = {
      schemaId: {
        equals: SCHEMA_UID
      },
      revoked: false,
      OR: [
        { attester: { equals: address?.toLowerCase() } },
        { recipient: { equals: address?.toLowerCase() } }
      ]
    };

    const variables = {
      where: whereClause,
    };

    // GraphQL query for attestations
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

    console.log("Fetching attestations with:", {
      endpoint: EAS_GRAPHQL_API,
      variables,
      address,
      schemaId: SCHEMA_UID,
      whereClause,
    });

    const response = await fetch(EAS_GRAPHQL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const json = await response.json();
    console.log("Raw attestation response:", json);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (json.errors) {
      console.error("GraphQL errors:", json.errors);
      throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
    }

    if (!json.data?.attestations) {
      console.warn("No attestations found in response:", json);
      return [];
    }

    // Process and decode the attestations
    const attestations = json.data.attestations.map(
      (attestation: GraphQLAttestation) => {
        const decodedData = decodeAttestationData(attestation.data);

        return {
          id: attestation.id as `0x${string}`,
          attester: attestation.attester as `0x${string}`,
          recipient: attestation.recipient as `0x${string}`,
          timestamp: new Date(Number(attestation.time) * 1000),
          ...decodedData,
          txHash: attestation.txid as `0x${string}`,
        };
      }
    );

    return attestations;
  } catch (error) {
    console.error("Failed to fetch attestations:", error);
    throw error;
  }
}

export function prepareGrassAttestation(
  walletAddress: string,
  lat: number,
  lon: number,
  isTouchingGrass: boolean
): UnsignedTransactionRequest {
  // Initialize SchemaEncoder with the schema string
  const schemaEncoder = new SchemaEncoder(SCHEMA_RAW);

  // Create the location GeoJSON
  const locationGeoJSON = toGeoJSON(lon, lat);

  // Create the touch grass media data
  const touchGrassData = createTouchGrassMediaData(isTouchingGrass);

  // Current timestamp in seconds
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

  // Create the attestation data
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

  // Encode the function call
  const encodedFunction = easInterface.encodeFunctionData("attest", [attestationRequest]);

  // Return the unsigned transaction request
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
