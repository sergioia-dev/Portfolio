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

## 2. Update a User's Email, Username, and Role

**Purpose:** Update another user's `username`, `email`, and/or assigned role (`rol_id`). Requires the caller to have the `ADMINISTRATOR` feature, and the target user **must not** possess the `ADMINISTRATOR` feature.
**Method/Path:** `PATCH /users/administration/{userId}`

**Semantics:** partial update (`PATCH`) on `users` for target `{userId}`. Before applying changes:
1. The service resolves the target user's current role and features (`roles` → `rol_funcionalities` → `functionalities`): if the target user already has the `ADMINISTRATOR` feature (including if `{userId}` is the caller themselves), the operation is rejected with `403 MSG-5`.
2. If `rol_id` is supplied, the target role must exist in `roles` (`404 MSG-10` if absent) and **must not** include the `ADMINISTRATOR` feature (`403 MSG-5` — privilege escalation prevention).
3. Soft-deleted users (`is_deleted = TRUE`) cannot be updated and return `404 MSG-4`.
4. Uniqueness of `username` (`users_username_key`) and `email` (`users_email_key`) is enforced by DB unique constraints.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Well-formed UUIDv7 identifier of the target user (`INVALID_USER_ID` on malformed format). |

### Request body

| Field | Type | Rules |
|---|---|---|
| `username` | string | optional; non-null if provided; max 39 chars of letters, numbers, and single hyphens (`INVALID_USERNAME`); must be unique (`MSG-1`) |
| `email` | string | optional; non-null if provided; valid email format, max 255 chars (`INVALID_EMAIL`); must be unique (`MSG-2`) |
| `rol_id` | string | optional; non-null if provided; well-formed UUID referencing an existing role in `roles` (`INVALID_ID` / `MSG-10`) that does not grant the `ADMINISTRATOR` feature (`MSG-5`) |

**Body format**

```json
{
  "username": "updated-username",
  "email": "updated.email@example.com",
  "rol_id": "01936f8a-2222-7d3e-8f2a-1b4c5d6e7f80"
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
| `MSG-5` | `403` | Target user `{userId}` currently has the `ADMINISTRATOR` feature |
| `INVALID_FIELD` | `400` | Request body is empty/not an object, contains unsupported fields, or `username`/`email`/`rol_id` has a non-string JSON type |
| `INVALID_USERNAME` | `400` | `username` is empty/null or does not match at most 39 chars of letters, numbers, and single hyphens |
| `INVALID_EMAIL` | `400` | `email` is empty/null or is not a valid email address |
| `INVALID_ID` | `400` | `rol_id` is empty/null or is not a well-formed role identifier |
| `MSG-10` | `404` | Role `rol_id` does not exist in `roles` |
| `MSG-5` | `403` | Target `rol_id` grants the `ADMINISTRATOR` feature |
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

## 4. List Roles and Attached Functionalities

**Purpose:** Retrieve all configured roles along with their attached functionalities (`roles` joined with `rol_funcionalities` and `functionalities`). Requires the `ADMINISTRATOR` feature.
**Method/Path:** `GET /users/administration/roles`

**Semantics:** returns all roles ordered by `name ASC`. Each role includes the list of attached `functionalities` (`id`, `name`, `description`).

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "01936f8a-1111-7d3e-8f2a-1b4c5d6e7f80",
      "name": "PORTFOLIO_OWNER",
      "description": "Standard portfolio owner with create, update, and delete permissions.",
      "functionalities": [
        {
          "id": "01936f8a-aaaa-7d3e-8f2a-1b4c5d6e7f80",
          "name": "PORTFOLIO_CREATE",
          "description": "Can create a new object in the user owns account with this functionality"
        },
        {
          "id": "01936f8a-bbbb-7d3e-8f2a-1b4c5d6e7f80",
          "name": "PORTFOLIO_UPDATE",
          "description": "Can edit a object of the user owns account"
        },
        {
          "id": "01936f8a-cccc-7d3e-8f2a-1b4c5d6e7f80",
          "name": "PORTFOLIO_DELETE",
          "description": "Can delete a user owns object"
        }
      ]
    }
  ]
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |

---

## 5. Create a Role with Attached Functionalities

**Purpose:** Create a new role in `roles` and attach existing functionalities in `rol_funcionalities`. Requires the `ADMINISTRATOR` feature.
**Method/Path:** `POST /users/administration/roles`

**Semantics:** executed atomically inside a single database transaction. Inserts the role into `roles` and inserts each `(rol_id, functionality_id)` pair into `rol_funcionalities`. Role `name` uniqueness (`roles_name_key`) is enforced by DB unique constraint. `functionality_ids` may be empty (`[]`) or contain valid UUIDs from `functionalities` (duplicates are deduplicated or rejected).

### Request body

| Field | Type | Rules |
|---|---|---|
| `name` | string | required; non-blank, `1..100` chars (`INVALID_NAME` / `INVALID_FIELD`); must be unique (`MSG-13`) |
| `description` | string | required; non-blank, `1..500` chars (`INVALID_DESCRIPTION`) |
| `functionality_ids` | array of strings | optional; well-formed UUIDs referencing existing rows in `functionalities` (`INVALID_ID` / `MSG-10`) |

**Body format**

```json
{
  "name": "PORTFOLIO_EDITOR",
  "description": "Can create and update portfolio items without delete privileges.",
  "functionality_ids": [
    "01936f8a-aaaa-7d3e-8f2a-1b4c5d6e7f80",
    "01936f8a-bbbb-7d3e-8f2a-1b4c5d6e7f80"
  ]
}
```

### Success

- **`201 Created`** — returns the created role object with its resolved `functionalities` array, matching an entry in `GET /users/administration/roles`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
| `MISSING_FIELD` | `400` | `name` or `description` is absent, `null`, or blank |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type (e.g., `functionality_ids` is not an array or contains non-string elements) or `name` exceeds 100 chars |
| `INVALID_NAME` | `400` | `name` contains control characters or invalid formatting |
| `INVALID_DESCRIPTION` | `400` | `description` exceeds 500 chars |
| `INVALID_ID` | `400` | An entry in `functionality_ids` is not a well-formed identifier |
| `MSG-10` | `404` | One or more `functionality_ids` do not exist in `functionalities` |
| `MSG-13` | `409` | A role with the given `name` already exists (enforced by DB unique constraint) |

---

## 6. Update a Role and Attached Functionalities

**Purpose:** Fully replace an existing role's `name`, `description`, and attached `functionalities`. Requires the `ADMINISTRATOR` feature.
**Method/Path:** `PUT /users/administration/roles/{roleId}`

**Semantics:** full replacement executed atomically in a single transaction. Updates `name` and `description` in `roles`, and overwrites `rol_funcionalities` for `{roleId}` — any functionality omitted from `functionality_ids` is detached, and all supplied `functionality_ids` are attached (`[]` detaches all functionalities). Protected system roles that grant `ADMINISTRATOR` cannot have the `ADMINISTRATOR` functionality detached if doing so would leave the caller without administrative privileges (`403 MSG-5`).

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `roleId` | **yes** | Well-formed UUID identifier of the target role (`INVALID_ID` on malformed format). |

### Request body

| Field | Type | Rules |
|---|---|---|
| `name` | string | required; non-blank, `1..100` chars; must be unique across other roles (`MSG-13`) |
| `description` | string | required; non-blank, `1..500` chars |
| `functionality_ids` | array of strings | required; well-formed UUIDs referencing existing rows in `functionalities` (`[]` allowed) |

**Body format**

```json
{
  "name": "PORTFOLIO_EDITOR",
  "description": "Updated description for portfolio editors.",
  "functionality_ids": [
    "01936f8a-aaaa-7d3e-8f2a-1b4c5d6e7f80"
  ]
}
```

### Success

- **`200 OK`** — returns the updated role object with its attached `functionalities` array.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
| `INVALID_ID` | `400` | `{roleId}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Role `{roleId}` does not exist in `roles` |
| `MISSING_FIELD` | `400` | `name`, `description`, or `functionality_ids` is absent or `null` |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type or `name` exceeds 100 chars |
| `INVALID_NAME` | `400` | `name` is blank or contains control characters |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 500 chars |
| `INVALID_ID` | `400` | An entry in `functionality_ids` is not a well-formed identifier |
| `MSG-10` | `404` | One or more `functionality_ids` do not exist in `functionalities` |
| `MSG-5` | `403` | Attempted to remove `ADMINISTRATOR` from the caller's own role |
| `MSG-13` | `409` | Another role already uses `name` (enforced by DB unique constraint) |

