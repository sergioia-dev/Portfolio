# Experiences Endpoints - Specification

## Conventions

- **Content type:** `application/json` for request/response bodies.
- **Auth cookies:** `accessToken` and `refreshToken` are set as `HTTPOnly`, `Secure`, `SameSite=Strict` (or `Lax` if cross-site flows are needed), with `Path=/`.
- **Token lifetimes:** `accessToken` short-lived (e.g. 15 min), `refreshToken` long-lived (e.g. 7 days). *(Values TBD.)*
- **Uniqueness checks** must be enforced by **DB unique constraints**, not only by a pre-check — a "check then insert" is racy. Pre-checks are for returning friendly error codes; the constraint is the source of truth.
- **All error responses** return a body like `{ "code": "MSG-N", "message": "..." }`.
- Passwords are hashed (e.g. Argon2/bcrypt) before persistence; plaintext is never stored or logged.


In this section we are describing the endpoints required for the module also the transversal funcionalities required for achieving the tasks.

## Transversal Functionalities

[Exceptions](../../exceptions/Exceptions.md)
[Features](../../FEATURES.md)

## 1. Create a Experience

**Purpose:** Create a new experience for the user, only the user who owns the account can create one experience, also the user require to have the feature 'PORTFOLIO_CREATE'  
**Method/Path:** `POST /portfolio/experiences`

### Request body

| Field | Type | Rules |
|---|---|---|
| `website_url` | string | optional must be a valid URL |
| `start_date` | string |  required and must follow the format YYYY-MM-DD| 
| `end_date` | string | optional and must follow the format YYYY-MM-DD |
| `translations` | list of objects | at least one object not duplicated language |
| `language` |  string | required  and must exist in the database|
| `title` |  string | required|
| `description` |  string | required|

**Body format**

```json
{
    "website_url" : "https://www.website.com",
    "start_date" : "YYYY-MM-DD",
    "end_date" : "YYYY-MM-DD",
    "translations" : [
    {
    "language" : "one language per entry ("ES", "EN"),
    "title" :  "",
    "description" :  "",
    },
    ]
}
```

### Success
- **`201 Created`** .

