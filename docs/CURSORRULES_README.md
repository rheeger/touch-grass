# Touch Grass Project - Cursor Rules

## Overview

This repository contains a `.cursorrules` file that defines comprehensive coding standards and best practices for the Touch Grass project. The Touch Grass project is a web3 application for location-based attestations through the Base blockchain, integrating Google Maps, Ethereum Attestation Service (EAS), and biometric verification.

## Purpose

The `.cursorrules` file serves several important purposes:

1. **Standardization**: Ensures consistent coding patterns across the codebase
2. **Onboarding**: Helps new developers quickly understand project conventions
3. **Quality**: Enforces high-quality code through automated rules and guidelines
4. **Domain-Specific Guidelines**: Provides project-specific rules for maps, blockchain, and attestation handling

## Key Sections

The rules file is organized into the following major sections:

### TypeScript Configuration
- Enforces strict typing, explicit return types, and consistent naming conventions
- Defines structured import ordering and file organization patterns
- Provides examples of correct and incorrect import ordering

### React & Next.js Best Practices
- Outlines component structure (props, hooks, effects, callbacks, rendering)
- Recommends proper use of hooks (useMemo, useCallback, useEffect)
- Suggests state management approaches with recommendations for complex state
- Provides performance optimization guidelines

### Component Patterns
- Encourages small, focused components with clean separation of concerns
- Defines prop passing conventions to avoid prop drilling
- Includes specific guidelines for map components and attestation cards

### Styling Conventions
- Promotes Tailwind CSS with utility-first approach
- Demonstrates correct composition of utility classes
- Provides examples of preferred styling vs. anti-patterns

### Code Quality Rules
- Sets documentation requirements for complex logic
- Establishes error handling strategies, especially for blockchain interactions
- Defines structured logging patterns with context and timestamps

### Testing Standards
- Sets coverage targets and test organization by component type
- Provides specialized testing approaches for maps and Web3 interactions
- Outlines test naming conventions and patterns

### Performance Standards
- Addresses bundle size, rendering optimization, and data fetching
- Includes specific guidelines for map performance and attestation caching
- Recommends strategies for handling large datasets

### Web3 Specific Guidelines
- Outlines wallet connection approaches using Privy
- Defines transaction handling with feedback and retry mechanisms
- Provides attestation validation rules and schema consistency guidelines
- Addresses security concerns specific to blockchain interactions

### Maps Integration
- Recommends optimization techniques for marker rendering
- Provides guidelines for user location handling with privacy considerations
- Suggests clustering approaches for dense attestation displays

### Touch Grass Project Specifics
- Addresses location data privacy standards
- Outlines attestation validation and grouping strategies
- Defines grass detection confidence scoring and algorithm guidelines

## How to Use

Developers should:

1. Review this file when onboarding to understand project conventions
2. Reference specific sections when implementing new features
3. Follow the examples provided for correct patterns
4. Use the rules to guide code reviews and feedback

## Rule Enforcement

While many rules can be enforced through linting and TypeScript configuration, others require developer attention during implementation and code review.

Key automated enforcement is handled through:
- TypeScript strict mode
- ESLint configuration
- Tailwind configuration
- Next.js build optimization

## Contributing

When extending or modifying the rules:

1. Ensure changes are discussed with the team
2. Provide clear rationale for rule changes
3. Include examples for new rules when possible
4. Update related configuration files if needed
5. Validate that rule changes don't conflict with existing patterns

## Examples

The rules file includes practical examples for many sections that demonstrate preferred patterns. Look for the `examples` subsections that show both correct and incorrect approaches. 