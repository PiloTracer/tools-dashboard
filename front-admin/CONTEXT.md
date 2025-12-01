## Admin Dashboard (Remix)

**Technology**: Remix 2.5, React 18, TypeScript, Tailwind CSS  
**Purpose**: Administrative interface for managing users, applications, and system settings  
**Key Components**:
- Feature-encapsulated UI components
- Data loaders/actions
- Authentication integration
- Responsive layout system

**AI Context Guidelines**:
1. Each feature must have:
   - routes/ (Remix route structure)
   - ui/ (component implementation)
   - feature.yaml (contract)
2. All data must come from back-api via loaders
3. Never duplicate business logic from backend

**Critical Specifications**:
- All components must be:
  - Accessible (WCAG 2.1)
  - Responsive (mobile-first)
  - Type-safe (TypeScript)
  - Documented (JSDoc)
- All routes must follow /features/{feature}/pattern
- Must integrate with back-auth for permissions

**Security Constraints**:
- All data must be validated before display
- No direct API calls - always use loaders
- Sensitive operations require confirmation
- Admin actions must be audited
