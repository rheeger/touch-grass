# Comprehensive Testing Framework Plan for Touch Grass

## 1. Testing Philosophy and Principles

### Core Testing Principles

1. **Test Pyramid Approach**

   - **Base Layer (Unit Tests)**: Focus on testing individual functions in isolation, particularly the core utilities for attestations, grass detection, location services, and wallet management.
   - **Middle Layer (Integration Tests)**: Test interactions between components, API services, and utility functions.
   - **Top Layer (E2E Tests)**: Test complete user flows from authentication through attestation creation.

2. **Test-Driven Development (TDD) for Critical Flows**

   - Implement TDD for high-risk or complex functions like grass detection algorithms and blockchain interactions.
   - Write tests first for new features to ensure requirements are met and regressions are prevented.

3. **Behavior-Driven Development (BDD) for User Flows**

   - Use BDD principles for end-to-end tests that model real user behaviors.
   - Structure tests as "Given-When-Then" scenarios to improve readability and coverage of user stories.

4. **Shift-Left Testing**

   - Integrate testing early in the development lifecycle to catch issues sooner.
   - Automate tests in CI/CD to provide immediate feedback to developers.

5. **Component Isolation**
   - Test React components in isolation using shallow rendering when appropriate.
   - Use mocks for external services like Google Maps and blockchain providers.

### Rationale for Touch Grass Project

This approach is particularly suitable for Touch Grass because:

1. The application relies on external services (geolocation, Google Places API, blockchain) that benefit from comprehensive mocking.
2. Critical user flows depend on real-time interactions that must be tested reliably.
3. The blockchain attestation process requires careful validation to ensure data integrity.
4. Geospatial functionality needs robust testing with simulated locations to verify algorithm accuracy.
5. The application's decentralized nature demands thorough testing of wallet connections and transaction flows.

## 2. Test Types and Coverage Strategy

### Unit Tests (70-80% coverage)

**Focus Areas:**

- **Utility Functions**: All functions in `/src/utils/` should be covered, with emphasis on:
  - `attestations.ts`: Functions for creating, decoding, and fetching attestations
  - `grassDetection.ts`: Algorithm for determining if a user is touching grass
  - `places.ts`: Functions that interact with the Google Places API
  - `location.ts`: Geolocation utilities
  - `walletManager.ts`: Wallet connection and management

**Coverage Goals:**

- 100% coverage for critical functions like attestation creation and grass detection
- 80% coverage for helper functions and utility code
- Test all edge cases and error handling

### Integration Tests (50-60% coverage)

**Focus Areas:**

- **Component Interactions**: Test how components work together with their hooks and state
- **API Service Integration**: Test integration with Google Maps, Ethereum Attestation Service
- **State Management**: Test global state updates and side effects

**Coverage Goals:**

- Test all API service interfaces completely
- Cover critical user flows like attestation creation and location validation
- Test all major state transitions and data flow between components

### End-to-End Tests (Critical user flows)

**Focus Areas:**

- **Authentication Flow**: Testing wallet connection and authentication
- **Location Finding Flow**: Testing geolocation detection and validation
- **Grass Detection Flow**: Testing the full algorithm with different simulated locations
- **Attestation Creation Flow**: Testing the complete attestation process
- **History Fetching Flow**: Testing retrieval and display of past attestations

**Coverage Goals:**

- Cover all major user journeys from start to finish
- Ensure key features work across supported browsers
- Test mobile responsiveness for key flows

### Visual Regression Tests

**Focus Areas:**

- Map visualization
- UI components under different states (loading, success, error)
- Responsive design at various breakpoints

**Coverage Goals:**

- Test all critical UI components for visual regressions
- Ensure consistent rendering across browsers

### Performance Testing

**Focus Areas:**

- Map rendering with multiple markers
- Attestation fetching and rendering for large datasets
- Initial page load time

**Coverage Goals:**

- Ensure maps load within 2 seconds
- Verify smooth scrolling performance for the global feed with 100+ attestations
- Validate that blockchain interactions don't block the UI

## 3. Testing Tools and Libraries

### Unit and Integration Testing

1. **Jest** (already configured)

   - Core testing framework for running unit and integration tests
   - For running snapshot tests of React components

2. **React Testing Library**

   - For testing React components in a user-centric way
   - Enables testing of component behavior rather than implementation details

