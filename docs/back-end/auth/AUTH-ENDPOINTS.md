# AUTH Endpoints — Specification

## Conventions

- **Content type:** `application/json` for request/response bodies.
- **Auth cookies:** `accessToken` and `refreshToken` are set as `HTTPOnly`, `Secure`, `SameSite=Strict` (or `Lax` if cross-site flows are needed), with `Path=/`.
- **Token lifetimes:** `accessToken` short-lived (e.g. 15 min), `refreshToken` long-lived (e.g. 7 days). *(Values TBD.)*
- **Uniqueness checks** must be enforced by **DB unique constraints**, not only by a pre-check — a "check then insert" is racy. Pre-checks are for returning friendly error codes; the constraint is the source of truth.
- **All error responses** return a body like `{ "code": "MSG-N", "message": "..." }`.
- Passwords are hashed (e.g. Argon2/bcrypt) before persistence; plaintext is never stored or logged.

---

## 1. Sign Up

**Purpose:** Register a new user.
**Method/Path:** `POST /auth/register` 

### Request fields

| Field | Type | Rules |
|---|---|---|
| `username` | string | Regex `^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$`, max 39 chars. Must be unique. |
| `email` | string | Valid email, not null, max 320 chars. Must be unique. |
| `password` | string | Min 8 chars; ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char from `@ ! & - _`. Hashed before save. |

> The username regex above inherently enforces: alphanumeric + hyphen only, no leading/trailing hyphen, no consecutive hyphens.

### Defaults applied on creation
- `provider = LOCAL`
- `role = VISITOR`

### Success
- **`201 Created`** — returns the created user (excluding sensitive fields; never return the password hash).

### Errors
| Code | HTTP | Condition |
|---|---:|---|
| `MSG-1` | `409` | Username already in use |
| `MSG-2` | `409` | Email already in use |
| `MSG-3` | `400` | Password fails validation |

---

## 2. Sign In

**Purpose:** Authenticate an existing user and issue tokens.
**Method/Path:** `POST /auth/login` *(path TBD)*

> **Rename note:** the original called this "Sign Up", but the only error code (`MSG-4 User not found`) and the "issue tokens" behavior describe **sign-in**, not sign-up. I renamed it to Sign In — revert if that was not the intent.

### Request fields
| Field | Type | Rules |
|---|---|---|
| `email` | string | Required, valid email |
| `password` | string | Required, non-empty |

### Success
- **`200 OK`** — sets `accessToken` and `refreshToken` as `HTTPOnly` cookies. Body may return a minimal user object (no tokens in body).

### Errors
| Code | HTTP | Condition |
|---|---:|---|
| `MSG-4` | `401` | User not found |

> **Assumption:** invalid password also returns `MSG-4` (do not reveal whether the email exists). If you want a distinct code, add one.

---

## 3. Refresh Token

**Purpose:** Issue a new access token using the refresh token.
**Method/Path:** `POST /auth/refresh` *(path TBD)*

### Request
- No body parameters. The refresh token is read from the `HTTPOnly` cookie.

### Success
- **`200 OK`** — sets a new `accessToken` cookie.

### Errors 
| HTTP | Condition |
|---:|---|
| `401` | Refresh token missing, invalid, expired, or revoked |

---

## 4. Log Out

**Purpose:** End the session.
**Method/Path:** `POST /auth/logout` *(path TBD)*

### Success
- **`200 OK`** — clears the `accessToken` and `refreshToken` cookies (set them expired with `Max-Age=0`).

---

## 5. Delete Account

**Purpose:** Soft-delete the authenticated user.
**Method/Path:** `DELETE /auth/account` *(path TBD)*

### Behavior
- Set `email = NULL`, `username = NULL`.
- Set `deleted_at = now()`.
- Clear the password hash

### Success
- **`200 OK`** (or `204 No Content`).

