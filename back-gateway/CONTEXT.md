## API Gateway (Kong)

**Technology**: Kong 3.4, OpenResty, Lua  
**Purpose**: Routes traffic, enforces security policies, and manages rate limiting  
**Key Components**:
- Request routing to backend services
- JWT validation
- Rate limiting by subscription tier
- Web Application Firewall (WAF)

**AI Context Guidelines**:
1. All configurations must be declarative (no custom Lua)
2. Rate limits must reference shared subscription definitions
3. Only modify kong.yml and security-rules/
4. Never implement business logic here

**Critical Configuration Rules**:
- Free tier: 60 requests/minute
- Standard tier: 600 requests/minute
- Premium tier: 10,000 requests/minute (with dynamic scaling)
- All endpoints require JWT authentication
- WAF must block SQLi, XSS, and path traversal attempts