3. **MSW (Mock Service Worker)**

   - For mocking backend API responses
   - Particularly useful for GraphQL API interactions with EAS

4. **jest-google-maps-mock** (already included in dependencies)

   - For mocking Google Maps APIs in tests

5. **@testing-library/user-event**
   - For simulating user interactions in a more realistic way than fireEvent

### End-to-End Testing

1. **Playwright** (already configured)
   - For comprehensive browser testing
   - Supports testing across multiple browsers (Chrome, Firefox, Safari)
   - Better suited for modern web applications than alternatives

### Visual Regression Testing

1. **Playwright's screenshot functionality**

   - Integrated with existing E2E tests to capture screenshots
   - Compare screenshots to detect visual regressions

2. **Percy** (recommended addition)
   - For more advanced visual regression testing
   - Cloud-based service that integrates with CI/CD

### Performance Testing

1. **Lighthouse CI**

   - For measuring and monitoring web performance metrics
   - Integration with CI to prevent performance regressions

2. **React Profiler**
   - For measuring component render performance
   - Identifying components that cause re-renders or performance bottlenecks

### Specialized Tools for Web3 Testing

1. **Hardhat** (recommended addition)

   - For testing smart contract interactions locally
   - Setting up local blockchain environments

2. **eth-testing** (recommended addition)
   - For mocking Ethereum provider behavior
   - Simulating wallet interactions and transactions

## 4. Test Organization and Structure

### Folder Structure

```
__tests__/
├── unit/
│   ├── utils/
│   │   ├── attestations.test.ts
│   │   ├── grassDetection.test.ts
│   │   ├── location.test.ts
│   │   ├── places.test.ts
│   │   └── walletManager.test.ts
│   ├── hooks/
│   │   ├── useLocation.test.ts
│   │   ├── useWallet.test.ts
│   │   └── useAttestations.test.ts
│   └── components/
│       ├── MapComponent.test.tsx
│       ├── FeedCard.test.tsx
│       └── StatusCards.test.tsx
├── integration/
│   ├── flows/
│   │   ├── attestation-flow.test.ts
│   │   ├── location-flow.test.ts
│   │   └── wallet-connection-flow.test.ts
│   └── api/
│       ├── eas-service.test.ts
│       ├── google-maps-service.test.ts
│       └── privy-auth-service.test.ts
├── e2e/
│   ├── authentication.spec.ts
│   ├── grass-detection.spec.ts
│   ├── attestation-creation.spec.ts
│   └── global-feed.spec.ts
├── visual/
│   ├── map-visualization.spec.ts
│   ├── feed-cards.spec.ts
│   └── responsive-design.spec.ts
├── performance/
│   ├── map-rendering.spec.ts
│   ├── feed-scrolling.spec.ts
│   └── attestation-loading.spec.ts
├── fixtures/
│   ├── locations.json
│   ├── attestations.json
│   └── map-responses.json
├── mocks/
│   ├── google-maps.ts
│   ├── eas-service.ts
│   ├── privy-auth.ts
│   └── geolocation.ts
└── setup/
    ├── jest.setup.ts (existing)
    ├── test-utils.tsx (to be created)
    └── test-providers.tsx (to be created)
```

### Naming Conventions

1. **Unit Tests**

   - Filename: `[original-filename].test.ts(x)`
   - Test suites: `describe('UtilityName')` or `describe('ComponentName')`
   - Test cases: `it('should perform specific action when condition')`

2. **Integration Tests**

   - Filename: `[integration-point].test.ts(x)`
   - Test suites: `describe('Integration: Feature')`
   - Test cases: `it('should successfully integrate component A with service B')`

3. **E2E Tests**

   - Filename: `[user-flow].spec.ts`
   - Test cases: `test('User can complete attestation flow from start to finish')`

4. **Test Data Files**
   - Prefer `.json` files in the `fixtures` directory for reusable test data
   - Name based on domain: `locations.json`, `attestations.json`

## 5. Mocking and Test Data Strategies

### External Service Mocking

1. **Google Maps and Places API**

   - Use `jest-google-maps-mock` for unit tests
   - For integration tests, use MSW to intercept and mock HTTP requests
   - Create fixtures with real-world responses for different location scenarios

