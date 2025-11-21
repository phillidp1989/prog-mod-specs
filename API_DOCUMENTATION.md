# API Documentation for External Applications

**Base URL:** `http://localhost:8080` (development)

**Last Updated:** 2025-11-08

## Authentication

Currently, no authentication is required. APIs are protected by rate limiting.

## Rate Limits

All endpoints include rate limit information in response headers:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Remaining requests in current window |
| `RateLimit-Reset` | Seconds until the rate limit resets |

### Rate Limit Tiers

| Endpoint Type | Limit | Window | Status Code When Exceeded |
|--------------|-------|--------|---------------------------|
| API endpoints | 100 requests | 15 minutes | 429 Too Many Requests |
| Autocomplete | 50 requests | 15 minutes | 429 Too Many Requests |
| Downloads | 20 requests | 15 minutes | 429 Too Many Requests |

**Example Rate Limit Response:**
```http
HTTP/1.1 200 OK
RateLimit-Policy: 100;w=900
RateLimit-Limit: 100
RateLimit-Remaining: 96
RateLimit-Reset: 753
```

## CORS Configuration

### Development Mode (Current)
- **All origins allowed** when `NODE_ENV=development`
- **Server-to-server calls** (no origin header) always allowed
- **Localhost ports** explicitly whitelisted: 3000, 5173, 8080

### Production Mode
Only explicitly listed origins in `ALLOWED_ORIGINS` environment variable are allowed (plus server-to-server calls).

---

## Core Programme Endpoints

### Get Programme Data

Retrieves detailed programme specification data.

```http
GET /prog-data/:progCode/:cohort/:year
```

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `progCode` | string | Yes | Programme code | `H610` |
| `cohort` | string | Yes | Cohort type: `cohort` or `term` | `cohort` |
| `year` | string | Yes | Academic year: `2024`, `2025`, or `2026` | `2024` |

**Example Request:**
```bash
curl http://localhost:8080/prog-data/H610/cohort/2024
```

**Success Response (200 OK):**
```json
{
  "progCode": "H610",
  "progTitle": "BSc Computer Science",
  "college": "Engineering and Physical Sciences",
  "school": "School of Computer Science",
  "dept1": "Computer Science",
  "shortTitle": "Computer Science",
  "matchedBoolean": true,
  "matchedProgs": [
    "H610-2024Y - BSc Computer Science (with Year Abroad)"
  ]
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Programme not found: INVALID"
}
```

---

### Get Programme Autocomplete Data

Retrieves all available programmes for autocomplete/search functionality.

```http
GET /autocomplete-data
```

**No Parameters Required**

**Example Request:**
```bash
curl http://localhost:8080/autocomplete-data
```

**Success Response (200 OK):**
```json
{
  "047E - PGDip Management: Entrepreneurship and Innovation (Birmingham)": null,
  "H610 - BSc Computer Science FT (Birmingham)": null,
  "...": null
}
```

**Response Format:** Object with programme descriptions as keys, values are `null` (format required by autocomplete library).

**Caching:** Response cached for 1 hour to improve performance.

---

### Get Programme Filter Options

Retrieves available filter options for programmes.

```http
GET /filter-options/programmes
```

**Example Request:**
```bash
curl http://localhost:8080/filter-options/programmes
```

**Success Response (200 OK):**
```json
{
  "colleges": ["Arts and Law", "Engineering and Physical Sciences", "..."],
  "campuses": ["Birmingham", "Dubai", "..."],
  "modes": ["Full-time", "Part-time", "..."],
  "degreeTypes": ["BSc", "MSc", "BA", "MA", "..."],
  "departments": ["Computer Science", "Mathematics", "..."],
  "divisions": ["Division 1", "Division 2", "..."]
}
```

---

### Get Programme Degree Types Distribution

Retrieves programme counts by degree type across all years.

```http
GET /programme-degree-types
```

