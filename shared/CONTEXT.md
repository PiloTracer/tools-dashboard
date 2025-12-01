## Shared Contracts

**Technology**: Python, TypeScript, JSON Schema  
**Purpose**: Central repository for all cross-service contracts and models  
**Key Components**:
- Feature contracts (feature.yaml)
- Domain models
- Security utilities
- Type definitions

**AI Context Guidelines**:
1. This is the ONLY directory that can be imported across services
2. All changes require:
   - Backward compatibility
   - Version increment
   - Documentation update
3. Never implement business logic here

**Critical Specifications**:
- All feature contracts must include:
  - API endpoints
  - Data schemas
  - Dependencies
  - Versioning
- All models must be:
  - Type-safe
  - Versioned
  - Documented
  - Validated

**Security Constraints**:
- All security constants must be in security/
- No implementation details in shared code
- All encryption must use industry-standard algorithms
- Must support multiple encryption keys for rotation