2. **Blockchain Services**

   - Mock Ethereum provider for wallet connections
   - Create mock attestation service responses for EAS interactions
   - Simulate transaction responses for testing UI feedback

3. **Geolocation API**
   - Mock `navigator.geolocation` for controlled location testing
   - Create fixtures for various location scenarios (in a park, in a building, etc.)

### Test Data Management

1. **Fixtures**

   - Create comprehensive fixtures for:
     - Geolocation data (various scenarios like parks, urban areas)
     - Google Places API responses
     - Attestation data in different states
     - Wallet connection states

2. **Factory Functions**

   - Implement factory functions to generate test data dynamically
   - Example: `createMockAttestation({ override properties })`

3. **Test Environments**
   - Create separate test environments for different test types:
     - Unit tests: Pure JavaScript environment
     - Integration tests: JSDOM with service mocks
     - E2E tests: Real browser environment with mock API responses

### Database and Persistence Mocking

1. **Local Storage**

   - Mock browser localStorage for testing persistence
   - Create helper functions to simulate data persistence

2. **IndexedDB** (if used)
   - Use fake-indexeddb package for simulating browser database
   - Pre-populate with test data for specific scenarios

## 6. Test Implementation Patterns

### Unit Test Pattern

```typescript
import { createAttestation } from "@/utils/attestations";
import { mockActiveWallet } from "../../mocks/wallet";

describe("Attestation Utility", () => {
  beforeEach(() => {
    // Setup mocks and reset state
    jest.clearAllMocks();
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            /* mock response */
          }),
      })
    ) as jest.Mock;
  });

  it("should create a valid attestation when given correct parameters", async () => {
    // Arrange
    const wallet = mockActiveWallet();
    const location = { lat: 40.7128, lng: -74.006 };
    const isTouchingGrass = true;
    const currentCount = 0;

    // Act
    const result = await createAttestation(
      wallet,
      location,
      isTouchingGrass,
      currentCount
    );

    // Assert
    expect(result).toHaveProperty("transactionHash");
    expect(result.attestations.length).toBeGreaterThan(0);
    expect(result.attestations[0].isTouchingGrass).toBe(true);
  });

  it("should handle errors when attestation creation fails", async () => {
    // Arrange
    const wallet = mockActiveWallet();
    const location = { lat: 40.7128, lng: -74.006 };
    const isTouchingGrass = true;
    const currentCount = 0;

    // Mock a failure
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error"))
    ) as jest.Mock;

    // Act & Assert
    await expect(
      createAttestation(wallet, location, isTouchingGrass, currentCount)
    ).rejects.toThrow();
  });
});
```

### React Component Test Pattern

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MapComponent from "@/components/MapComponent";
import { TestWrapper } from "../../setup/test-utils";
import { mockGoogleMapsInstance } from "../../mocks/google-maps";