### Errors

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_CREATE` feature |
| `MSG-6` | `400` | A `language` value in `experiences[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `experiences[]` |
| `MSG-8` | `400` | `experiences` is missing, empty, or not an array |
| `MSG-9` | `400` | `end_date` is earlier than `start_date` |
| `INVALID_URL` | `400` | `website_url` is present but is not a valid URL (or > 2048 chars) |
| `INVALID_DATE_FORMAT` | `400` | `start_date` / `end_date` not in `YYYY-MM-DD`, or not a real calendar date (e.g. `2024-02-30`) |
| `MISSING_FIELD` | `400` | A required field (`start_date`, `language`, `title`, …) is absent or empty |
| `INVALID_TITLE` | `400` | `title` empty/blank or exceeds max lenght|
| `INVALID_DESCRIPTION` | `400` | `description` empty/blank or exceeds max length  |

---
## 2. Update a Experience

**Purpose:** Fully replace an existing experience. Only the owner of the account that owns the experience may update it, and the user must have the feature `PORTFOLIO_UPDATE`.
**Method/Path:** `PUT /portfolio/experiences/{id}`

**Semantics:** full replacement. `translations` is overwritten as a whole — any translation whose `language` is omitted from the payload is removed. . 

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed experience identifier owned by the caller. |


### Request body

| Field | Type | Rules |
|---|---|---|
| `website_url` | string | optional; must be a valid absolute URL, max 2048 chars |
| `start_date` | string | required; `YYYY-MM-DD`, real calendar date |
| `end_date` | string | optional; `YYYY-MM-DD`, real calendar date; must be ≥ `start_date` |
| `translations` | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language` | string | required; must exist in the languages catalog |
| `translations[].title` | string | required; non-blank , max 100 chars |
| `translations[].description` | string | required; non-blank, max 1000 chars |

**Body format**

```json
{
  "website_url": "https://www.website.com",
  "start_date": "2021-03-01",
  "end_date": "2023-11-30",
  "translations": [
    {
      "language": "ES",
      "title": "Ingeniero de Software",
      "description": "Descripción del puesto."
    },
    {
      "language": "EN",
      "title": "Software Engineer",
      "description": "Role description."
    }
  ]
}
```

### Success

- **`200 OK`** 

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_UPDATE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Experience `{id}` does not exist, is soft-deleted, or is not owned by the caller |
| `MSG-6` | `400` | A `language` value in `translations[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `translations[]` |
| `MSG-8` | `400` | `translations` is missing, empty, or not an array |
| `MSG-9` | `400` | `end_date` is earlier than `start_date` |
| `MISSING_FIELD` | `400` | A required field (`start_date`, `language`, `title`, `description`) is absent, `null`, or empty |
| `INVALID_URL` | `400` | `website_url` is present but is not a valid absolute URL, or exceeds 2048 chars |
| `INVALID_DATE_FORMAT` | `400` | `start_date` / `end_date` not in `YYYY-MM-DD`, or not a real calendar date (e.g. `2024-02-30`) |
| `INVALID_TITLE` | `400` | `title` is blank or exceeds 120 chars |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 2000 chars |


## 3. Delete a Experience

**Purpose:** Delete an existing experience. Only the owner of the account that owns the experience may delete it, and the user must have the feature `PORTFOLIO_DELETE`.
**Method/Path:** `DELETE /portfolio/experiences/{id}`

**Semantics:** **soft delete.** Sets `deleted_at`; the row is excluded from every read path (`GET`, list, and all Update validations). A retention job hard-deletes rows past the retention window. Deleting cascades to the experience's `translations` (same soft-delete timestamp). No request body is expected — any body sent is ignored.

**Idempotency:** repeating the call on an already-deleted experience owned by the caller returns `204` again. Ownership is checked against the row *ignoring* `deleted_at`, so a repeat call can distinguish "mine, already gone" (`204`) from "never existed / not mine" (`404`). State never changes after the first call, so the operation is idempotent.

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed experience identifier. |

### Headers

| Header | Required | Rules |
|---|---|---|

### Success

- **`204 No Content`** — empty body`.
- Already-deleted-but-owned → **`204 No Content`** (see Idempotency above).

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_DELETE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Experience `{id}` never existed, or was not owned by the caller |
| `MSG-11` | `412` | `If-Match` supplied and does not match the current `updated_at` (concurrent modification) |

There are no body-validation errors: this endpoint accepts no body.

## 4. List Experiences by Language

**Purpose:** Publicly list the experiences of a given user that have a translation in the requested language. **No authentication, no feature check** — the endpoint is anonymously accessible, so the portfolio owner is identified in the path rather than by the session.
**Method/Path:** `GET /users/{userId}/portfolio/experiences?language={code}`

**Semantics:** the result is an **inner join** between the user's experiences and their translations on the requested `language`. An experience with no translation in that language is not returned — including one with **zero** translations at all, which can never match any language filter. Each returned item carries **only** the matching translation; other languages are omitted. Soft-deleted experiences (`deleted_at IS NOT NULL`) are excluded, as are experiences of a soft-deleted user.

**Empty result is not an error:** a valid user with no matching experiences → `200` with `"items": []`, never `404`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Identifier of the user whose portfolio is being read. Must be well-formed. Unknown or soft-deleted user → `404 MSG-4`. |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `language` | **yes** | Language code that must exist in the languages catalog. **Required** — it filters the result set, so defaulting to `"EN"` would silently hide rows. |
| `limit` | no | Page size, integer `1..100`. Default `20`. |
| `page` | no | 1-based page number, integer `≥ 1`. Default `1`. |
| `sort` | no | `start_date_desc` (default) \| `start_date_asc` \| `created_at_desc`. Ties broken by `id` for stable pagination. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "9f1c...",
      "website_url": "https://www.website.com",
      "start_date": "2021-03-01",
      "end_date": "2023-11-30",
      "translation": {
        "language": "ES",
        "title": "Ingeniero de Software",
        "description": "Descripción del puesto."
      },
      "created_at": "2024-01-10T12:00:00Z",
      "updated_at": "2026-11-14T09:31:07Z"
    }
  ],
  "meta": {
    "userId": "3a7e...",
    "language": "ES",
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

### Response headers

| Header | Notes |
|---|---|
| `Cache-Control` | `public, max-age=60` — safe because the response depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |
| `INVALID_QUERY_PARAM` | `400` | `limit`, `page` or `sort` is present but malformed or out of range |

`UNAUTHORIZED` and `MSG-5` no longer apply and must be removed from this endpoint's table. No new exception codes are introduced — `INVALID_ID`, `MSG-4`, `MISSING_FIELD`, `MSG-6` and `INVALID_QUERY_PARAM` all already exist.

## 5. Get a Experience by ID

**Purpose:** Publicly fetch a single experience of a given user, as seen in the requested language. **No authentication, no feature check** — the portfolio owner is identified in the path, not by the session.
**Method/Path:** `GET /users/{userId}/portfolio/experiences/{id}?language={code}`

**Semantics:** returns the experience **only if** it has a translation in the requested `language` — the resource being addressed is "this experience as rendered in language X". An experience with no translation in that language (including one with **zero** translations) is treated as not found. Only the matching translation is included; other languages are omitted. Soft-deleted experiences (`deleted_at IS NOT NULL`) and experiences of a soft-deleted user are excluded.

**`404` is not "hidden by accident":** an experience that exists but lacks the requested language returns the *same* `404 MSG-10` as an experience that doesn't exist at all. That is deliberate — see notes.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Owner of the portfolio. Must be well-formed. Unknown or soft-deleted user → `404 MSG-4`. |
| `id` | **yes** | Experience identifier. Must be well-formed. |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `language` | **yes** | Language code that must exist in the languages catalog. **Required** — it selects which translation the response is built from, so there is no sensible default. |

No `limit` / `page` / `sort` — this endpoint returns exactly one object, so `INVALID_QUERY_PARAM` does not apply here.

### Success

- **`200 OK`**

```json
{
  "id": "9f1c...",
  "website_url": "https://www.website.com",
  "start_date": "2021-03-01",
  "end_date": "2023-11-30",
  "translation": {
    "language": "ES",
    "title": "Ingeniero de Software",
    "description": "Descripción del puesto."
  },
  "created_at": "2024-01-10T12:00:00Z",
  "updated_at": "2026-11-14T09:31:07Z"
}
```

The object shape is **identical to one `items[]` entry** of `GET /users/{userId}/portfolio/experiences`. Same serializer, same fields — the list endpoint simply wraps N of these. Do not let the two drift.

### Response headers

| Header | Notes |
|---|---|
| `Cache-Control` | `public, max-age=60` — depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_ID` | `400` | `userId` or `id` in the path is not a well-formed identifier (the message names which) |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Experience `{id}` does not exist, is soft-deleted, belongs to another user, or has **no translation in `language`** |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |

`UNAUTHORIZED` and `MSG-5` do not apply and must not appear in this table. **No new exception codes** — `INVALID_ID`, `MSG-4`, `MSG-10`, `MISSING_FIELD` and `MSG-6` are all reused.

