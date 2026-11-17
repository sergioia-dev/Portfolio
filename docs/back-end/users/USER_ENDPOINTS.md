
## 1. Get Own Account & Profile Information

**Purpose:** Retrieve the authenticated owner's account details (`users`) and public/contact profile (`user_information`). Only the account owner resolved from `accessToken` can read their own private account settings.
**Method/Path:** `GET /users/me`

**Semantics:** resolves the caller directly from the authenticated session (`accessToken`), never from a path parameter, ensuring strict owner-only access. Soft-deleted accounts (`is_deleted = TRUE` or `deleted_at IS NOT NULL`) are rejected as `UNAUTHORIZED`. The `password` hash is never included in the response.

### Success

- **`200 OK`**

```json
{
  "id": "01936f8a-7b1c-7d3e-8f2a-1b4c5d6e7f80",
  "username": "sergio-dev",
  "email": "sergio@example.com",
  "provider": "LOCAL",
  "role": "ANY",
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
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, token does not resolve to an active user, or account is soft-deleted (`is_deleted = TRUE`) |

---

## 2. Update Own Account & Profile Information

**Purpose:** Update the authenticated owner's account attributes (`users`) and/or profile details (`user_information`). Only the user who owns the account can perform this action.
**Method/Path:** `PATCH /users/me`

**Semantics:** partial update (`PATCH`) applied atomically within a single database transaction across `users` and `user_information` (sharing the same UUIDv7 `id` via 1:1 relationship, upserting `user_information` if not yet initialized). Omitted fields retain their current values; fields explicitly set to `null` clear nullable profile columns (`phone`, `country`, `github_url`, `gitlab_url`, `linkedin_url`, `business_email`). `username`  uniqueness is enforced by DB unique constraints (`users_username_key`, `users_email_key`). Updating `password` hashes the new value with Argon2/bcrypt before persisting; if the account uses an external OAuth provider (`provider != LOCAL`), password updates are rejected.

### Request body

| Field | Type | Rules |
|---|---|---|
| `username` | string | optional; non-null if provided; max 39 chars of letters, numbers, and single hyphens (`INVALID_USERNAME`); must be unique (`MSG-1`) |
| `email` | string | optional; non-null if provided; valid email, max 320 chars (`INVALID_EMAIL`); must be unique (`MSG-2`) |
| `password` | string | optional; non-null if provided; min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character `@ ! & - _` (`MSG-3`) |
| `information` | object | optional; nested profile attributes mapped to `user_information` |
| `information.full_name` | string \| null | optional; 1..255 chars, no control characters (`INVALID_NAME` / `INVALID_FIELD`) |
| `information.phone` | string \| null | optional; valid phone format, max 17 chars (`INVALID_FORMAT`) |
| `information.country` | string \| null | optional; non-blank string, max 50 chars (`INVALID_FIELD`) |
| `information.github_url` | string \| null | optional; valid absolute URL, max 2048 chars (`INVALID_URL`) |
| `information.gitlab_url` | string \| null | optional; valid absolute URL, max 2048 chars (`INVALID_URL`) |
| `information.linkedin_url` | string \| null | optional; valid absolute URL, max 2048 chars (`INVALID_URL`) |
| `information.business_email` | string \| null | optional; valid email address, max 320 chars (`INVALID_EMAIL`) |

**Body format**

```json
{
  "username": "sergio-dev",
  "email": "sergio@example.com",
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
```

### Success

- **`200 OK`** — returns the updated user account and profile object with the same structure as `GET /users/me`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted account owner |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type (e.g. `information` is not an object) or exceeds column max length (`country` > 50, `full_name` > 255) |
| `INVALID_USERNAME` | `400` | `username` is empty/null or does not match at most 39 chars of letters, numbers, and single hyphens |
| `INVALID_EMAIL` | `400` | `email` or `information.business_email` is not a valid email address |
| `MSG-3` | `400` | `password` does not contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (`@ ! & - _`) |
| `INVALID_NAME` | `400` | `information.full_name` contains control characters or is blank when provided |
| `INVALID_FORMAT` | `400` | `information.phone` is not a valid phone format or exceeds 17 characters |
| `INVALID_URL` | `400` | `github_url`, `gitlab_url`, or `linkedin_url` is not a valid absolute URL or exceeds 2048 chars |
| `MSG-1` | `409` | `username` is already taken by another account (enforced by DB unique constraint) |
| `MSG-2` | `409` | `email` is already registered to another account (enforced by DB unique constraint) |

---

## 3. Soft Delete Own Account

**Purpose:** Soft delete the authenticated owner's account. Only the user who owns the account can delete it.
**Method/Path:** `DELETE /users/me`

**Semantics:** **soft delete.** Sets `is_deleted = TRUE` and `deleted_at = CURRENT_TIMESTAMP` on the `users` row matching the authenticated owner, and immediately clears/revokes the `accessToken` and `refreshToken` cookies (`Max-Age=0`). Once soft-deleted:
- All authenticated endpoints reject the user's tokens with `401 UNAUTHORIZED`.
- Public portfolio endpoints (`GET /users/{userId}/portfolio/...`) treat the user as non-existent and return `404 MSG-4`.
- Associated portfolio resources (`experiences`, `projects`, `contributions`) are excluded from public read paths while the user is soft-deleted.
- A retention job permanently purges rows past the retention window.

No request body is expected — any body sent is ignored.

### Success

- **`204 No Content`** — empty body, with `Set-Cookie` headers clearing `accessToken` and `refreshToken`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, token does not resolve to an active user, or account is already soft-deleted (`is_deleted = TRUE`) |

There are no body-validation errors: this endpoint accepts no body.
