# Outdoor Space Detection Algorithm Improvement Plan

This document outlines specific changes to enhance the accuracy and reliability of our "touching grass" algorithm while continuing to use Google Places API as our primary data source. The focus is on determining if users are in outdoor spaces, which fulfills the spirit of touching grass.

## Phase 1: Enhanced Outdoor Space Boundary Detection

- [x] **Implement Precise Boundary Detection**
  - [x] Use Google Places API geometry.viewport data to create accurate boundary boxes for outdoor spaces
  - [x] Check if user is precisely within outdoor space boundaries, not just near them
  - [x] Request detailed geometry data when available for more precise footprints
  - [x] Implement polygon containment algorithms to validate if user is inside an outdoor area

- [x] **Create Outdoor Space Classification**
  - [x] Define primary outdoor spaces (parks, natural areas, recreation areas)
  - [x] Define secondary outdoor spaces (plazas, open-air shopping areas, campuses)
  - [x] Define exclusion zones (indoor areas within larger outdoor spaces)
  - [x] Weight scoring based on the type of outdoor space the user is located in

- [ ] **Enhance Indoor/Outdoor Detection**
  - [ ] Use building footprint data to create precise indoor areas
  - [ ] Create certainty zones around buildings (definitely indoor vs. potentially outdoor)
  - [ ] Implement intersection detection between outdoor spaces and indoor areas

## Phase 2: Enhanced Classification Logic

- [ ] **Expand "Outdoor Space" Definition**
  - [ ] Add more place types to outdoor spaces list (parks, plazas, beaches, trails, sports fields, etc.)
  - [ ] Create tiered classification system with primary and secondary outdoor spaces
  - [ ] Add weight to each place type based on likelihood of being outdoors

- [ ] **Improve Indoor Detection**
  - [ ] Create more granular building categories (fully enclosed vs. semi-outdoor structures)
  - [ ] Add distance-based weighting (closer buildings have more influence)
  - [ ] Consider building density in decision logic

- [ ] **Implement Advanced Scoring System**
  - [ ] Calculate an "outdoor score" from multiple weighted factors
  - [ ] Use higher weights for boundary containment vs. proximity
  - [ ] Set appropriate threshold to convert final score to binary outcome
  - [ ] Maintain high confidence scoring while still producing binary result

## Phase 3: API Optimization

- [ ] **Parallelize API Requests**
  - [ ] Make outdoor space and building detection requests simultaneously
  - [ ] Implement Promise.all for concurrent API calls
  - [ ] Add timeouts to prevent long-running requests

- [ ] **Optimize Boundary Data Requests**
  - [ ] Request detailed geometry data only for relevant places
  - [ ] Cache boundary data for frequently visited locations
  - [ ] Implement progressive loading of boundary detail based on confidence needs

- [ ] **Implement Progressive Enhancement**
  - [ ] Start with quick boundary check before detailed analysis
  - [ ] Allow early termination for high-confidence boundary containment cases
  - [ ] Only proceed to additional checks when boundary data is inconclusive

## Phase 4: Contextual Awareness

- [ ] **Add Geographic Context**
  - [ ] Consider location's urban density in detection algorithm
  - [ ] Adjust expectations based on regional development patterns
  - [ ] Implement special handling for complex environments (urban parks, college campuses)

- [ ] **Incorporate Time Awareness**
  - [ ] Consider business hours for certain outdoor spaces
  - [ ] Adjust confidence thresholds for day/night detection
  - [ ] Handle seasonal closures of outdoor spaces

- [ ] **Enhance Satellite Data Usage**
  - [ ] Use satellite view to validate outdoor areas within detected boundaries
  - [ ] Implement built environment analysis to differentiate indoor/outdoor spaces
  - [ ] Create indoor/outdoor classification for known boundaries

## Phase 5: Confidence & Error Handling

- [ ] **Boundary-Based Confidence Scoring**
  - [ ] Assign highest confidence when user is well within verified outdoor boundaries
  - [ ] Reduce confidence near boundary edges
  - [ ] Handle cases where indoor/outdoor boundaries overlap or conflict

- [ ] **Enhance Error Handling**
  - [ ] Add fallbacks when boundary data is unavailable
  - [ ] Implement retry mechanisms for boundary data requests
  - [ ] Create approximate boundaries when exact data is unavailable

- [ ] **Add Verification Mechanisms**
  - [ ] Cross-validate boundary data with satellite imagery
  - [ ] Check for boundary data freshness/recency
  - [ ] Flag suspicious boundary patterns for review

## Phase 6: Performance Optimization

- [ ] **Implement Boundary Caching**
  - [ ] Cache boundary data for frequently visited locations
  - [ ] Implement efficient spatial data structures for boundary lookup
  - [ ] Use simplified boundaries for initial checks, detailed for confirmation

- [ ] **Optimize Processing**
  - [ ] Use efficient point-in-polygon algorithms
  - [ ] Implement early termination for obvious containment cases
  - [ ] Pre-compute common boundary intersections

- [ ] **Add Spatial Index for Boundaries**
  - [ ] Create a lightweight spatial index for known outdoor spaces
  - [ ] Index common outdoor areas and their verified status
  - [ ] Implement fast lookup based on geohashing

## Phase 7: User Feedback & Learning

- [ ] **Track Boundary Accuracy**
  - [ ] Record when manual overrides conflict with boundary data
  - [ ] Analyze patterns to identify inaccurate boundaries
  - [ ] Use feedback to refine boundary definitions

- [ ] **Implement Feedback Loop**
  - [ ] Allow users to submit boundary corrections
  - [ ] Build a database of user-verified outdoor spaces
  - [ ] Use collective data to improve boundary accuracy

- [ ] **Add Explainability**
  - [ ] Show users their position relative to detected outdoor boundaries
  - [ ] Provide clear explanations for boundary-based decisions
  - [ ] Add visual debugging for boundary detection

## Binary Decision Logic

Despite the complex scoring and boundary analysis, the final output will remain binary:

- **Is Outdoors ("Touching Grass")**: When the user is confidently within an outdoor space boundary with a score above threshold
- **Not Outdoors**: When the user is inside or too close to a building, or outside verified outdoor space boundaries

The confidence score will inform the binary decision but will not be exposed directly to users except through explanation text.

## Implementation Priority

1. Enhanced Outdoor Space Boundary Detection (foundation for accuracy)
2. Enhanced Classification Logic (improved decision-making)
3. API Optimization (better boundary data retrieval)
4. Confidence & Error Handling (reliability improvements)
5. Performance Optimization (scale improvements)
6. Contextual Awareness (accuracy refinements)
7. User Feedback & Learning (continuous improvement)

## Success Metrics

- Reduction in false positives (incorrectly identifying as outdoors)
- Reduction in false negatives (failing to identify actual outdoor locations)
- Increased precision in outdoor boundary detection
- Reduced API call volume through better caching and early termination
- Decrease in manual override frequency
- Improved user satisfaction with detection accuracy 