describe("MapComponent", () => {
  beforeEach(() => {
    // Set up Google Maps mock
    mockGoogleMapsInstance();
  });

  it("should render a map with the user location marker", async () => {
    // Arrange
    const userLocation = { lat: 40.7128, lng: -74.006 };

    // Act
    render(
      <TestWrapper initialState={{ location: userLocation }}>
        <MapComponent />
      </TestWrapper>
    );

    // Assert
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByAltText("Your location")).toBeInTheDocument();
    });
  });

  it("should allow users to click on the map to place a marker", async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    render(
      <TestWrapper>
        <MapComponent />
      </TestWrapper>
    );

    const mapElement = screen.getByTestId("map-container");
    await user.click(mapElement);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Selected Location")).toBeInTheDocument();
    });
  });
});
```

### Integration Test Pattern

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { rest } from "msw";
import { TestWrapper } from "../../setup/test-utils";
import { LocationPage } from "@/app/location/page";
import { mockGeolocation } from "../../mocks/geolocation";

// Setup MSW server
const server = setupServer(
  rest.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    (req, res, ctx) => {
      return res(
        ctx.json({
          results: [
            {
              place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
              name: "Central Park",
              types: ["park", "tourist_attraction", "point_of_interest"],
              geometry: {
                location: { lat: 40.7829, lng: -73.9654 },
                viewport: {
                  northeast: { lat: 40.8024, lng: -73.949 },
                  southwest: { lat: 40.7642, lng: -73.981 },
                },
              },
            },
          ],
        })
      );
    }
  )
);

describe("Location Finding Flow", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mockGeolocation();
  });

  it("should detect a park location and enable the Touch Grass button", async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    render(
      <TestWrapper>
        <LocationPage />
      </TestWrapper>
    );

    // Simulate getting location
    await user.click(screen.getByText("Get My Location"));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("You are in a park!")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Touch Grass" })).toBeEnabled();
    });
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from "@playwright/test";

test("Complete attestation flow", async ({ page }) => {
  // 1. Visit the homepage
  await page.goto("/");

  // 2. Connect wallet (mock wallet connection)
  await page.evaluate(() => {
    window.localStorage.setItem("wallet-connected", "true");
    window.localStorage.setItem("wallet-address", "0x123456789abcdef");
  });
  await page.reload();

  // 3. Navigate to location page
  await page.click("text=Find Location");

  // 4. Mock geolocation
  await page.evaluate(() => {
    const mockPosition = {
      coords: {
        latitude: 40.7829,
        longitude: -73.9654,
        accuracy: 10,
      },
    };
    navigator.geolocation.getCurrentPosition = (success) => {
      success(mockPosition);
    };
  });

  // 5. Get location
  await page.click("text=Get My Location");

  // 6. Wait for grass detection to complete
  await expect(page.locator("text=You are in a park!")).toBeVisible({
    timeout: 10000,
  });

  // 7. Touch grass
  await page.click("text=Touch Grass");

  // 8. Mock transaction response
  await page.evaluate(() => {
    window.postMessage(
      {
        type: "transaction-success",
        hash: "0xabcdef1234567890",
      },
      "*"
    );
  });

  // 9. Verify success message
  await expect(
    page.locator("text=Attestation Created Successfully!")
  ).toBeVisible();

  // 10. Navigate to history page
  await page.click("text=My History");

  // 11. Verify the new attestation appears
  await expect(page.locator("text=Central Park")).toBeVisible();
});
```

## 7. CI/CD Integration

### CI Pipeline Configuration

1. **GitHub Actions Workflow**

```yaml
name: Touch Grass CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test
      - name: Upload coverage report
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage/

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test -- --testPathPattern=__tests__/integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    needs: e2e-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Build project
        run: npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true
          urls: |
            http://localhost:3000/
            http://localhost:3000/location
            http://localhost:3000/history
```

### Test Parallelization Strategy

1. **Unit Tests**

   - Run in parallel using Jest's `--maxWorkers` option
   - Group tests by domain (utils, components, hooks) for efficient parallelization

2. **Integration Tests**

   - Run tests in logical groups based on API dependencies
   - Parallelize by feature area

3. **E2E Tests**
   - Use Playwright's built-in parallelization
   - Run on multiple browsers simultaneously
   - Shard tests by feature area

### Reporting Strategy

1. **Test Results Dashboard**

   - Integrate with GitHub Actions summary view
   - Generate HTML reports for detailed test results

2. **Coverage Reports**

   - Generate and publish coverage reports to identify testing gaps
   - Set up coverage thresholds to maintain quality

3. **Visual Comparison Reports**

   - Use Percy dashboard or similar to visualize UI changes
   - Integrate visual test results into PR reviews

4. **Performance Metrics**
   - Track performance metrics over time with Lighthouse CI
   - Alert on performance regressions

## 8. Test Maintenance Plan

### Dealing with Flaky Tests

1. **Identification**

   - Tag known flaky tests with `@flaky` annotation
   - Set up automatic retries for flaky tests
   - Monitor test reliability in CI dashboard

2. **Remediation**

   - Regular reviews of flaky tests
   - Improve test isolation and determinism
   - Add logging to help diagnose intermittent issues

3. **Prevention**
   - Implement waitFor patterns consistently
   - Avoid timing-dependent tests
   - Use stable selectors for UI elements

### Test Refactoring

1. **Regular Audit**

   - Quarterly review of test suite performance
   - Identify slow or redundant tests
   - Update tests to match current best practices

2. **Refactoring Process**
   - Update tests when component interfaces change
   - Maintain backward compatibility in test utilities
   - Document test patterns and anti-patterns

### Documentation

1. **Test Documentation**

   - Maintain a testing guide with examples
   - Document mocking strategies and test data
   - Keep a catalog of test utilities and helpers

