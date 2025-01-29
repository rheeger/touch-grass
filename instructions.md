# Touch Grass

A simple, PWA mobile website to attest that you've touched grass using geolocation, satellite imagery and the Ethereum Attestation Service.

## How it works

1. The user opens the website and grants permission to use their geolocation.
2. The website uses the geolocation to get the user's current location.
3. The location is used to display the users location with satellite imagery API and to get a map of the area.
4. Using the current location and the satellite imagery, the website can determine if the user has touched grass. It will say "You are touching grass" or "You are not touching grass". 
5. The website then uses the Ethereum Attestation Service to create an attestation for the user's location.
6. The website displays the attestation to the user and a history of past grass touches with the satellite image with a pin on where the user touched grass.

## Tech Stack

Should use only blockchain data for any storage of state. Include a simple, well-designed, very sleek and minimalistic frontend to display the data:

Frontend:

- Next.js
- Tailwind CSS
- React
- TypeScript
- Vercel
- Ethereum Attestation Service
- Google Maps API
- Google Satellite Imagery API
- Privvy Auth