**Example Request:**
```bash
curl http://localhost:8080/programme-degree-types
```

**Success Response (200 OK):**
```json
{
  "Bachelor of Science": 450,
  "Master of Science": 320,
  "Bachelor of Arts": 280,
  "Master of Arts": 150
}
```

---

## Core Module Endpoints

### Get Module Data

Retrieves detailed module specification data.

```http
GET /mod-data/:modCode/:year
```

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `modCode` | string | Yes | Module code | `06-21993` |
| `year` | string | Yes | Academic year: `2024`, `2025`, or `2026` | `2024` |

**Example Request:**
```bash
curl http://localhost:8080/mod-data/06-21993/2024
```

**Success Response (200 OK):**
```json
{
  "code": "06-21993",
  "title": "Introduction to Programming",
  "college": "Engineering and Physical Sciences",
  "school": "School of Computer Science",
  "dept": "Computer Science",
  "level": "LI",
  "credits": "20",
  "semester": "Semester 1",
  "campus": "Birmingham",
  "matchedBoolean": false
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Module not found: INVALID"
}
```

---

### Get Module Autocomplete Data

Retrieves all available modules for autocomplete/search functionality.

```http
GET /mod-autocomplete-data
```

**No Parameters Required**

**Example Request:**
```bash
curl http://localhost:8080/mod-autocomplete-data
```

**Success Response (200 OK):**
```json
{
  "06-21993 - Introduction to Programming (Birmingham)": null,
  "06-21994 - Data Structures and Algorithms": null,
  "...": null
}
```

**Response Format:** Object with module descriptions as keys, values are `null`.

**Caching:** Response cached for 1 hour to improve performance.

---

### Get Module Filter Options

Retrieves available filter options for modules.

```http
GET /filter-options/modules
```

**Example Request:**
```bash
curl http://localhost:8080/filter-options/modules
```

**Success Response (200 OK):**
```json
{
  "levels": ["C", "I", "H", "M", "D"],
  "credits": [10, 20, 30, 40, 60],
  "semesters": ["Semester 1", "Semester 2", "Full Year"],
  "schools": ["School of Computer Science", "School of Mathematics", "..."],
  "departments": ["Computer Science", "Mathematics", "..."],
  "colleges": ["Engineering and Physical Sciences", "Arts and Law", "..."]
}
```

---

### Get Module Level Distribution

Retrieves module counts by academic level.

```http
GET /mod-level-distribution
```

**Example Request:**
```bash
curl http://localhost:8080/mod-level-distribution
```

**Success Response (200 OK):**
```json
{
  "C": 1002,
  "I": 1208,
  "H": 1644,
  "M": 3521,
  "D": 33,
  "F": 195
}
```

**Level Codes:**
- `C` - Certificate (Level 4)
- `I` - Intermediate (Level 5)
- `H` - Honours (Level 6)
- `M` - Masters (Level 7)
- `D` - Doctorate (Level 8)
- `F` - Foundation

---

## Analytics Endpoints

### Get School Activity

Retrieves top 10 schools by module count across all years.

```http
GET /school-activity
```

**Example Request:**
```bash
curl http://localhost:8080/school-activity
```

**Success Response (200 OK):**
```json
{
  "Lan, Cult, Art Hist & Music": 2415,
  "Birmingham Business School": 2331,
  "History and Cultures": 1557,
  "School of Health Sciences": 1376,
  "Eng, Drama, & Creative Studies": 1356,
  "Phil, Theology and Religion": 1272,
  "School of Engineering": 891,
  "Government": 829,
  "School of Geog Earth & Env Sci": 826,
  "School of Psychology": 721
}
```

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Best Practices for External Applications

### 1. Implement Rate Limit Monitoring

```javascript
const response = await fetch('http://localhost:8080/prog-data/H610/cohort/2024');

// Check rate limit headers
const remaining = response.headers.get('RateLimit-Remaining');
const reset = response.headers.get('RateLimit-Reset');

if (remaining < 10) {
  console.warn(`Only ${remaining} requests remaining. Resets in ${reset}s`);
}
```

