## Projects section

In this section the user would add the project he had made.

[Endpoints](./PROJECTS/PROJECTS_ENDPOINTS.md)
[Tables](./PROJECTS/PROJECTS_TABLES.md)

### Functionalities

- List all the projects.
- List just one project by id.
- Create a new project.
- Update a project.
- Delete a project.

---

# Projects Endpoints - Specification

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

## 1. Create a Project

**Purpose:** Create a new project for the user. Only the user who owns the account can create a project, and the user must have the `PORTFOLIO_CREATE` feature.
**Method/Path:** `POST /portfolio/projects`

### Request body

| Field | Type | Rules |
|---|---|---|
| `repository_url` | string | required; non-blank, must be a valid absolute URL, max 2048 chars |
| `website_url` | string | optional; must be a valid absolute URL, max 2048 chars |
| `tag_ids` | array of strings | optional; well-formed UUIDs referencing existing tags; duplicates are deduplicated or rejected |
| `translations` | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language` | string | required; must exist in the languages catalog |
| `translations[].title` | string | required; non-blank, max 255 chars |
| `translations[].description` | string | required; non-blank, max 500 chars |

**Body format**

```json
{
  "repository_url": "https://github.com/username/project-repo",
  "website_url": "https://www.website.com",
  "tag_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Sistema de Gestión de Portafolio",
      "description": "Aplicación web desarrollada con Spring Boot y PostgreSQL."
    },
    {
      "language": "EN",
      "title": "Portfolio Management System",
      "description": "Web application built with Spring Boot and PostgreSQL."
    }
  ]
}
```

### Success

- **`201 Created`**

```json
{
  "id": "9f1c...",
  "repository_url": "https://github.com/username/project-repo",
  "website_url": "https://www.website.com",
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Spring Boot"
    }
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Sistema de Gestión de Portafolio",
      "description": "Aplicación web desarrollada con Spring Boot y PostgreSQL."
    },
    {
      "language": "EN",
      "title": "Portfolio Management System",
      "description": "Web application built with Spring Boot y PostgreSQL."
    }
  ],
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_CREATE` feature |
| `MSG-8` | `400` | `translations` is missing, empty, or not an array |
| `MSG-6` | `400` | A `language` value in `translations[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `translations[]` |
| `MISSING_FIELD` | `400` | A required field (`repository_url`, `language`, `title`, `description`) is absent, `null`, or empty |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type (e.g., `tag_ids` is not an array or contains non-string elements) |
| `INVALID_ID` | `400` | An entry in `tag_ids` is not a well-formed identifier |
| `MSG-14` | `404` | One or more `tag_ids` do not exist in the tags catalog |
| `INVALID_URL` | `400` | `repository_url` or `website_url` (when present) is not a valid absolute URL, or exceeds 2048 chars |
| `INVALID_TITLE` | `400` | `title` is blank or exceeds 255 chars |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 500 chars |

---

## 2. Update a Project

**Purpose:** Fully replace an existing project. Only the owner of the account that owns the project may update it, and the user must have the `PORTFOLIO_UPDATE` feature.
**Method/Path:** `PUT /portfolio/projects/{id}`

**Semantics:** full replacement. `translations` and `tags` are overwritten as a whole — any translation whose `language` is omitted from the payload is removed, and tag associations in `project_tags` are replaced with the supplied `tag_ids` (omitting `tag_ids` or passing `[]` clears all tags).

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed project identifier owned by the caller. |


### Request body

| Field | Type | Rules |
|---|---|---|
| `repository_url` | string | required; non-blank, must be a valid absolute URL, max 2048 chars |
| `website_url` | string | optional; must be a valid absolute URL, max 2048 chars |
| `tag_ids` | array of strings | optional; well-formed UUIDs referencing existing tags |
| `translations` | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language` | string | required; must exist in the languages catalog |
| `translations[].title` | string | required; non-blank, max 255 chars |
| `translations[].description` | string | required; non-blank, max 500 chars |

**Body format**

```json
{
  "repository_url": "https://github.com/username/project-repo",
  "website_url": "https://www.website.com",
  "tag_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Sistema de Gestión de Portafolio v2",
      "description": "Descripción actualizada del proyecto."
    },
    {
      "language": "EN",
      "title": "Portfolio Management System v2",
      "description": "Updated project description."
    }
  ]
}
```

### Success

- **`200 OK`** — returns the updated project object with the same structure as `201 Created`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_UPDATE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Project `{id}` does not exist or is not owned by the caller |
| `MSG-8` | `400` | `translations` is missing, empty, or not an array |
| `MSG-6` | `400` | A `language` value in `translations[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `translations[]` |
| `MISSING_FIELD` | `400` | A required field (`repository_url`, `language`, `title`, `description`) is absent, `null`, or empty |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type |
| `INVALID_ID` | `400` | An entry in `tag_ids` is not a well-formed identifier |
| `MSG-14` | `404` | One or more `tag_ids` do not exist in the tags catalog |
| `INVALID_URL` | `400` | `repository_url` or `website_url` (when present) is not a valid absolute URL, or exceeds 2048 chars |
| `INVALID_TITLE` | `400` | `title` is blank or exceeds 255 chars |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 500 chars |

---

## 3. Delete a Project

**Purpose:** Delete an existing project. Only the owner of the account that owns the project may delete it, and the user must have the `PORTFOLIO_DELETE` feature.
**Method/Path:** `DELETE /portfolio/projects/{id}`

**Hard-delete** the projects are hard deleted in cascade. 

**Idempotency:** repeating the call on an already-deleted project owned by the caller returns `204` again. Ownership is checked against the row *ignoring* `deleted_at`, so a repeat call can distinguish "mine, already gone" (`204`) from "never existed / not mine" (`404`). State never changes after the first call, so the operation is idempotent.

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed project identifier. |


### Success

- **`204 No Content`** — empty body.
- Already-deleted-but-owned → **`204 No Content`** (see Idempotency above).

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_DELETE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Project `{id}` does not exist or was not owned by the caller |

There are no body-validation errors: this endpoint accepts no body.

---

## 4. List Projects by Language

**Purpose:** Publicly list the projects of a given user that have a translation in the requested language, optionally filtered by tag. **No authentication, no feature check** — the endpoint is anonymously accessible, so the portfolio owner is identified in the path rather than by the session.
**Method/Path:** `GET /users/{userId}/portfolio/projects?language={code}`

**Semantics:** the result is an **inner join** between `projects_id` and `projects` (translations) on the requested `language`. A project with no translation in that language is not returned — including one with **zero** translations at all, which can never match any language filter. Each returned item carries **only** the matching translation; other languages are omitted. 

**Empty result is not an error:** a valid user with no matching projects → `200` with `"items": []`, never `404`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Identifier of the user whose portfolio is being read. Must be well-formed (`INVALID_USER_ID` on malformed format). Unknown or soft-deleted user → `404 MSG-4`. |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `language` | **yes** | Language code that must exist in the languages catalog. **Required** — it filters the result set, so defaulting to `"EN"` would silently hide rows. |
| `tag_id` | no | Optional well-formed UUID to filter projects associated in `project_tags`. Unknown tag returns `404 MSG-14`. |
| `limit` | no | Page size, integer `1..100`. Default `20`. |
| `page` | no | 1-based page number, integer `≥ 1`. Default `1`. |
| `sort` | no | `title_asc` (default). Ties broken by `id` for stable pagination. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "9f1c...",
      "repository_url": "https://github.com/username/project-repo",
      "website_url": "https://www.website.com",
      "tags": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "Spring Boot"
        }
      ],
      "translation": {
        "language": "ES",
        "title": "Sistema de Gestión de Portafolio",
        "description": "Aplicación web desarrollada con Spring Boot y PostgreSQL."
      }
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

