# Administration Endpoints - Specification

## Conventions

- **Content type:** `application/json` for request/response bodies.
- **Auth cookies:** `accessToken` and `refreshToken` are set as `HTTPOnly`, `Secure`, `SameSite=Strict` (or `Lax` if cross-site flows are needed), with `Path=/`.
- **Token lifetimes:** `accessToken` short-lived (e.g. 15 min), `refreshToken` long-lived (e.g. 7 days). *(Values TBD.)*
- **Uniqueness checks** must be enforced by **DB unique constraints**, not only by a pre-check — a "check then insert" is racy. Pre-checks are for returning friendly error codes; the constraint is the source of truth.
- **All error responses** return a body like `{ "code": "MSG-N", "message": "..." }`.
- Passwords are hashed (e.g. Argon2/bcrypt) before persistence; plaintext is never stored or logged.

In this section we are describing the endpoints required for the module also the transversal functionalities required for achieving the tasks.

## Transversal Functionalities

[Exceptions](../../exceptions/Exceptions.md)
[Features](../../FEATURES.md)

---

## 1. Search Users by Email or Username

**Purpose:** Search user accounts by partial or exact match on `email` or `username`. Requires an authenticated session whose role grants the `ADMINISTRATOR` feature.
**Method/Path:** `GET /users/administration`

**Semantics:** performs a case-insensitive lookup across `users.email` and `users.username` (joining `roles`, `providers`, and `user_information`). Soft-deleted users (`is_deleted = TRUE` or `deleted_at IS NOT NULL`) are excluded by default unless `include_deleted=true` is explicitly passed. Password hashes are never exposed.

**Empty result is not an error:** a valid search query matching zero users returns `200 OK` with `"items": []`, never `404`.

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `query` | **yes** | Search term matched against `email` or `username`; must be non-blank, `1..255` chars. |
| `include_deleted` | no | Boolean (`true` \| `false`). Default `false`. |
| `limit` | no | Page size, integer `1..100`. Default `20`. |
| `page` | no | 1-based page number, integer `≥ 1`. Default `1`. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "01936f8a-7b1c-7d3e-8f2a-1b4c5d6e7f80",
      "username": "sergio-dev",
      "email": "sergio@example.com",
      "provider": "LOCAL",
      "role": "PORTFOLIO_OWNER",
      "is_administrator": false,
      "is_deleted": false,
      "deleted_at": null,
      "information": {
        "full_name": "Sergio Idarraga Aguirre",
        "phone": "+573001234567",
        "country": "Colombia",
        "github_url": "[https://github.com/username](https://github.com/username)",
        "gitlab_url": "[https://gitlab.com/username](https://gitlab.com/username)",
        "linkedin_url": "[https://www.linkedin.com/in/username](https://www.linkedin.com/in/username)",
        "business_email": "contact@example.com"
      }
    }
  ],
  "meta": {
    "query": "sergio",
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated user does not have the `ADMINISTRATOR` feature |
| `MISSING_FIELD` | `400` | `query` parameter is absent or blank |
| `INVALID_QUERY_PARAM` | `400` | `query` exceeds 255 chars, or `include_deleted`, `limit`, or `page` is malformed or out of range |

---

## 2. Update a User's Email and Username

**Purpose:** Update another user's `username` and/or `email`. Requires the caller to have the `ADMINISTRATOR` feature, and the target user **must not** possess the `ADMINISTRATOR` feature.
**Method/Path:** `PATCH /users/administration/{userId}`

**Semantics:** partial update (`PATCH`) on `users` for target `{userId}`. Before applying changes, the service resolves the target user's role and features (`roles` → `rol_funcionalities` → `functionalities`): if the target user has the `ADMINISTRATOR` feature (including if `{userId}` is the caller themselves), the operation is rejected with `403 MSG-5`. Soft-deleted users (`is_deleted = TRUE`) cannot be updated and return `404 MSG-4`. Uniqueness of `username` (`users_username_key`) and `email` (`users_email_key`) is enforced by DB unique constraints.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Well-formed UUIDv7 identifier of the target user (`INVALID_USER_ID` on malformed format). |

### Request body

| Field | Type | Rules |
|---|---|---|
| `username` | string | optional; non-null if provided; max 39 chars of letters, numbers, and single hyphens (`INVALID_USERNAME`); must be unique (`MSG-1`) |
| `email` | string | optional; non-null if provided; valid email format, max 255 chars (`INVALID_EMAIL`); must be unique (`MSG-2`) |

**Body format**

```json
{
  "username": "updated-username",
  "email": "updated.email@example.com"
}
```

### Success

- **`200 OK`** — returns the updated user summary object matching an entry in `GET /users/administration`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
| `INVALID_USER_ID` | `400` | `{userId}` in the path is not a well-formed user identifier |
| `MSG-4` | `404` | Target user `{userId}` does not exist or is already soft-deleted (`is_deleted = TRUE`) |
| `MSG-5` | `403` | Target user `{userId}` has the `ADMINISTRATOR` feature (administrators cannot modify other administrators or themselves via this endpoint) |
| `INVALID_FIELD` | `400` | Request body is empty/not an object, contains unsupported fields, or `username`/`email` has a non-string JSON type |
| `INVALID_USERNAME` | `400` | `username` is empty/null or does not match at most 39 chars of letters, numbers, and single hyphens |
| `INVALID_EMAIL` | `400` | `email` is empty/null or is not a valid email address |
| `MSG-1` | `409` | `username` is already taken by another account (enforced by DB unique constraint) |
| `MSG-2` | `409` | `email` is already registered to another account (enforced by DB unique constraint) |

---

## 3. Soft Delete a User Account

**Purpose:** Soft delete another user's account. Requires the caller to have the `ADMINISTRATOR` feature, and the target user **must not** possess the `ADMINISTRATOR` feature.
**Method/Path:** `DELETE /users/administration/{userId}`

**Semantics:** **soft delete.** Sets `is_deleted = TRUE` and `deleted_at = CURRENT_TIMESTAMP` on the target `users` row and revokes active sessions for `{userId}`. Target accounts whose role grants the `ADMINISTRATOR` feature cannot be deleted through this endpoint and return `403 MSG-5`. Once soft-deleted:
- The target user's tokens are rejected with `401 UNAUTHORIZED`.
- Public portfolio endpoints (`GET /users/{userId}/portfolio/...`) treat the user as non-existent (`404 MSG-4`).
- No request body is expected — any body sent is ignored.

**Idempotency:** repeating `DELETE /users/administration/{userId}` on an already soft-deleted non-administrator user returns `204 No Content` again. Ownership/existence and privilege checks are evaluated against the row ignoring `is_deleted` so repeat calls return `204` rather than `404`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Well-formed UUIDv7 identifier of the target user (`INVALID_USER_ID` on malformed format). |

### Success

- **`204 No Content`** — empty body.
- Already-soft-deleted non-administrator user → **`204 No Content`** (see Idempotency above).

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
| `INVALID_USER_ID` | `400` | `{userId}` in the path is not a well-formed user identifier |
| `MSG-4` | `404` | Target user `{userId}` does not exist |
| `MSG-5` | `403` | Target user `{userId}` has the `ADMINISTRATOR` feature |

There are no body-validation errors: this endpoint accepts no body.
