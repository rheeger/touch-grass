import { graphql, rest } from 'msw';
import { RequestHandler } from 'msw';

// Mock EAS GraphQL API
export const handlers: RequestHandler[] = [
  // Get attestations query
  graphql.query('GetAttestations', (req, res, ctx) => {
    return res(
      ctx.data({
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
      })
    );
  }),

  // Mock Google Places API
  rest.get('https://maps.googleapis.com/maps/api/place/*', (req, res, ctx) => {
    return res(
      ctx.json({
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
    );
  }),

  // Mock Privy API
  rest.post('https://auth.privy.io/api/*', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          userId: 'test-user-id',
          email: 'test@example.com',
        },
      })
    );
  }),
];

describe('MSW handlers', () => {
  it('should have defined handlers', () => {
    expect(handlers).toBeDefined();
    expect(handlers.length).toBeGreaterThan(0);
  });
}); 