| Header | Notes |
|---|---|
| `Cache-Control` | `public, max-age=60` — safe because the response depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |
| `INVALID_ID` | `400` | `tag_id` query parameter is present but not a well-formed identifier |
| `MSG-14` | `404` | `tag_id` is not present in the tags catalog |
| `INVALID_QUERY_PARAM` | `400` | `limit`, `page` or `sort` is present but malformed or out of range |

---

## 5. Get a Project by ID

**Purpose:** Publicly fetch a single project of a given user, as seen in the requested language. **No authentication, no feature check** — the portfolio owner is identified in the path, not by the session.
**Method/Path:** `GET /users/{userId}/portfolio/projects/{id}?language={code}`

**Semantics:** returns the project **only if** it has a translation in the requested `language` — the resource being addressed is "this project as rendered in language X". A project with no translation in that language (including one with **zero** translations) is treated as not found. Only the matching translation is included; other languages are omitted. Projects of a soft-deleted user are excluded.

**`404` is not "hidden by accident":** a project that exists but lacks the requested language returns the *same* `404 MSG-10` as a project that doesn't exist at all.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Owner of the portfolio. Must be well-formed (`INVALID_USER_ID` on malformed format). Unknown or soft-deleted user → `404 MSG-4`. |
| `id` | **yes** | Project identifier. Must be well-formed (`INVALID_ID` on malformed format). |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `language` | **yes** | Language code that must exist in the languages catalog. **Required** — it selects which translation the response is built from, so there is no sensible default. |

### Success

- **`200 OK`**

```json
{
  "id": "9f1c...",
  "repository_url": "https://github.com/username/project-repo",
  "website_url": "https://www.website.com",
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Spring Boot"
    }
  ],
  "translation": {
    "language": "ES",
    "title": "Sistema de Gestión de Portafolio",
    "description": "Aplicación web desarrollada con Spring Boot y PostgreSQL."
  }
}
```

The object shape is **identical to one `items[]` entry** of `GET /users/{userId}/portfolio/projects`. Same serializer, same fields — the list endpoint simply wraps N of these.

### Response headers

| Header | Notes |
|---|---|
| `Cache-Control` | `public, max-age=60` — depends only on path + query, not on the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `INVALID_ID` | `400` | `id` in the path is not a well-formed identifier |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Project `{id}` does not exist, belongs to another user, or has **no translation in `language`** |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |
