# Authentication Feature Context

## Backend Authentication Services
- All authentication logic resides in `back-auth` service
- Features are organized by auth method: `email-auth`, `google-auth`, `two-factor`
- Each feature has its own directory with `feature.yaml`, API routes, domain logic

## Frontend Authentication Flows
- `front-public` has complete user registration/signup flows
- `front-admin` currently lacks proper authentication flows
- All frontends should use loaders/actions to communicate with `back-auth`

## Security Requirements
- Passwords must be hashed with bcrypt
- Use JWT tokens with 15min expiration for access tokens
- Implement rate limiting on authentication endpoints
- All sensitive operations require re-authentication
- Admin interfaces require additional security validation