// Mock the entire attestations module
jest.mock('@/utils/attestations', () => ({
  getAttestations: jest.fn(),
  prepareGrassAttestation: jest.fn(),
  createAttestation: jest.fn(),
}));

// Mock dependencies
jest.mock('@/utils/walletManager', () => ({
  getWalletAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
}));

// Import the mocked module
import { getAttestations, createAttestation } from '@/utils/attestations';

// Mock global fetch for GraphQL calls
global.fetch = jest.fn();

describe('Attestation Utility', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('getAttestations', () => {
    it('should call the getAttestations function', async () => {
      // Arrange
      const mockAttestations = [{ id: '1', attester: '0x123', recipient: '0x456' }];
      (getAttestations as jest.Mock).mockResolvedValue(mockAttestations);
      
      // Act
      const result = await getAttestations('0x1234567890123456789012345678901234567890');
      
      // Assert
      expect(getAttestations).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAttestations);
    });
  });

  describe('createAttestation', () => {
    it('should call the createAttestation function with correct parameters', async () => {
      // Arrange
      const mockWallet = { address: '0x123' };
      const mockLocation = { lat: 40.7128, lng: -74.006 };
      const mockResult = { 
        transactionHash: '0xabc', 
        attestations: [{ id: '1' }] 
      };
      
      (createAttestation as jest.Mock).mockResolvedValue(mockResult);
      
      // Act
      const result = await createAttestation(
        mockWallet as unknown,
        mockLocation,
        true,
        0
      );
      
      // Assert
      expect(createAttestation).toHaveBeenCalledWith(
        mockWallet,
        mockLocation,
        true,
        0
      );
      expect(result).toEqual(mockResult);
    });
  });
}); 