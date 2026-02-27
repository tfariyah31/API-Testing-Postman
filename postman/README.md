## Test Coverage

### Authentication — Registration

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| REG-001 | Valid user registration | `201` + user object in response | P0 |
| REG-002 | Duplicate email address | `409` or `400`, success=false | P1 |
| REG-003 | Invalid email format | `400`, error references email | P1 |
| REG-004 | Weak / short password | `400`, error references password | P1 |
| REG-005 | Multiple missing required fields | `400`, error mentions missing/required | P1 |
| REG-006 | Missing email field | `400`, success=false | P1 |
| REG-007 | Missing name field | `400`, success=false | P1 |
| REG-009 | Completely empty request body | `400`, required/missing error | P1 |
| REG-010 | Unknown extra field submitted | `400`, error mentions unknown/not allowed | P2 |
| REG-011 | Whitespace-only email | `400`, email/required error | P1 |
| REG-012 | Password below minimum length | `400`, errors array with path=password | P1 |

**REG-001 assertion highlights:**
- `201 Created` status code
- `success: true` + `"User registered successfully"` message
- Schema validation (`id`, `email`, `createdAt`, `emailVerified`)
- `isBlocked: false` by default
- Password **not** present in response body
- Email format validated via regex
- Response time < 2000 ms

---

###  Authentication — Login

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| LG-001 | Valid credentials | `200` + valid JWT access & refresh tokens | P0 |
| LG-002 | Wrong password | `401`, no token, generic error (no user enumeration) | P1 |
| LG-003 | Non-existent user | `401`, generic error (no enumeration leak) | P1 |
| LG-004 | Uppercase email (case sensitivity check) | `200` or `401` (behaviour documented) | P2 |
| LG-005 | Blocked user account | `403`, message includes "account is blocked" | P1 |
| LG-006 | Missing email field | `400`, required/missing error | P1 |
| LG-007 | Missing password field | `400`, required/missing error | P1 |
| LG-010 | Valid refresh token | `200`, new access token issued | P1 |
| LG-011 | Invalid refresh token | `401`, no token returned | P1 |

**LG-001 assertion highlights:**
- Full JWT structural validation (3-part dot-separated format, base64url encoding)
- JWT payload decoded and `userId` claim verified against response
- `exp` claim present, is a number, and in the future
- Tokens saved to collection variables for downstream tests

---

### Products — Protected Route

| Test ID | Scenario | Expected | Priority |
|---------|----------|----------|----------|
| PR-001 | Authenticated GET all products | `200`, products array, all items schema-valid | P0 |
| PR-002 | Authenticated POST create product | `201`, product ID saved to collection variable | P0 |
| PR-003 | Authenticated GET product by ID | `200`, single product with valid fields | P0 |
| PR-004 | Authenticated PUT update product | `200`, updated fields reflected | P1 |
| PR-005 | Unauthenticated access (no token) | `401` | P0 |
| PR-006 | Invalid/malformed JWT | `401`, error mentions invalid/token | P0 |
| PR-007 | Access without auth (guard test) | `401` | P0 |
| PR-008 | Expired JWT | `401`, error mentions expired/invalid/token | P0 |
| PR-009 | Tampered JWT signature | `401`, pre-request script mutates signature | P0 |

**PR-001 assertion highlights:**
- Every product has: `name` (string), `description` (string), `image` (string), `rating` (number 0–5), `id` (string, 24 chars)
- Response time < 2000 ms
- Content-Type header is `application/json`

---

### Logout

| Test ID | Scenario | Expected |
|---------|----------|----------|
| LGO-001 | Authenticated logout | `200` or `204`, tokens cleared from environment |
| LGO-002 | Unauthenticated logout | `200` or `401` (graceful handling) |

---

### Performance Tests

| Test ID | Scenario | SLA |
|---------|----------|-----|
| PER-001 | Login P95 latency | < 1500 ms |
| PER-001 | Login P99 latency | < 2500 ms |
| PER-001 | Login response size | < 50 KB |
| PER-002 | Products response time | < 2000 ms |
| PER-002 | Products payload size | < 500 KB |
| PER-003 | Rate-limit headers logged | `X-RateLimit-Limit`, `X-RateLimit-Remaining` inspected |
| PER-004 | Cache headers present | `Cache-Control`, `ETag`, or `Expires` expected |
| PER-004 | Compression enabled | `Content-Encoding: gzip/deflate/br` verified |

---

### Security Tests

| Test ID | Attack Vector | Validation |
|---------|--------------|------------|
| SE-001 | SQL Injection on `/auth/login` (`' OR '1'='1`) | `400` or `401` only; no SQL engine details in response; no `500` |
| SE-002 | XSS Payload on `/auth/register` (`<img onerror=alert(1)>`) | `201` sanitised OR `400` rejected; no raw `<script>` in response |
| SE-003 | NoSQL Injection (`{"$ne": null}`) | `400` or `401`; no mongo / `$where` / `$ne` leak |
| SE-004 | Wrong HTTP Method — GET `/auth/login` | `405 Method Not Allowed` (Allow header mentions POST) |
| SE-005 | Wrong HTTP Method — POST `/products/:id` | `405 Method Not Allowed` |

---

### End-to-End User Journey

A 5-step flow that simulates a real user session, where each step depends on the previous:

```
FLOW-01  Register new user  →  saves e2e_token
FLOW-02  Login              →  saves access token
FLOW-03  View Profile       →  GET /auth/profile with token
FLOW-04  Logout             →  clears e2e_token
FLOW-05  Post-logout access →  GET /products returns 401
```

---

## Testing Strategies & Techniques

### Dynamic Test Data
Pre-request scripts generate unique, timestamped email addresses for each registration run, preventing test pollution across collection runs:
```javascript
const ts = Date.now();
pm.collectionVariables.set('reg_email', `newuser${ts}@testmail.com`);
```

### Chained Requests
Critical identifiers (user ID, access token, refresh token, product ID) are extracted from responses and stored as collection variables, making them available to every downstream request automatically.

### Global Helper Library
A shared `LIB` object is built in the collection-level test script and serialised to `pm.globals`, giving every request access to reusable validators:
```javascript
LIB.validEmail(email)   // RFC regex check
LIB.validJWT(token)     // 3-part structure check
LIB.noSqlLeak(body)     // detects DB engine strings in responses
LIB.recordMetric(k, v)  // accumulates timing metrics across runs
```

### JWT Deep Validation
Login tests go beyond "token exists" and decode the JWT payload client-side to assert:
- Correct 3-part structure + base64url encoding per part
- `userId` claim matches user object in response
- `exp` claim is in the future

### Schema Validation
Uses Postman's built-in `tv4` JSON Schema validator for structured response shape assertions on registration and login responses.

### Security-Aware Assertions
- Checks that error messages use **generic wording** to prevent user enumeration
- Verifies passwords are **never** returned in any response
- Tampered JWT test uses a pre-request script to programmatically corrupt the signature before sending
