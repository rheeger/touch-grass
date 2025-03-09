# Touch Grass App

## Overview

Touch Grass is a minimalist decentralized application (dApp) designed to encourage users to step outside and connect with nature by "touching grass." Through a series of straightforward flows, the app validates that users are engaging with the outdoors, records their experiences via blockchain attestations using the Ethereum Attestation Service (EAS), and provides a history of these verified events.

## Features & Flows

The app supports several simple but integral flows and features:

### Features

- **ENS Resolution:** Seamlessly resolves and displays Ethereum Name Service (ENS) names for all wallet addresses across the app, enhancing user experience with human-readable names instead of long hexadecimal addresses.
- **Real-time Location Validation:** Uses device geolocation and advanced mapping APIs to verify user presence in outdoor areas.
- **Blockchain Attestations:** Creates immutable records of grass-touching events using EAS.
- **Interactive Map Interface:** Visualizes grass-touching events and locations with an intuitive map interface.
- **Community Features:** Includes global feed, leaderboard, and user profiles to foster community engagement.

### Flows

The app supports several simple but integral flows. Below is a detailed explanation of each:

### 1. Authentication Flow

- **Purpose:** Secure user authentication.
- **How It Works:**
  - The application uses Privy's API for authentication:
    - **Wallet Connection:** Users connect their digital wallet securely through Privy's API.
    - **Email Login:** Alternatively, users can sign in using their email address.
  - Comprehensive error handling is implemented to manage any issues that occur during authentication.

### 2. Location Finding Flow

- **Purpose:** Ensure the user is present in a valid outdoor area.
- **How It Works:**
  - The app first uses the device's geolocation APIs (typically via HTML5 Geolocation) to capture the user's current coordinates.
  - In cases where permissions are not granted or the location is inconclusive, the app provides meaningful error messages and fallback instructions.

### 3. Grass Touching Algorithm Flow

- **Purpose:** Validate the physical act of touching grass.
- **How It Works:**
  - Once the location data is confirmed, the app employs a dedicated algorithm (implemented in src/utils/places.ts) to validate that the user is truly engaging with a green space.
  - The algorithm queries the Google Places API for nearby parks, golf courses, and campgrounds, then assesses whether the user's coordinates fall within a recognized park's viewport or are within 30 meters of a landmark.
  - It cross-checks positive signals (such as recognized park names and natural features) against negative indicators (like proximity to urban buildings or establishments) to accurately determine a grass-touch event.
  - Only after these multi-faceted checks pass does the app proceed to trigger the attestation process.

### 4. EAS Attestation Flow

- **Purpose:** Record a verifiable attestation on the blockchain that the user has touched grass.
- **How It Works:**
  - After a verified grass-touch event, the app calls the Ethereum Attestation Service (EAS) API to generate a cryptographically secure record of the action.
  - The attestation is created using Astral Protocol's data schema (Schema ID: 0xA1B2C3D4E5) and publishes on-chain data including:
    • A boolean flag indicating a successful grass-touch event
    • The user's geolocation data (latitude and longitude)
    • Additional contextual details such as the park name or sensor data if available
  - This comprehensive record serves as an immutable proof-of-action for later verification and rewards.
  - Robust logging and try-catch error handling ensure any issues during the blockchain interaction are promptly captured.

### 5. Fetching History Flow

- **Purpose:** Provide users with a history log of their grass-touching attestations.
- **How It Works:**
  - The app queries either a blockchain index or a dedicated backend service to retrieve past attestations.
  - This flow is designed to offer users insights into their outdoor activities with clear, chronological details of each event.
  - Data fetching includes retries and comprehensive error logging to handle communication issues.

### 6. Global Feed Flow

- **Purpose:** Provide a real-time view of grass-touching events from all users worldwide.
- **How It Works:**
  - The feed displays all attestations from the global community in a chronological view.
  - Each attestation in the feed shows:
    • Location data with interactive map markers
    • Timestamp of the grass-touching event
    • Success or failure status with visual indicators
    • Distance from the user's current location
  - Users can filter the feed to show only successful grass-touching events.
  - Clicking on any feed item centers the map on that location and displays detailed information.

### 7. Leaderboard Flow

