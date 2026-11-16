# Contributions Endpoints - Specification

## Conventions

- **Content type:** `application/json` for request/response bodies.
- **Auth cookies:** `accessToken` and `refreshToken` are set as `HTTPOnly`, `Secure`, `SameSite=Strict` (or `Lax` if cross-site flows are needed), with `Path=/`.
- **Token lifetimes:** `accessToken` short-lived (e.g. 15 min), `refreshToken` long-lived (e.g. 7 days). _(Values TBD.)_
- **Uniqueness checks** must be enforced by **DB unique constraints**, not only by a pre-check — a "check then insert" is racy. Pre-checks are for returning friendly error codes; the constraint is the source of truth.
- **All error responses** return a body like `{ "code": "MSG-N", "message": "..." }`.
- Passwords are hashed (e.g. Argon2/bcrypt) before persistence; plaintext is never stored or logged.

In this section we are describing the endpoints required for the module also the transversal functionalities required for achieving the tasks.

## Transversal Functionalities

[Exceptions](../../exceptions/Exceptions.md)
[Features](../../FEATURES.md)

---

## 1. Create a Contribution

**Purpose:** Create a new contribution for the user. Only the user who owns the account can create a contribution, and the user must have the `PORTFOLIO_CREATE` feature.
**Method/Path:** `POST /portfolio/contributions`

### Request body

