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
   NEXT_PUBLIC_EAS_CONTRACT_ADDRESS=your_eas_contract_address
   NEXT_PUBLIC_RPC_URL=your_rpc_url
   NEXT_PUBLIC_APP_ENV=local
   ```

   Environment variables:
   - `NEXT_PUBLIC_APP_ENV`: Set to 'local' for development (allows map pin movement) or 'production' for production (restricts to current location only)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `NEXT_PUBLIC_PRIVY_APP_ID`: Your Privy App ID for wallet connection
   - `NEXT_PUBLIC_EAS_CONTRACT_ADDRESS`: The EAS contract address on Base
   - `NEXT_PUBLIC_RPC_URL`: Your RPC URL for connecting to Base network

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Smart Contract Details

- EAS Contract (Base): `0x4200000000000000000000000000000000000021`
- Schema Registry (Base): `0x4200000000000000000000000000000000000020`
- Schema: `bool isTouchingGrass, int256 lat, int256 lon`

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
