'use client';

import { useEffect, useState } from 'react';
import { type Attestation, getAttestations } from '@/utils/eas';
import { useAccount } from 'wagmi';

interface AttestationsTableProps {
  onSelectAttestation: (attestation: Attestation) => void;
}

export function AttestationsTable({ onSelectAttestation }: AttestationsTableProps) {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  useEffect(() => {
    async function loadAttestations() {
      try {
        setLoading(true);
        const data = await getAttestations(address);
        setAttestations(data);
      } catch (error) {
        console.error('Failed to load attestations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAttestations();
  }, [address]);

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-600">Loading attestations...</p>
      </div>
    );
  }

  if (attestations.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-600">No attestations found. Touch some grass!</p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Location
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {attestations.map((attestation) => (
            <tr
              key={attestation.id}
              onClick={() => onSelectAttestation(attestation)}
              className="hover:bg-gray-50 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attestation.timestamp.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  attestation.isTouchingGrass
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {attestation.lat.toFixed(6)}, {attestation.lon.toFixed(6)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 