# API Key Authentication Migration

The backend authentication system has been migrated from a JWT-based mechanism to a simplified, secure API Key mechanism. This document outlines the changes made, the new architecture, and how to configure it.

## What Changed?
1. **Removed JWT Validation**: The backend no longer validates Supabase JSON Web Tokens or checks local JWKS signatures.
2. **Added API Key Validation**: The `protect` middleware in `express-backend/src/middleware/auth.js` now strictly looks for a valid API Key.
3. **Added Rate Limiting**: To prevent brute-force attacks against the API key, a rate limiter has been introduced that restricts IPs to 1,000 requests per 15 minutes.
4. **Backward Compatibility**: To ensure existing routes that rely on `req.user` (e.g., `req.user.id` or `req.user.role`) do not break, the middleware injects a mock "Admin" user object into the request context upon successful key validation.

## How it Works

### 1. Backend Configuration
The backend expects an environment variable named `API_ACCESS_KEY`. 
In your `express-backend/.env` file:
```env
API_ACCESS_KEY=your_secure_api_key_12345
```
*Note: Ensure this key is a long, securely generated random string in production.*

### 2. Frontend Configuration
The frontend Axios client (`frontend/src/services/api.ts`) has been updated to automatically attach this key to every outgoing request via the `x-api-key` header.
In your `frontend/.env` file:
```env
VITE_API_ACCESS_KEY=your_secure_api_key_12345
```

### 3. API Headers
Requests to the backend must include the API key. The middleware accepts it in two formats:
1. Custom Header: `x-api-key: <YOUR_API_KEY>` (Preferred)
2. Bearer Token: `Authorization: Bearer <YOUR_API_KEY>` (Maintained for compatibility with legacy systems)

## Error Handling
- **401 Unauthorized**: Returned if the API key is missing or invalid.
- **429 Too Many Requests**: Returned if an IP address exceeds the rate limit of 1000 requests per 15 minutes.
- **500 Internal Server Error**: Returned if the `API_ACCESS_KEY` is not configured on the server.

## Testing the System
You can test the new system by running a simple `curl` command against the backend:

```bash
# Missing Key (Should return 401)
curl -X GET http://localhost:3000/api/v1/some-protected-route

# Invalid Key (Should return 401)
curl -X GET http://localhost:3000/api/v1/some-protected-route -H "x-api-key: wrong_key"

# Valid Key (Should return 200 OK)
curl -X GET http://localhost:3000/api/v1/some-protected-route -H "x-api-key: your_secure_api_key_12345"
```