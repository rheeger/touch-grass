# Outdoor Detection TDD Workflow

This document outlines our test-driven development (TDD) approach for implementing the Outdoor Space Detection Algorithm improvements.

## TDD Process

For each improvement item, we will follow this process:

1. **Write Tests**: Create or update test cases that verify the expected behavior of the new functionality.
2. **Implement Changes**: Write the code to implement the functionality and make the tests pass.
3. **Refactor**: Clean up the code while ensuring tests continue to pass.
4. **Update Plan**: Check off the completed item in our improvement plan.

## Phase 1 - Enhanced Outdoor Space Boundary Detection

### ✅ Item 1: Implement Precise Boundary Detection

**Status**: Completed ✓

**Implementation Summary**:
- Created `boundaries.ts` with utilities for boundary detection
- Implemented `isPointInBoundary` to check if a point is within a boundary
- Added `extractBoundaryFromPlace` to extract boundaries from Google Places results
- Implemented `distanceFromBoundaryEdge` to calculate the distance from a boundary edge
- Created `analyzePlacesWithBoundaries` with boundary-aware detection
- Added `analyzeOutdoorSpace` for integrated outdoor detection

**Tests Implemented**:
- Unit tests for boundary utilities in `boundaryDetection.test.ts`
- Integration tests for outdoor detection in `outdoorDetection.test.ts`

**Next Steps**:
- Test in real environment with actual Google Places API data
- Monitor performance and accuracy metrics

### ✅ Item 2: Create Outdoor Space Classification

**Status**: Completed ✓

**Implementation Summary**:
- Created `spaceClassification.ts` with utilities for classifying outdoor spaces
- Implemented `OutdoorSpaceCategory` enum with PRIMARY, SECONDARY, EXCLUSION, and UNKNOWN categories
- Added `classifyOutdoorSpace` function to categorize places based on their types
- Implemented `getOutdoorSpaceWeight` to assign confidence weights to different categories
- Integrated classification with the boundary detection in `places.ts`
- Updated `outdoorDetection.ts` to include space category in debug info

**Tests Implemented**:
- Unit tests for space classification in `spaceClassification.test.ts`
- Integration tests for outdoor detection with classification in `outdoorDetection.test.ts`

**Next Steps**:
- Test in real environment with actual Google Places API data
- Monitor classification accuracy and adjust categories as needed
- Implement the next item: "Enhance Indoor/Outdoor Detection"

### 🔄 Item 3: Enhance Indoor/Outdoor Detection

**Status**: In Progress

#### Test Plan

1. Create test cases for detecting buildings within outdoor spaces
2. Test detection of indoor areas within larger outdoor spaces
3. Test intersection detection between outdoor spaces and indoor areas

#### Implementation Steps

1. Implement building footprint detection
2. Create certainty zones around buildings
3. Add intersection detection between outdoor spaces and indoor areas
4. Update the detection logic with enhanced indoor/outdoor detection

#### Success Criteria

- Tests pass for all indoor/outdoor detection scenarios
- Buildings within outdoor spaces are correctly identified
- Certainty zones provide appropriate confidence levels
- Intersection detection correctly identifies overlapping areas

## Testing Utilities

We'll continue to use the testing utilities created for Item 1, and add new mocks as needed:

```typescript
// Example mock for outdoor space types
const mockPrimaryOutdoorSpace = {
  place_id: "mock-primary-1",
  name: "Central Park",
  types: ["park", "natural_feature"],
  geometry: { /* viewport data */ }
};

const mockSecondaryOutdoorSpace = {
  place_id: "mock-secondary-1",
  name: "City Plaza",
  types: ["point_of_interest", "establishment"],
  geometry: { /* viewport data */ }
};
```

## Test Results Tracking

| Item | Test Status | Implementation Status | Notes |
|------|-------------|------------------------|-------|
| Precise Boundary Detection | ✅ Completed | ✅ Completed | Successfully implemented boundary detection using viewport data. All tests are now passing! |
| Outdoor Space Classification | ✅ Completed | ✅ Completed | Successfully implemented space classification and integration with boundary detection. All tests are now passing! |
| Indoor/Outdoor Detection | 🔄 In Progress | Not Started | | 