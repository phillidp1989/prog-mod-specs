# API Quick Reference

**Base URL:** `http://localhost:8080`

## Rate Limits
- **API endpoints:** 100 requests / 15 minutes
- **Autocomplete:** 50 requests / 15 minutes
- **Downloads:** 20 requests / 15 minutes

## Quick Endpoint List

### Programme Endpoints
```
GET /prog-data/:progCode/:cohort/:year
GET /autocomplete-data
GET /filter-options/programmes
GET /programme-degree-types
```

### Module Endpoints
```
GET /mod-data/:modCode/:year
GET /mod-autocomplete-data
GET /mod-level-distribution
GET /filter-options/modules
```

### Analytics Endpoints
```
GET /school-activity
```

## Common Examples

### Get Programme Data
```bash
curl http://localhost:8080/prog-data/H610/cohort/2024
```

### Get Module Data
```bash
curl http://localhost:8080/mod-data/06-21993/2024
```

### Get Autocomplete Data
```bash
curl http://localhost:8080/autocomplete-data
curl http://localhost:8080/mod-autocomplete-data
```

### Get Analytics
```bash
curl http://localhost:8080/school-activity
curl http://localhost:8080/mod-level-distribution
```

### Check Rate Limits
```bash
curl -I http://localhost:8080/school-activity | grep RateLimit
```

## Parameters

### Programme Data Parameters
- `:progCode` - Programme code (e.g., `H610`)
- `:cohort` - `cohort` or `term`
- `:year` - `2024`, `2025`, or `2026`

### Module Data Parameters
- `:modCode` - Module code (e.g., `06-21993`)
- `:year` - `2024`, `2025`, or `2026`

## Error Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Server Error

## Response Headers to Monitor
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Requests remaining
- `RateLimit-Reset` - Seconds until reset

## CORS Configuration
✅ **Localhost:** All localhost origins allowed in development
✅ **Server-to-Server:** No-origin requests always allowed
✅ **Browser Apps:** Add origin to `ALLOWED_ORIGINS` in `.env` for production

## See Full Documentation
See `API_DOCUMENTATION.md` for complete details, examples, and best practices.
