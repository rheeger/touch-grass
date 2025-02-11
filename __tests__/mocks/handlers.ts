import { http, HttpResponse } from 'msw'
import { graphql } from 'msw'

// Mock EAS GraphQL API
export const handlers = [
  // Get attestations query
  graphql.query('GetAttestations', () => {
    return HttpResponse.json({
      data: {
        attestations: [
          {
            id: 'test-id-1',
            attester: '0x123',
            recipient: '0x456',
            refUID: '0x0',
            revocationTime: 0,
            expirationTime: 0,
            time: '1234567890',
            data: [
              {
                name: 'lat',
                value: { type: 'float', value: '40.7128' },
              },
              {
                name: 'lon',
                value: { type: 'float', value: '-74.0060' },
              },
              {
                name: 'isTouchingGrass',
                value: { type: 'bool', value: 'true' },
              },
            ],
          },
        ],
      }
    })
  }),

  // Mock Google Places API
  http.get('https://maps.googleapis.com/maps/api/place/*', () => {
    return HttpResponse.json({
      results: [
        {
          geometry: {
            location: {
              lat: 40.7128,
              lng: -74.0060,
            },
          },
          types: ['park'],
          name: 'Central Park',
        },
      ],
      status: 'OK',
    })
  }),

  // Mock Privy API
  http.post('https://auth.privy.io/api/*', () => {
    return HttpResponse.json({
      success: true,
      data: {
        userId: 'test-user-id',
        email: 'test@example.com',
      },
    })
  }),
]

// Remove test suite from handlers file as it's not a good practice to have tests here 