## Cassandra Data Service

**Technology**: Apache Cassandra 4.1, DataStax Python Driver, CQL  
**Purpose**: Stores non-relational data: configurations, extended user data, application metadata  
**Key Components**:
- Connection management
- CQL query execution
- Schema migrations (CQL scripts)
- Repository pattern implementation

**Data Schema Focus**:
- Configurations: application-specific settings
- Extended user data: progressive profiling results
- Web application customizations

**AI Context Guidelines**:
1. Never implement business logic here - pure data access
2. All queries must use prepared statements
3. Connection pooling is required (min 10, max 50)
4. Time-to-live (TTL) must be used for all writes
5. Queries must specify consistency level

**Critical Constraints**:
- No transactions - use idempotent operations
- Max query time: 500ms
- All writes must have 3x replication factor
- Never store PII without client-side encryption
