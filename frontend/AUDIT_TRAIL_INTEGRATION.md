# Audit Trail Integration Documentation

## Overview
This document outlines the integration of the Audit Trail feature into the RPT Dashboard frontend application. The feature provides a comprehensive view of system activities, allowing administrators to track user actions, data changes, and system events.

## Architecture
The integration follows a standard React architecture with:
- **Service Layer**: Handles API communication (`src/services/auditService.ts`).
- **Data Fetching**: Uses `SWR` for caching, revalidation, and state management.
- **UI Components**: Built with reusable Shadcn UI components.
- **Routing**: Integrated into the existing `react-router-dom` configuration.

## API Endpoint Mapping
The frontend connects to the following backend endpoint:

| Method | Endpoint | Description | Parameters |
|Str |Str |Str |Str |
| GET | `/api/v1/audit` | Retrieve audit logs | `page`, `limit`, `source`, `tableName`, `action`, `userId`, `startDate`, `endDate` |

### Response Schema
```typescript
interface AuditLogResponse {
  status: string;
  source: string;
  results: number;
  total: number;
  page: number;
  totalPages: number;
  data: AuditLog[];
}
```

## Authentication
The application uses Bearer Token authentication. The `src/services/api.ts` interceptor automatically attaches the token from `localStorage` to every request.

```typescript
// src/services/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

## Caching Strategy
Data caching is implemented using `SWR` (Stale-While-Revalidate).
- **Key**: `['audit-logs', params]` - The cache key depends on the current filter parameters.
- **Configuration**: `revalidateOnFocus: false`, `keepPreviousData: true` (for smooth pagination).

## Deployment Steps
1. **Environment Variables**: Ensure `VITE_API_URL` is set in your `.env` file (defaults to `http://localhost:3000/api/v1`).
2. **Build**: Run `npm run build` to generate production assets.
3. **Deploy**: Serve the `dist` folder using your preferred web server (e.g., Nginx, Vercel, Netlify).

## Troubleshooting
- **401 Unauthorized**: Ensure the user is logged in and a valid token exists in `localStorage`. Check if the token has expired.
- **No Data**: Verify that the backend is running and connected to the database (Supabase/MSSQL). Check the `source` filter.
- **CORS Errors**: Ensure the backend allows requests from the frontend origin.

## Testing
Unit tests are located in `src/pages/__tests__/AuditTrail.test.tsx`.
Run tests using:
```bash
npm test
```