### 2. Handle Rate Limit Errors

```javascript
if (response.status === 429) {
  const resetTime = response.headers.get('RateLimit-Reset');
  console.error(`Rate limit exceeded. Wait ${resetTime} seconds.`);
  // Implement exponential backoff or queue requests
}
```

### 3. Cache Responses Locally

Since autocomplete and filter data rarely change, cache them locally:

```javascript
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

let autocompleteCache = null;
let cacheTime = null;

async function getAutocompleteData() {
  if (autocompleteCache && (Date.now() - cacheTime) < CACHE_DURATION) {
    return autocompleteCache;
  }

  const response = await fetch('http://localhost:8080/autocomplete-data');
  autocompleteCache = await response.json();
  cacheTime = Date.now();

  return autocompleteCache;
}
```

### 4. Validate Parameters Before Calling

```javascript
function validateProgrammeParams(progCode, cohort, year) {
  if (!progCode || progCode.trim() === '') {
    throw new Error('Programme code is required');
  }

  if (!['cohort', 'term'].includes(cohort)) {
    throw new Error('Cohort must be "cohort" or "term"');
  }

  if (!['2024', '2025', '2026'].includes(year)) {
    throw new Error('Year must be 2024, 2025, or 2026');
  }
}
```

### 5. Handle Errors Gracefully

```javascript
async function getProgrammeData(progCode, cohort, year) {
  try {
    const response = await fetch(
      `http://localhost:8080/prog-data/${progCode}/${cohort}/${year}`
    );

    if (response.status === 404) {
      return { error: 'Programme not found', data: null };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { error: null, data: await response.json() };
  } catch (error) {
    console.error('Error fetching programme data:', error);
    return { error: error.message, data: null };
  }
}
```

---

## Example Integration Code

### Node.js / Express Application

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:8080';

class SpecsAPI {
  constructor() {
    this.baseURL = API_BASE;
  }

  async getProgramme(progCode, cohort, year) {
    try {
      const response = await axios.get(
        `${this.baseURL}/prog-data/${progCode}/${cohort}/${year}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getModule(modCode, year) {
    try {
      const response = await axios.get(
        `${this.baseURL}/mod-data/${modCode}/${year}`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSchoolActivity() {
    const response = await axios.get(`${this.baseURL}/school-activity`);
    return response.data;
  }
}

module.exports = SpecsAPI;
```

### Browser / Vanilla JavaScript

```javascript
class SpecsAPIClient {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
  }

  async getProgramme(progCode, cohort, year) {
    const response = await fetch(
      `${this.baseURL}/prog-data/${progCode}/${cohort}/${year}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  async getAutocompleteData() {
    const response = await fetch(`${this.baseURL}/autocomplete-data`);
    return response.json();
  }

  async getModuleLevelDistribution() {
    const response = await fetch(`${this.baseURL}/mod-level-distribution`);
    return response.json();
  }
}

// Usage
const api = new SpecsAPIClient();
const programmeData = await api.getProgramme('H610', 'cohort', '2024');
```

---

## Testing the API

You can test all endpoints using curl:

```bash
# Programme data
curl http://localhost:8080/prog-data/H610/cohort/2024

# Module data
curl http://localhost:8080/mod-data/06-21993/2024

# Autocomplete
curl http://localhost:8080/autocomplete-data

# School activity
curl http://localhost:8080/school-activity

# Module level distribution
curl http://localhost:8080/mod-level-distribution

# Check rate limits
curl -I http://localhost:8080/school-activity
```

---

## Support & Questions

If you encounter issues or need higher rate limits, please contact the API maintainer.

**Server Configuration:**
- Environment: Development (`NODE_ENV=development`)
- Port: 8080
- CORS: Enabled for all localhost origins
- Rate Limiting: Active
