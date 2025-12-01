## PostgreSQL Data Service

**Technology**: PostgreSQL 15, asyncpg, SQLAlgebra (ORM)  
**Purpose**: Stores relational data: users, subscriptions, financial records, products  
**Key Components**:
- Connection management
- Transaction handling
- Schema migrations
- Repository pattern implementation

**Data Schema Focus**:
- Users: core identity information
- Subscriptions: tier definitions, billing status
- Financial: transactions, invoices
- Products: service definitions

**AI Context Guidelines**:
1. Never implement business logic here - pure data access
2. All queries must use parameterized statements
3. Connection pooling is required (min 5, max 20)
4. All PII must be encrypted at rest (TDE)
5. Column-level encryption for sensitive fields

**Critical Constraints**:
- Max query time: 200ms
- All transactions must be ACID-compliant
- Never store plaintext passwords or credit card numbers
- All financial data requires 2-year retention
