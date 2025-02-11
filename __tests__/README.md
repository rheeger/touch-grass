# Touch Grass Testing Framework

## Overview

This document outlines the testing strategy for the Touch Grass application. We aim for 100% test coverage across the codebase using a combination of unit tests, integration tests, and end-to-end (E2E) tests.

## Testing Structure

```markdown
**tests**/
├── unit/
│ ├── utils/
│ │ ├── eas.test.ts
│ │ ├── paymaster.test.ts
│ │ └── places.test.ts
│ └── components/
│ ├── StatusCards.test.tsx
│ └── AttestationsTable.test.tsx
├── integration/
│ ├── attestation-flow.test.ts
│ ├── location-detection.test.ts
│ └── wallet-integration.test.ts
├── e2e/
│ └── user-journey.test.ts
├── mocks/
│ ├── google-maps.ts
│ ├── privy-auth.ts
│ └── viem.ts
└── setup/
├── jest.setup.ts
└── test-utils.tsx
```

## Testing Tools & Libraries

- **Jest**: Primary test runner and assertion library
- **React Testing Library**: For component testing
- **MSW (Mock Service Worker)**: For API mocking
- **jest-environment-jsdom**: For DOM simulation
- **@testing-library/jest-dom**: For additional DOM assertions
- **@testing-library/user-event**: For simulating user interactions
- **jest-google-maps-mock**: For mocking Google Maps API
- **@vitest/coverage-c8**: For code coverage reporting

## Test Types

### Unit Tests

- Located in `__tests__/unit/`
- Test individual functions and components in isolation
- Mock all external dependencies
- Focus on business logic and component behavior
- Naming convention: `*.test.ts` or `*.test.tsx`

### Integration Tests

- Located in `__tests__/integration/`
- Test interactions between multiple components/functions
- Partial mocking of external services
- Focus on data flow and component integration
- Naming convention: `*.test.ts`

### E2E Tests

- Located in `__tests__/e2e/`
- Test complete user journeys
- Minimal mocking, use test environments where possible
- Focus on user flows and real-world scenarios
- Naming convention: `*.test.ts`

## Coverage Requirements

We aim for the following coverage metrics:

- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

## Components and Functions to Test

### Utils

#### EAS (Ethereum Attestation Service) - `src/utils/eas.ts`

| Function                  | Purpose                                     | Test Requirements                                                                                                                  |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `prepareGrassAttestation` | Creates attestation data for grass touching | - Verify correct schema ID usage<br>- Validate data encoding<br>- Test with various location inputs<br>- Verify transaction format |
| `getAttestations`         | Retrieves attestation history               | - Test pagination<br>- Verify data parsing<br>- Test error handling<br>- Mock GraphQL responses                                    |

#### Paymaster - `src/utils/paymaster.ts`

| Function                     | Purpose                               | Test Requirements                                                                                               |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `createSmartAccountForEmail` | Creates smart account for email login | - Test account creation<br>- Verify wallet initialization<br>- Test error handling<br>- Mock provider responses |
| `sendSponsoredTransaction`   | Handles sponsored transactions        | - Test transaction signing<br>- Verify gas estimation<br>- Test error handling<br>- Mock blockchain responses   |

#### Places - `src/utils/places.ts`

| Function            | Purpose                               | Test Requirements                                                                                                              |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `analyzePlacesData` | Analyzes location for grass detection | - Test various location types<br>- Verify confidence calculation<br>- Test place type detection<br>- Mock Places API responses |

### Components

#### StatusCards - `src/components/StatusCards.tsx`

| Component/Feature | Purpose                       | Test Requirements                                                                                          |
| ----------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Status Display    | Shows grass detection status  | - Test all status states<br>- Verify loading states<br>- Test error states<br>- Verify UI updates          |
| Wallet Connection | Handles wallet connectivity   | - Test connection flow<br>- Verify disconnect behavior<br>- Test error handling<br>- Mock wallet responses |
| Manual Override   | Allows manual status override | - Test override functionality<br>- Verify state updates<br>- Test UI feedback                              |

#### AttestationsTable - `src/components/AttestationsTable.tsx`

| Component/Feature     | Purpose                       | Test Requirements                                                                                   |
| --------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| History Display       | Shows attestation history     | - Test data rendering<br>- Verify sorting/filtering<br>- Test empty states<br>- Test loading states |
| Attestation Selection | Handles attestation selection | - Test selection behavior<br>- Verify callback execution<br>- Test UI feedback                      |

### Pages

#### Main Page - `src/app/page.tsx`

| Feature            | Purpose                      | Test Requirements                                                                  |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| Location Detection | Handles user location        | - Test geolocation flow<br>- Verify manual location<br>- Test error handling       |
| Map Integration    | Displays interactive map     | - Test marker placement<br>- Verify map interactions<br>- Test center calculation  |
| Attestation Flow   | Manages attestation creation | - Test complete flow<br>- Verify wallet integration<br>- Test transaction handling |

## Test Writing Guidelines

### Unit Test Structure

```typescript
describe("Component/Function Name", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it("should [expected behavior]", () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Integration Test Structure

```typescript
describe("Feature Name", () => {
  beforeAll(() => {
    // Global setup
  });

  afterAll(() => {
    // Global cleanup
  });

  it("should [complete scenario]", async () => {
    // Setup
    // Execute flow
    // Verify results
  });
});
```

### E2E Test Structure

```typescript
describe("User Journey", () => {
  beforeAll(() => {
    // Setup test environment
  });

  test("complete user flow", async () => {
    // Setup initial state
    // Execute user actions
    // Verify end state
  });
});
```

## Mock Guidelines

### API Mocks

- Use MSW for API mocking
- Define handlers in `__tests__/mocks`
- Keep mock data in separate files
- Use realistic data structures

### Component Mocks

- Mock child components when testing parents
- Use jest.mock() for external dependencies
- Provide minimal viable props
- Test prop changes and callbacks

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test path/to/test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e
```

## Continuous Integration

Tests are run on:

- Pull request creation
- Push to main branch
- Daily scheduled runs

### CI Pipeline

1. Install dependencies
2. Run linter
3. Run unit tests
4. Run integration tests
5. Run E2E tests
6. Generate coverage report
7. Fail if coverage thresholds not met

## Best Practices

1. **Isolation**: Each test should be independent
2. **Readability**: Use descriptive test names
3. **Maintenance**: Keep tests simple and focused
4. **Reliability**: Avoid flaky tests
5. **Speed**: Optimize test execution time
6. **Coverage**: Test edge cases and error paths
7. **Documentation**: Comment complex test scenarios

## Common Patterns

### Testing Async Operations

```typescript
it("should handle async operations", async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Events

```typescript
it("should handle events", async () => {
  const user = userEvent.setup();
  await user.click(element);
  expect(handleClick).toHaveBeenCalled();
});
```

### Testing Error States

```typescript
it("should handle errors", async () => {
  // Arrange
  mockFunction.mockRejectedValue(new Error("Test error"));

  // Act & Assert
  await expect(async () => {
    await functionUnderTest();
  }).rejects.toThrow("Test error");
});
```
