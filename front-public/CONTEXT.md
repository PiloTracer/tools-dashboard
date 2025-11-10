## Public Dashboard (Remix)

**Technology**: Remix 2.5, React 18, TypeScript, Tailwind CSS  
**Purpose**: User-facing interface for registration, authentication, and application access  
**Key Components**:
- Feature-encapsulated UI components
- Data loaders/actions
- Authentication integration
- Progressive profiling

**AI Context Guidelines**:
1. Each feature must have:
   - routes/ (Remix route structure)
   - ui/ (component implementation)
   - feature.yaml (contract)
2. All data must come from back-api via loaders
3. Must implement progressive profiling flow

**Critical Specifications**:
- All components must be:
  - Accessible (WCAG 2.1)
  - Responsive (mobile-first)
  - Type-safe (TypeScript)
  - Documented (JSDoc)
- Must redirect to profile completion when required
- All forms must have client-side validation
- Must support dark/light mode

**Security Constraints**:
- All user input must be sanitized
- No sensitive data stored in client
- Must validate all API responses
- Must use secure cookies for authentication
