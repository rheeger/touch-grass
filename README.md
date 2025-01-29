# Touch Grass

A Web3 dApp that lets you prove you've touched grass using the Ethereum Attestation Service (EAS) on Base.

## Features

- 🌱 Verify and attest to touching grass using geolocation
- 🗺️ Interactive map interface with park detection
- ⛓️ On-chain attestations using EAS on Base
- 🎨 Modern UI with Tailwind CSS
- 🔒 Secure wallet connection with Privy

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Ethereum Attestation Service (EAS)
- Viem & Wagmi for Web3
- Google Maps API
- Privy for Wallet Connection

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/rheeger/touch-grass.git
   cd touch-grass
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your API keys:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract Details

- EAS Contract (Base): `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587`
- Schema Registry (Base): `0x720c2bA66D19A725143FBf5fDC5b4ADA2742682E`
- Schema: `bool isTouchingGrass, int256 lat, int256 lon`

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