---

## 7. Delete a Role

**Purpose:** Permanently delete a role and detach its functionalities. Requires the `ADMINISTRATOR` feature.
**Method/Path:** `DELETE /users/administration/roles/{roleId}`

**Semantics:** **hard delete.** Removes the role's mappings from `rol_funcionalities` and deletes the row from `roles`.
- **In-use protection:** If any user (`users.rol_id = {roleId}`, including soft-deleted users) is still assigned to `{roleId}`, deletion is rejected with `409 INVALID_FIELD` (or `FK` restriction) — administrators must reassign those users' roles via `PATCH /users/administration/{userId}` before deleting the role.
- **Self-lockout protection:** Roles granting the `ADMINISTRATOR` feature cannot be deleted (`403 MSG-5`).
- No request body is expected — any body sent is ignored.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `roleId` | **yes** | Well-formed UUID identifier of the target role (`INVALID_ID` on malformed format). |

### Success

- **`204 No Content`** — empty body.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
| `INVALID_ID` | `400` | `{roleId}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Role `{roleId}` does not exist in `roles` |
| `MSG-5` | `403` | Role `{roleId}` grants the `ADMINISTRATOR` feature and cannot be deleted |
| `INVALID_FIELD` | `409` | Role `{roleId}` is currently assigned to one or more users in `users` |

There are no body-validation errors: this endpoint accepts no body.

---
## 8. List Functionalities (Excluding `ADMINISTRATOR`)

**Purpose:** Retrieve all available functionalities from `functionalities` except `ADMINISTRATOR` so administrators can view and attach valid permissions when creating or updating roles. Requires the `ADMINISTRATOR` feature.
**Method/Path:** `GET /users/administration/functionalities`

**Semantics:** queries `functionalities` filtering out `name = 'ADMINISTRATOR'`, ordered by `name ASC`. The `ADMINISTRATOR` functionality is strictly excluded so it cannot be discovered or assigned to custom roles through the role management endpoints.

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "01936f8a-aaaa-7d3e-8f2a-1b4c5d6e7f80",
      "name": "PORTFOLIO_CREATE",
      "description": "Can create a new object in the user owns account with this functionality"
    },
    {
      "id": "01936f8a-bbbb-7d3e-8f2a-1b4c5d6e7f80",
      "name": "PORTFOLIO_DELETE",
      "description": "Can delete a user owns object"
    },
    {
      "id": "01936f8a-cccc-7d3e-8f2a-1b4c5d6e7f80",
      "name": "PORTFOLIO_UPDATE",
      "description": "Can edit a object of the user owns account"
    }
  ]
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `MSG-5` | `403` | Authenticated caller does not have the `ADMINISTRATOR` feature |
