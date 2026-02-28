# Rate Limit Testing - Iteration Collection

> Postman collection validating the API's **brute-force protection** by simulating repeated failed login attempts and asserting that the server enforces rate limiting on the third request.

![Postman](https://img.shields.io/badge/Postman-Collection-FF6C37?logo=postman&logoColor=white)
![Iterations](https://img.shields.io/badge/Newman%20Iterations-3-blue)
![Focus](https://img.shields.io/badge/Focus-Rate%20Limiting%20%7C%20429-red)

---

## Table of Contents

- [Test Coverage](#test-coverage)
- [How the Iteration Logic Works](#how-the-iteration-logic-works)
- [Postman Setup](#postman-setup)
- [Newman Integration](#newman-integration)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)

---

## Test Coverage

### Exceeding Failed Login Attempts

This collection targets `POST /auth/login` with **intentionally wrong credentials**, running the same request 3 times in sequence to trigger the server's rate limiter.

| Iteration | Request # | Expected Status | What's Being Tested |
|-----------|-----------|:--------------:|---------------------|
| 1 | 1st failed login | `401` | Server rejects bad credentials normally |
| 2 | 2nd failed login | `401` | Server still responding, not yet throttled |
| 3 | 3rd failed login | `429` | Rate limit triggered — Too Many Requests |

**Assertions per iteration:**

- Iteration 1 & 2 — `pm.response.to.have.status(401)` — confirms the endpoint correctly rejects invalid credentials without prematurely throttling
- Iteration 3 — `pm.response.to.have.status(429)` — confirms the server enforces a request cap after repeated failures

**What this validates:**
- The API has **brute-force protection** active on the login endpoint
- The rate limiter kicks in at the correct threshold (3rd attempt)
- The server does **not** return `200` or expose data under repeated hammering
- Normal failed-auth behaviour (`401`) is preserved before the limit is hit

---

## Postman Setup

### Prerequisites

1. Import the collection into Postman:
   - **Import** → select `postman-tests/RateLimit_SimpleWebApp_API.json`
   - Check the `base_url` in your collection variable (e.g. `http://localhost:5001/api`)

### Running with the Collection Runner

1. Open the **Collection Runner** (click the ▶ button next to the collection)
2. Set **Iterations** to `3`
3. Click **Run**

You should see the first two requests pass as `401` and the final request pass as `429`.

---

## Newman Integration

### Install Newman and HTMLExtra Reporter

```bash
npm install -g newman newman-reporter-htmlextra
```

### Run Locally

```bash
newman run postman-tests/IterationSimpleWebApp_API.json \
  -n 3 \
  -r cli,htmlextra
```

The HTML report will be saved to `newman/RateLimit-report.html`.

---

## Related

- 📄 [Main API Test Suite README](../../README.md) — Full functional, security, and performance coverage
- 📁 `postman-tests/SimpleWebApp_API.json` — Primary collection (60+ test cases)

---
