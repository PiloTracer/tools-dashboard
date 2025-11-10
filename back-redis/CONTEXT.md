## Redis Service

**Technology**: Redis 7.0, redis-py, Redis Cluster  
**Purpose**: Provides caching, rate limiting, and pub/sub capabilities  
**Key Components**:
- Caching layer for frequent queries
- Distributed rate limiting
- WebSocket pub/sub backbone
- Session management

**AI Context Guidelines**:
1. All keys must follow pattern: {service}:{resource}:{id}
2. Never store persistent data here - cache only
3. TTL must be set for all writes (max 24 hours)
4. Use Redis Cluster for production

**Critical Configuration**:
- Max memory: 50% of system RAM
- Max connections: 10,000
- Rate limiting: sliding window algorithm
- Pub/sub channels: must match feature contracts
- All cache keys must include version suffix

**Security Constraints**:
- Never store sensitive data without encryption
- All connections must use TLS
- Separate cache per tenant in multi-tenant scenarios