2. **Knowledge Sharing**
   - Regular testing workshops
   - Code reviews focusing on test quality
   - Document lessons learned from flaky or ineffective tests

## 9. Metrics and Quality Gates

### Key Metrics

1. **Code Coverage**

   - **Unit test coverage**: 70-80% minimum
   - **Integration test coverage**: 50-60% minimum
   - **Critical path coverage**: 90% minimum

2. **Test Reliability**

   - Flaky test rate < 2%
   - Test success rate > 98%

3. **Test Performance**

   - Unit test suite execution < 2 minutes
   - Full CI pipeline execution < 15 minutes

4. **Defect Metrics**
   - Defect escape rate (bugs found in production vs. testing)
   - Percentage of bugs with tests added after fix

### Quality Gates

1. **PR Checks**

   - All tests must pass
   - Code coverage cannot decrease
   - No new flaky tests introduced
   - TypeScript type checking must pass

2. **Release Quality Gates**

   - E2E tests must pass on all supported browsers
   - Visual regression tests must pass
   - Performance metrics must meet thresholds
   - Accessibility tests must pass

3. **Monitoring Gates**
   - Error rates must not increase post-deployment
   - Performance metrics must not degrade
   - User-reported issues must not spike

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

1. **Test Environment Setup**

   - Finalize Jest configuration
   - Set up MSW for API mocking
   - Create test utilities and providers

2. **Critical Unit Tests**

   - Implement tests for core utility functions:
     - Attestation creation and parsing
     - Grass detection algorithm
     - Location services
     - Wallet management

3. **Test CI Integration**
   - Set up GitHub Actions workflow
   - Configure test reporting
   - Establish initial quality gates

### Phase 2: Component Testing (Weeks 3-4)

1. **React Component Tests**

   - Test core UI components:
     - MapComponent
     - StatusCards
     - FeedCard
     - LeaderboardCard

2. **Hook Tests**

   - Test custom hooks:
     - Location hooks
     - Wallet connection hooks
     - Attestation hooks

3. **Snapshot Tests**
   - Implement snapshot tests for stable UI components
   - Set up visual regression workflow

### Phase 3: Integration Testing (Weeks 5-6)

1. **API Integration Tests**

   - Test integration with EAS
   - Test integration with Google Maps/Places
   - Test integration with wallet providers

2. **Flow Integration Tests**

   - Test attestation flow from end to end
   - Test location finding and validation flow
   - Test history retrieval and display

3. **Mock Refinement**
   - Improve mock fidelity based on real API responses
   - Create comprehensive fixtures for testing

### Phase 4: E2E and Performance Testing (Weeks 7-8)

1. **E2E Test Implementation**

   - Implement critical user journey tests
   - Test cross-browser compatibility
   - Test responsiveness on different device sizes

2. **Performance Testing**

   - Implement performance tests for map rendering
   - Test attestation loading performance
   - Set up Lighthouse CI for performance monitoring

3. **Test Coverage Analysis**
   - Identify and fill testing gaps
   - Prioritize remaining test implementation

### Phase 5: Refinement and Documentation (Weeks 9-10)

1. **Test Refactoring**

   - Address any flaky or slow tests
   - Improve test organization and naming
   - Enhance test utilities based on usage patterns

2. **Documentation**

   - Document testing patterns and best practices
   - Create onboarding guide for new developers
   - Document test data and mock strategies

3. **Automation Improvements**
   - Implement automated test selection for faster PRs
   - Set up scheduled full test runs
   - Integrate test metrics with project dashboards

## Conclusion

This comprehensive testing framework provides a solid foundation for ensuring the quality and reliability of the Touch Grass application. By implementing this framework, the team will benefit from:

1. **Confident Deployments**: Thorough testing across all layers minimizes the risk of production issues.
2. **Faster Development**: Well-designed tests provide rapid feedback during development.
3. **Maintainable Codebase**: Test coverage ensures that refactoring can be done with confidence.
4. **Better Collaboration**: Clear test patterns and organization improve team understanding.
5. **User Satisfaction**: Comprehensive testing of critical user flows ensures a smooth user experience.

The implementation roadmap provides a practical, phased approach to building this testing framework, prioritizing the most critical aspects of the application while gradually expanding test coverage across the entire codebase.
