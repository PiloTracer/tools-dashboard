## WebSocket Service

**Technology**: FastAPI WebSockets, Redis PubSub, Uvicorn  
**Purpose**: Provides real-time updates for all dashboard components  
**Key Components**:
- Connection management
- Message routing
- Heartbeat monitoring
- Reconnection logic

**AI Context Guidelines**:
1. Never implement business logic here - pure messaging
2. All messages must follow defined schema from feature contracts
3. Connection state must be stored in Redis
4. Max 50 concurrent connections per instance

**Critical Constraints**:
- Max message size: 128KB
- Heartbeat interval: 30 seconds
- Max inactivity: 120 seconds before disconnect
- Message rate limit: 10 messages/second/user
- All connections require authentication token

**Security Requirements**:
- Origin validation
- Message signing
- Connection throttling
- Automatic reconnection with backoff