| Field                        | Type             | Rules                                                  |
| ---------------------------- | ---------------- | ------------------------------------------------------ |
| `project_url`                | string           | optional; must be a valid absolute URL, max 2048 chars |
| `pull_request_url`           | string           | optional; must be a valid absolute URL, max 2048 chars |
| `translations`               | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language`    | string           | required; must exist in the languages catalog          |
| `translations[].title`       | string           | required; non-blank, max 255 chars                     |
| `translations[].description` | string           | required; non-blank, max 500 chars                     |

**Body format**

```json
{
  "project_url": "[https://github.com/organization/open-source-repo](https://github.com/organization/open-source-repo)",
  "pull_request_url": "[https://github.com/organization/open-source-repo/pull/42](https://github.com/organization/open-source-repo/pull/42)",
  "translations": [
    {
      "language": "ES",
      "title": "Corrección de concurrencia en el pool de conexiones",
      "description": "Se resolvió una condición de carrera durante el cierre de transacciones."
    },
    {
      "language": "EN",
      "title": "Fix connection pool concurrency issue",
      "description": "Resolved a race condition during transaction teardown."
    }
  ]
}
```

### Success

- **`201 Created`**

```json
{
  "id": "9f1c...",
  "project_url": "[https://github.com/organization/open-source-repo](https://github.com/organization/open-source-repo)",
  "pull_request_url": "[https://github.com/organization/open-source-repo/pull/42](https://github.com/organization/open-source-repo/pull/42)",
  "translations": [
    {
      "language": "ES",
      "title": "Corrección de concurrencia en el pool de conexiones",
      "description": "Se resolvió una condición de carrera durante el cierre de transacciones."
    },
    {
      "language": "EN",
      "title": "Fix connection pool concurrency issue",
      "description": "Resolved a race condition during transaction teardown."
    }
  ],
  "created_at": "2026-11-16T15:10:00Z",
  "updated_at": "2026-11-16T15:10:00Z"
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code                     |  HTTP | Condition                                                                                             |
| ------------------------ | ----: | ----------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json`                                                       |
| `UNAUTHORIZED`           | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner                         |
| `MSG-5`                  | `403` | Authenticated user does not have the `PORTFOLIO_CREATE` feature                                       |
| `MSG-8`                  | `400` | `translations` is missing, empty, or not an array                                                     |
| `MSG-6`                  | `400` | A `language` value in `translations[]` does not exist in the database                                 |
| `MSG-7`                  | `400` | The same `language` appears more than once in `translations[]`                                        |
| `MISSING_FIELD`          | `400` | A required field (`language`, `title`, `description`) is absent, `null`, or empty                     |
| `INVALID_FIELD`          | `400` | A field has an invalid JSON type                                                                      |
| `INVALID_URL`            | `400` | `project_url` or `pull_request_url` (when present) is not a valid absolute URL, or exceeds 2048 chars |
| `INVALID_TITLE`          | `400` | `title` is blank or exceeds 255 chars                                                                 |
| `INVALID_DESCRIPTION`    | `400` | `description` is blank or exceeds 500 chars                                                           |

---

## 2. Update a Contribution

**Purpose:** Fully replace an existing contribution. Only the owner of the account that owns the contribution may update it, and the user must have the `PORTFOLIO_UPDATE` feature.
**Method/Path:** `PUT /portfolio/contributions/{id}`

**Semantics:** full replacement. `translations` is overwritten as a whole — any translation whose `language` is omitted from the payload is permanently deleted from `contributions`.

### URL parameters

| Name | Required | Rules                                                                    |
| ---- | -------- | ------------------------------------------------------------------------ |
| `id` | yes      | Path parameter. Well-formed contribution identifier owned by the caller. |

### Request body

| Field                        | Type             | Rules                                                  |
| ---------------------------- | ---------------- | ------------------------------------------------------ |
| `project_url`                | string           | optional; must be a valid absolute URL, max 2048 chars |
| `pull_request_url`           | string           | optional; must be a valid absolute URL, max 2048 chars |
| `translations`               | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language`    | string           | required; must exist in the languages catalog          |
| `translations[].title`       | string           | required; non-blank, max 255 chars                     |
| `translations[].description` | string           | required; non-blank, max 500 chars                     |

**Body format**

```json
{
  "project_url": "[https://github.com/organization/open-source-repo](https://github.com/organization/open-source-repo)",
  "pull_request_url": "[https://github.com/organization/open-source-repo/pull/42](https://github.com/organization/open-source-repo/pull/42)",
  "translations": [
    {
      "language": "ES",
      "title": "Corrección de concurrencia en el pool de conexiones v2",
      "description": "Descripción actualizada de la contribución."
    },
    {
      "language": "EN",
      "title": "Fix connection pool concurrency issue v2",
      "description": "Updated contribution description."
    }
  ]
}
```

### Success

- **`200 OK`** — returns the updated contribution object with the same structure as `201 Created`.

### Errors

Evaluated in this order; the first failure is returned.

| Code                     |  HTTP | Condition                                                                                             |
| ------------------------ | ----: | ----------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json`                                                       |
| `UNAUTHORIZED`           | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner                         |
| `MSG-5`                  | `403` | Authenticated user does not have the `PORTFOLIO_UPDATE` feature                                       |
| `INVALID_ID`             | `400` | `{id}` in the path is not a well-formed identifier                                                    |
| `MSG-10`                 | `404` | Contribution `{id}` does not exist or is not owned by the caller                                      |
| `MSG-11`                 | `412` | `If-Match` header supplied and does not match the current `updated_at` (concurrent modification)      |
| `MSG-8`                  | `400` | `translations` is missing, empty, or not an array                                                     |
| `MSG-6`                  | `400` | A `language` value in `translations[]` does not exist in the database                                 |
| `MSG-7`                  | `400` | The same `language` appears more than once in `translations[]`                                        |
| `MISSING_FIELD`          | `400` | A required field (`language`, `title`, `description`) is absent, `null`, or empty                     |
| `INVALID_FIELD`          | `400` | A field has an invalid JSON type                                                                      |
| `INVALID_URL`            | `400` | `project_url` or `pull_request_url` (when present) is not a valid absolute URL, or exceeds 2048 chars |
| `INVALID_TITLE`          | `400` | `title` is blank or exceeds 255 chars                                                                 |
| `INVALID_DESCRIPTION`    | `400` | `description` is blank or exceeds 500 chars                                                           |

---

## 3. Delete a Contribution

**Purpose:** Permanently delete an existing contribution. Only the owner of the account that owns the contribution may delete it, and the user must have the `PORTFOLIO_DELETE` feature.
**Method/Path:** `DELETE /portfolio/contributions/{id}`

**Semantics:** **hard delete.** Permanently removes the row from `contributions_id` and cascades the physical deletion (`ON DELETE CASCADE`) to all associated rows in `contributions`. No request body is expected — any body sent is ignored.

**Non-idempotent 404 after deletion:** because hard delete permanently removes the record from the database, repeating `DELETE /portfolio/contributions/{id}` after a successful deletion cannot distinguish a previously deleted row from a never-existed row and returns `404 MSG-10`.

### URL parameters

| Name | Required | Rules                                                |
| ---- | -------- | ---------------------------------------------------- |
| `id` | yes      | Path parameter. Well-formed contribution identifier. |

### Success

- **`204 No Content`** — empty body.

### Errors

Evaluated in this order; the first failure is returned.

| Code           |  HTTP | Condition                                                                                 |
| -------------- | ----: | ----------------------------------------------------------------------------------------- |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner             |
| `MSG-5`        | `403` | Authenticated user does not have the `PORTFOLIO_DELETE` feature                           |
| `INVALID_ID`   | `400` | `{id}` in the path is not a well-formed identifier                                        |
| `MSG-10`       | `404` | Contribution `{id}` does not exist or is not owned by the caller                          |
| `MSG-11`       | `412` | `If-Match` supplied and does not match the current `updated_at` (concurrent modification) |

There are no body-validation errors: this endpoint accepts no body.

---

## 4. List Contributions by Language

**Purpose:** Publicly list the contributions of a given user that have a translation in the requested language. **No authentication, no feature check** — the endpoint is anonymously accessible, so the portfolio owner is identified in the path rather than by the session.
**Method/Path:** `GET /users/{userId}/portfolio/contributions?language={code}`

**Semantics:** the result is an **inner join** between `contributions_id` and `contributions` (translations) on the requested `language`. A contribution with no translation in that language is not returned — including one with **zero** translations at all, which can never match any language filter. Each returned item carries **only** the matching translation; other languages are omitted.

**Empty result is not an error:** a valid user with no matching contributions → `200` with `"items": []`, never `404`.

### Path parameters

| Name     | Required | Rules                                                                                                                                                          |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userId` | **yes**  | Identifier of the user whose portfolio is being read. Must be well-formed (`INVALID_USER_ID` on malformed format). Unknown or soft-deleted user → `404 MSG-4`. |

### Query parameters

| Name       | Required | Rules                                                                                                                                               |
| ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `language` | **yes**  | Language code that must exist in the languages catalog. **Required** — it filters the result set, so defaulting to `"EN"` would silently hide rows. |
| `limit`    | no       | Page size, integer `1..100`. Default `20`.                                                                                                          |
| `page`     | no       | 1-based page number, integer `≥ 1`. Default `1`.                                                                                                    |
| `sort`     | no       | `created_at_desc` (default) \| `created_at_asc` \| `title_asc`. Ties broken by `id` for stable pagination.                                          |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "9f1c...",
      "project_url": "[https://github.com/organization/open-source-repo](https://github.com/organization/open-source-repo)",
      "pull_request_url": "[https://github.com/organization/open-source-repo/pull/42](https://github.com/organization/open-source-repo/pull/42)",
      "translation": {
        "language": "ES",
        "title": "Corrección de concurrencia en el pool de conexiones",
        "description": "Se resolvió una condición de carrera durante el cierre de transacciones."
      },
    }
  ],
  "meta": {
    "userId": "3a7e...",
    "language": "ES",
    "page": 1,
    "limit": 20,
    "total": 1,
  }
}
```

### Response headers

| Header          | Notes                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `Cache-Control` | `public, max-age=60` — safe because the response depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code                  |  HTTP | Condition                                                          |
| --------------------- | ----: | ------------------------------------------------------------------ |
| `INVALID_USER_ID`     | `400` | `userId` in the path is not a well-formed identifier               |
| `MSG-4`               | `404` | User `{userId}` does not exist or is soft-deleted                  |
| `MISSING_FIELD`       | `400` | `language` query parameter absent or empty                         |
| `MSG-6`               | `400` | `language` is not present in the languages catalog                 |
| `INVALID_QUERY_PARAM` | `400` | `limit`, `page` or `sort` is present but malformed or out of range |

---

## 5. Get a Contribution by ID

**Purpose:** Publicly fetch a single contribution of a given user, as seen in the requested language. **No authentication, no feature check** — the portfolio owner is identified in the path, not by the session.
**Method/Path:** `GET /users/{userId}/portfolio/contributions/{id}?language={code}`

**Semantics:** returns the contribution **only if** it has a translation in the requested `language` — the resource being addressed is "this contribution as rendered in language X". A contribution with no translation in that language (including one with **zero** translations) is treated as not found. Only the matching translation is included; other languages are omitted. Contributions belonging to a soft-deleted user are excluded.

**`404` is not "hidden by accident":** a contribution that exists but lacks the requested language returns the _same_ `404 MSG-10` as a contribution that doesn't exist at all.

### Path parameters

| Name     | Required | Rules                                                                                                                            |
| -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `userId` | **yes**  | Owner of the portfolio. Must be well-formed (`INVALID_USER_ID` on malformed format). Unknown or soft-deleted user → `404 MSG-4`. |
| `id`     | **yes**  | Contribution identifier. Must be well-formed (`INVALID_ID` on malformed format).                                                 |

### Query parameters

| Name       | Required | Rules                                                                                                                                                            |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `language` | **yes**  | Language code that must exist in the languages catalog. **Required** — it selects which translation the response is built from, so there is no sensible default. |

### Success

- **`200 OK`**

```json
{
  "id": "9f1c...",
  "project_url": "[https://github.com/organization/open-source-repo](https://github.com/organization/open-source-repo)",
  "pull_request_url": "[https://github.com/organization/open-source-repo/pull/42](https://github.com/organization/open-source-repo/pull/42)",
  "translation": {
    "language": "ES",
    "title": "Corrección de concurrencia en el pool de conexiones",
    "description": "Se resolvió una condición de carrera durante el cierre de transacciones."
  },
}
```

The object shape is **identical to one `items[]` entry** of `GET /users/{userId}/portfolio/contributions`. Same serializer, same fields — the list endpoint simply wraps N of these.

### Response headers

| Header          | Notes                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| `Cache-Control` | `public, max-age=60` — depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code              |  HTTP | Condition                                                                                            |
| ----------------- | ----: | ---------------------------------------------------------------------------------------------------- |
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier                                                 |
| `INVALID_ID`      | `400` | `id` in the path is not a well-formed identifier                                                     |
| `MSG-4`           | `404` | User `{userId}` does not exist or is soft-deleted                                                    |
| `MSG-10`          | `404` | Contribution `{id}` does not exist, belongs to another user, or has **no translation in `language`** |
| `MISSING_FIELD`   | `400` | `language` query parameter absent or empty                                                           |
| `MSG-6`           | `400` | `language` is not present in the languages catalog                                                   |

---

# Contributions Tables

```sql
CREATE TABLE IF NOT EXISTS "contributions_id" (
    "id" UUID NOT NULL,
    "project_url" VARCHAR(2048),
    "pull_request_url" VARCHAR(2048),
    PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "contributions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "language_id" UUID NOT NULL,
    PRIMARY KEY("id", "language_id")
);
```