- **Purpose:** Create friendly competition and showcase the most active grass-touching community members.
- **How It Works:**
  - Ranks users based on their grass-touching frequency and success rate.
  - The leaderboard displays:
    • User wallet addresses (truncated for privacy)
    • Total number of attestations
    • Success rate percentage
    • Recent activity status
  - Users can click on any leaderboard entry to view that user's complete grass-touching history.
  - Includes filters to view rankings by different time periods (all-time, monthly, weekly).
  - Integrates with the map view to visualize selected user's grass-touching locations.

## Installation & Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/yourusername/touch-grass.git
   cd touch-grass
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## Project Structure

The source code is organized as follows:

- **src/app/** - Contains the application entry point and main flow management (routing, state, etc.).
- **src/components/** - Reusable UI components for the app interface.
- **src/utils/** - Utility functions (including location services, algorithm logic, and blockchain interaction helpers).
- **src/types/** - TypeScript definitions and interfaces.
- **src/styles/** - Styling resources for the app.

## Logging & Error Handling

- All critical operations include comprehensive error handling with try-catch blocks.
- Detailed logging is implemented to track application flows and assist in troubleshooting.
- For blockchain interactions and external API calls, errors are logged with contextual details.

## Testing

We use [Jest](https://jestjs.io/) for unit and integration testing. To run tests, execute:

```bash
npm run test
```

Tests are located in the **tests** directory (or follow a *.test.ts naming convention) and are designed to cover all critical flows, including login, location finding, grass-touching validation, and attestation processing.

## Useful Links and Documentation

- [Privy API Documentation](https://docs.privy.id)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Ethereum Attestation Service Documentation](https://ethereum-attestation-service.gitbook.io/)
- [Astral Protocol Documentation](https://docs.astralprotocol.com/)

## Contributing

Contributions are welcome! Please ensure that any new features or bug fixes align with the existing code style and best practices outlined in the project guidelines. Ensure to include appropriate tests and documentation for any changes.

# Google Cloud SQL MCP Configuration

This MCP (Multi-Cloud Platform) configuration allows you to connect to a Google Cloud SQL instance using the Cloud SQL Auth Proxy.

## Prerequisites

1. You must be authenticated with Google Cloud (`gcloud auth login`)
2. You need the appropriate permissions to access the Cloud SQL instance
3. Your `.zshrc` file should contain the DB_CREDENTIALS environment variable with the following structure:
   ```json
   {
     "DB_USER": "your-db-user",
     "DB_PASSWORD": "your-db-password",
     "DB_HOST": "localhost",
     "DB_PORT": "5432",
     "DB_NAME": "your-db-name"
   }
   ```

## Configuration

The MCP configuration consists of two servers:

1. `cloudsql-proxy`: Runs the Cloud SQL Auth Proxy to establish a secure connection to your Cloud SQL instance
2. `cloudsql-client`: Connects to the database using the credentials from your `.zshrc` file

## Usage

1. Edit the `cloud-sql-mcp.json` file and replace `YOUR_INSTANCE_NAME` with the name of your Google Cloud SQL instance.
2. Run the MCP configuration:
   ```
   mcp cloud-sql-mcp.json
   ```

## Troubleshooting

If you encounter a "Client Closed" error:

1. Make sure you're authenticated with Google Cloud (`gcloud auth login`)
2. Verify that your instance name is correct
3. Check that you have the necessary permissions to access the Cloud SQL instance
4. Ensure your DB_CREDENTIALS in `.zshrc` are correct
5. Try increasing the sleep time in the `cloudsql-client` configuration (currently set to 5 seconds) to give the proxy more time to establish a connection

## How It Works

1. The `cloudsql-proxy` server:
   - Sources your `.zshrc` file to get environment variables
   - Gets the connection name of your Cloud SQL instance
   - Runs the Cloud SQL Auth Proxy in a Docker container
   - Maps port 5432 on your local machine to the proxy

2. The `cloudsql-client` server:
   - Sources your `.zshrc` file to get the DB_CREDENTIALS
   - Waits for the proxy to start (5 seconds)
   - Extracts the database credentials from the DB_CREDENTIALS environment variable
   - Runs a PostgreSQL client in a Docker container to connect to the database through the proxy
