# Articles Endpoints - Specification

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

## 1. Create an Article

**Purpose:** Create a new article for the authenticated user. Only the user who owns the account can create an article, and the user must have the `ARTICLE_CREATE` feature.
**Method/Path:** `POST /portfolio/articles`

**Semantics:** executed atomically inside a single database transaction. Inserts the parent row into `articles_id` (`user_id` resolved from `accessToken`, `is_deleted = FALSE`, `deleted_at = NULL`), associates tags in `article_tags`, and for each entry in `translations[]` converts `raw_markdown` (received as a UTF-8 JSON string) into sanitized `rendered_html` on the server before inserting into `articles` with `updated_at = CURRENT_TIMESTAMP`. Clients never supply `rendered_html` directly.

### Request body

| Field | Type | Rules |
|---|---|---|
| `tag_ids` | array of strings | optional; well-formed UUIDs referencing existing tags in `tags` (`INVALID_ID` / `MSG-14`); duplicates are deduplicated or rejected |
| `translations` | array of objects | required; at least one entry (`MSG-8`); no duplicated `language` (`MSG-7`) |
| `translations[].language` | string | required; must exist in the languages catalog (`MSG-6`) |
| `translations[].title` | string | required; non-blank, max 100 chars (`INVALID_TITLE`) |
| `translations[].description` | string | required; non-blank, max 500 chars (`INVALID_DESCRIPTION`) |
| `translations[].raw_markdown` | string | required; non-blank Markdown source passed as a JSON string (`MISSING_FIELD` / `INVALID_FIELD`) |

**Body format**

```json
{
  "tag_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Pre-renderizado de Markdown en PostgreSQL",
      "description": "Arquitectura para compilar y cachear artículos técnicos en el backend.",
      "raw_markdown": "# Introducción\n\nEste artículo explica cómo pre-renderizar **Markdown** a HTML seguro."
    },
    {
      "language": "EN",
      "title": "Pre-rendering Markdown in PostgreSQL",
      "description": "Architecture for compiling and caching technical articles in the backend.",
      "raw_markdown": "# Introduction\n\nThis article explains how to pre-render **Markdown** into sanitized HTML."
    }
  ]
}
```

### Success

- **`201 Created`**

```json
{
  "id": "9f1c...",
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "PostgreSQL"
    }
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Pre-renderizado de Markdown en PostgreSQL",
      "description": "Arquitectura para compilar y cachear artículos técnicos en el backend.",
      "raw_markdown": "# Introducción\n\nEste artículo explica cómo pre-renderizar **Markdown** a HTML seguro.",
      "rendered_html": "<h1>Introducción</h1>\n<p>Este artículo explica cómo pre-renderizar <strong>Markdown</strong> a HTML seguro.</p>",
      "updated_at": "2026-11-17T16:00:00Z"
    },
    {
      "language": "EN",
      "title": "Pre-rendering Markdown in PostgreSQL",
      "description": "Architecture for compiling and caching technical articles in the backend.",
      "raw_markdown": "# Introduction\n\nThis article explains how to pre-render **Markdown** into sanitized HTML.",
      "rendered_html": "<h1>Introduction</h1>\n<p>This article explains how to pre-render <strong>Markdown</strong> into sanitized HTML.</p>",
      "updated_at": "2026-11-17T16:00:00Z"
    }
  ]
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `ARTICLE_CREATE` feature |
| `MSG-8` | `400` | `translations` is missing, empty, or not an array |
| `MSG-6` | `400` | A `language` value in `translations[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `translations[]` |
| `MISSING_FIELD` | `400` | A required field (`language`, `title`, `description`, `raw_markdown`) is absent, `null`, or blank |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type (e.g., `tag_ids` is not an array, `raw_markdown` is not a string) |
| `INVALID_ID` | `400` | An entry in `tag_ids` is not a well-formed identifier |
| `MSG-14` | `404` | One or more `tag_ids` do not exist in the tags catalog |
| `INVALID_TITLE` | `400` | `title` is blank or exceeds 100 chars |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 500 chars |

---

## 2. Update an Article

**Purpose:** Fully replace an existing article's translations and tags. Only the owner of the account that owns the article may update it, and the user must have the `ARTICLE_UPDATE` feature.
**Method/Path:** `PUT /portfolio/articles/{id}`

**Semantics:** full replacement executed atomically in a single transaction.
- Only active articles (`is_deleted = FALSE` AND `deleted_at IS NULL`) owned by the caller can be updated; soft-deleted articles or articles owned by another user return `404 MSG-10`.
- `translations` is overwritten as a whole: any translation in `articles` whose `language` is omitted from the payload is deleted; for retained languages, if `raw_markdown` changed compared to the stored row, `rendered_html` is re-compiled and `updated_at` is bumped to `CURRENT_TIMESTAMP` (unchanged translations preserve their existing `rendered_html` and `updated_at`).
- Tag associations in `article_tags` are replaced with the supplied `tag_ids` (omitting `tag_ids` or passing `[]` clears all tags).

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed article identifier owned by the caller. |

### Headers

| Header | Required | Rules |
|---|---|---|
| `If-Match` | no | Optional optimistic concurrency check against the article translation's latest `updated_at` timestamp. |

### Request body

| Field | Type | Rules |
|---|---|---|
| `tag_ids` | array of strings | optional; well-formed UUIDs referencing existing tags |
| `translations` | array of objects | required; at least one entry; no duplicated `language` |
| `translations[].language` | string | required; must exist in the languages catalog |
| `translations[].title` | string | required; non-blank, max 100 chars |
| `translations[].description` | string | required; non-blank, max 500 chars |
| `translations[].raw_markdown` | string | required; non-blank Markdown source passed as a JSON string |

**Body format**

```json
{
  "tag_ids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "translations": [
    {
      "language": "ES",
      "title": "Pre-renderizado de Markdown en PostgreSQL (Actualizado)",
      "description": "Versión revisada con estrategias de invalidación de caché HTTP.",
      "raw_markdown": "# Introducción\n\nContenido actualizado en **Markdown**."
    },
    {
      "language": "EN",
      "title": "Pre-rendering Markdown in PostgreSQL (Updated)",
      "description": "Revised version covering HTTP cache invalidation strategies.",
      "raw_markdown": "# Introduction\n\nUpdated **Markdown** content."
    }
  ]
}
```

### Success

- **`200 OK`** — returns the updated article object with the same structure as `201 Created`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `ARTICLE_UPDATE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Article `{id}` does not exist, is soft-deleted (`is_deleted = TRUE`), or is not owned by the caller |
| `MSG-11` | `412` | `If-Match` header supplied and does not match the current `updated_at` (concurrent modification) |
| `MSG-8` | `400` | `translations` is missing, empty, or not an array |
| `MSG-6` | `400` | A `language` value in `translations[]` does not exist in the database |
| `MSG-7` | `400` | The same `language` appears more than once in `translations[]` |
| `MISSING_FIELD` | `400` | A required field (`language`, `title`, `description`, `raw_markdown`) is absent, `null`, or blank |
| `INVALID_FIELD` | `400` | A field has an invalid JSON type |
| `INVALID_ID` | `400` | An entry in `tag_ids` is not a well-formed identifier |
| `MSG-14` | `404` | One or more `tag_ids` do not exist in the tags catalog |
| `INVALID_TITLE` | `400` | `title` is blank or exceeds 100 chars |
| `INVALID_DESCRIPTION` | `400` | `description` is blank or exceeds 500 chars |

---

## 3. Delete an Article

**Purpose:** Soft delete an existing article. Only the owner of the account that owns the article may delete it, and the user must have the `ARTICLE_DELETE` feature.
**Method/Path:** `DELETE /portfolio/articles/{id}`

**Semantics:** **soft delete.** Sets `is_deleted = TRUE` and `deleted_at = CURRENT_TIMESTAMP` on `articles_id` so the article remains stored in the database while being excluded from every public and owner read/update path (`GET`, list, comments endpoints, and `PUT` validations). Tag usage checks (`MSG-15`) ignore soft-deleted articles (`is_deleted = TRUE`). A retention job permanently purges rows past the retention window. No request body is expected — any body sent is ignored.

**Idempotency:** repeating `DELETE /portfolio/articles/{id}` on an already soft-deleted article owned by the caller returns `204 No Content` again. Ownership is checked against `articles_id.user_id` *ignoring* `is_deleted`/`deleted_at`, so repeat calls distinguish "mine, already soft-deleted" (`204`) from "never existed / not mine" (`404`). State never changes after the first call, so the operation is idempotent.

### URL parameters

| Name | Required | Rules |
|---|---|---|
| `id` | yes | Path parameter. Well-formed article identifier. |

### Headers

| Header | Required | Rules |
|---|---|---|
| `If-Match` | no | Optional optimistic concurrency check against the article's current `updated_at` timestamp. |

### Success

- **`204 No Content`** — empty body.
- Already-soft-deleted-but-owned → **`204 No Content`** (see Idempotency above).

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `ARTICLE_DELETE` feature |
| `INVALID_ID` | `400` | `{id}` in the path is not a well-formed identifier |
| `MSG-10` | `404` | Article `{id}` never existed, or was not owned by the caller |
| `MSG-11` | `412` | `If-Match` supplied and does not match the current `updated_at` (concurrent modification) |

There are no body-validation errors: this endpoint accepts no body.

---

## 4. List Articles by Language

**Purpose:** Publicly list the active articles of a given user that have a translation in the requested language, optionally filtered by tag. **No authentication, no feature check** — the endpoint is anonymously accessible, so the portfolio owner is identified in the path rather than by the session.
**Method/Path:** `GET /users/{userId}/portfolio/articles?language={code}`

**Semantics:** the result is an **inner join** between `articles_id` and `articles` on the requested `language`. An article with no translation in that language is not returned — including one with **zero** translations at all. Each returned item carries **only** the matching translation summary (`title`, `description`, `updated_at`, omitting heavy `raw_markdown`/`rendered_html` bodies in the list view) plus its `tags`. Soft-deleted articles (`is_deleted = TRUE` or `deleted_at IS NOT NULL`) and articles belonging to a soft-deleted user are excluded.

**Empty result is not an error:** a valid user with no matching articles → `200` with `"items": []`, never `404`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Identifier of the user whose portfolio is being read. Must be well-formed (`INVALID_USER_ID` on malformed format). Unknown or soft-deleted user → `404 MSG-4`. |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `language` | **yes** | Language code that must exist in the languages catalog. **Required** — it filters the result set. |
| `tag_id` | no | Optional well-formed UUID to filter articles associated in `article_tags`. Unknown tag returns `404 MSG-14`. |
| `limit` | no | Page size, integer `1..100`. Default `20`. |
| `page` | no | 1-based page number, integer `≥ 1`. Default `1`. |
| `sort` | no | `updated_at_desc` (default) \| `updated_at_asc` \| `title_asc`. Ties broken by `id` for stable pagination. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "9f1c...",
      "tags": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "PostgreSQL"
        }
      ],
      "translation": {
        "language": "ES",
        "title": "Pre-renderizado de Markdown en PostgreSQL",
        "description": "Arquitectura para compilar y cachear artículos técnicos en el backend.",
        "updated_at": "2026-11-17T16:00:00Z"
      }
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
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |
| `INVALID_ID` | `400` | `tag_id` query parameter is present but not a well-formed identifier |
| `MSG-14` | `404` | `tag_id` is not present in the tags catalog |
| `INVALID_QUERY_PARAM` | `400` | `limit`, `page` or `sort` is present but malformed or out of range |

---

## 5. Get an Article by ID

**Purpose:** Publicly fetch a single active article of a given user, including its pre-rendered HTML and raw Markdown in the requested language. **No authentication, no feature check** — the portfolio owner is identified in the path, not by the session.
**Method/Path:** `GET /users/{userId}/portfolio/articles/{id}?language={code}`

**Semantics:** returns the article **only if** it is active (`is_deleted = FALSE` and `deleted_at IS NULL`) and has a translation in the requested `language`. An article that is soft-deleted or has no translation in that language is treated as not found (`404 MSG-10`). Only the matching translation is included; other languages are omitted. Articles belonging to a soft-deleted user are excluded.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Owner of the portfolio. Must be well-formed (`INVALID_USER_ID`). Unknown or soft-deleted user → `404 MSG-4`. |
| `id` | **yes** | Article identifier. Must be well-formed (`INVALID_ID`). |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `only_html` | **no** | if set true it will only return the rendered html. |
| `language` | **yes** | Language code that must exist in the languages catalog. |

### Success

- **`200 OK`**

```json
{
  "id": "9f1c...",
  "tags": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "PostgreSQL"
    }
  ],
  "translation": {
    "language": "ES",
    "title": "Pre-renderizado de Markdown en PostgreSQL",
    "description": "Arquitectura para compilar y cachear artículos técnicos en el backend.",
    "raw_markdown": "# Introducción\n\nEste artículo explica cómo pre-renderizar **Markdown** a HTML seguro.",
    "rendered_html": "<h1>Introducción</h1>\n<p>Este artículo explica cómo pre-renderizar <strong>Markdown</strong> a HTML seguro.</p>",
    "updated_at": "2026-11-17T16:00:00Z"
  }
}
```

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
| `MSG-10` | `404` | Article `{id}` does not exist, is soft-deleted, belongs to another user, or has **no translation in `language`** |
| `MISSING_FIELD` | `400` | `language` query parameter absent or empty |
| `MSG-6` | `400` | `language` is not present in the languages catalog |

---

## 6. List Article Comments

**Purpose:** Publicly list comments for a given active article, supporting threaded replies via `parent_comment`. **No authentication required.**
**Method/Path:** `GET /users/{userId}/portfolio/articles/{articleId}/comments`

**Semantics:** validates that `{userId}` is active (`404 MSG-4` if missing or soft-deleted) and that `{articleId}` exists, is active (`is_deleted = FALSE`), and belongs to `{userId}` (`404 MSG-10` if not). Joins `comments` with `users` (`username`) to return comment authors and `parent_comment` references for client-side or nested tree assembly.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Portfolio owner identifier (`INVALID_USER_ID`). |
| `articleId` | **yes** | Article identifier (`INVALID_ID`). |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `limit` | no | Page size, integer `1..100`. Default `50`. |
| `page` | no | 1-based page number, integer `≥ 1`. Default `1`. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "01936f8a-8888-7d3e-8f2a-1b4c5d6e7f80",
      "article_id": "9f1c...",
      "parent_comment": null,
      "author": {
        "id": "01936f8a-7b1c-7d3e-8f2a-1b4c5d6e7f80",
        "username": "sergio-dev"
      },
      "comment": "Excelente explicación sobre el pre-renderizado."
    },
    {
      "id": "01936f8a-9999-7d3e-8f2a-1b4c5d6e7f80",
      "article_id": "9f1c...",
      "parent_comment": "01936f8a-8888-7d3e-8f2a-1b4c5d6e7f80",
      "author": {
        "id": "01936f8a-3333-7d3e-8f2a-1b4c5d6e7f80",
        "username": "reader-01"
      },
      "comment": "De acuerdo, evita sobrecargar el cliente."
    }
  ],
  "meta": {
    "article_id": "9f1c...",
    "page": 1,
    "limit": 50,
    "total": 2,
    "total_pages": 1
  }
}
```

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `INVALID_ID` | `400` | `articleId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Article `{articleId}` does not exist, is soft-deleted, or does not belong to `{userId}` |
| `INVALID_QUERY_PARAM` | `400` | `limit` or `page` is present but malformed or out of range |

---

## 7. Create a Comment on an Article

**Purpose:** Post a top-level comment or reply (`parent_comment`) on an existing active article. Requires an active authenticated session (`accessToken`) with the feature of VISITOR (The default feature that gets the user when creates an account).
**Method/Path:** `POST /users/{userId}/portfolio/articles/{articleId}/comments`

**Semantics:** resolves the commenter's `user_id` from `accessToken`. Verifies that `{articleId}` is active (`is_deleted = FALSE`). If `parent_comment` is provided, verifies that the parent comment exists and belongs to the same `{articleId}` (`404 MSG-10` otherwise). Inserts the new row into `comments`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Portfolio owner identifier (`INVALID_USER_ID`). |
| `articleId` | **yes** | Target article identifier (`INVALID_ID`). |

### Request body

| Field | Type | Rules |
|---|---|---|
| `parent_comment` | string \| null | optional; well-formed UUID of an existing comment on `{articleId}` (`INVALID_ID` / `MSG-10`) |
| `comment` | string | required; non-blank, `1..1000` chars (`MISSING_FIELD` / `INVALID_FIELD`) |

**Body format**

```json
{
  "parent_comment": null,
  "comment": "Muy buen artículo sobre PostgreSQL y Markdown."
}
```

### Success

- **`201 Created`** — returns the created comment object matching an entry in `GET /users/{userId}/portfolio/articles/{articleId}/comments`.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `INVALID_ID` | `400` | `articleId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | Portfolio owner `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Article `{articleId}` does not exist, is soft-deleted, or does not belong to `{userId}` |
| `MISSING_FIELD` | `400` | `comment` is absent, `null`, or blank |
| `INVALID_FIELD` | `400` | `comment` is not a string or exceeds 1000 chars, or `parent_comment` has a non-string/non-null type |
| `INVALID_ID` | `400` | `parent_comment` is not a well-formed identifier |
| `MSG-10` | `404` | `parent_comment` does not exist or belongs to a different article |

---

## 8. Update a Comment

**Purpose:** Edit the text of an existing comment on an active article. Only the comment author (`comments.user_id`) may update their own comment and must have the feature "VISITOR".
**Method/Path:** `PATCH /users/{userId}/portfolio/articles/{articleId}/comments/{commentId}`

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Portfolio owner identifier (`INVALID_USER_ID`). |
| `articleId` | **yes** | Article identifier (`INVALID_ID`). |
| `commentId` | **yes** | Comment identifier (`INVALID_ID`). |

### Request body

| Field | Type | Rules |
|---|---|---|
| `comment` | string | required; non-blank, `1..1000` chars |

**Body format**

```json
{
  "comment": "Comentario editado."
}
```

### Success

- **`200 OK`** — returns the updated comment object.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` header is not `application/json` |
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `INVALID_ID` | `400` | `articleId` or `commentId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | Portfolio owner `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Article `{articleId}` is soft-deleted/not found, or comment `{commentId}` does not exist |
| `MSG-5` | `403` | Authenticated user is not the author of `{commentId}` |
| `MISSING_FIELD` | `400` | `comment` is absent, `null`, or blank |
| `INVALID_FIELD` | `400` | `comment` is not a string or exceeds 1000 chars |

---

## 9. Delete a Comment

**Purpose:** Permanently delete a comment. May be performed by the comment author (`comments.user_id`) or the article owner (`articles_id.user_id`) and must be have the feature "VISITOR".
**Method/Path:** `DELETE /users/{userId}/portfolio/articles/{articleId}/comments/{commentId}`

**Semantics:** **hard delete.** Permanently deletes `{commentId}` from `comments` and cascades (`ON DELETE CASCADE`) to any nested replies referencing `parent_comment = {commentId}`.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Portfolio owner identifier (`INVALID_USER_ID`). |
| `articleId` | **yes** | Article identifier (`INVALID_ID`). |
| `commentId` | **yes** | Comment identifier (`INVALID_ID`). |

### Success

- **`204 No Content`** — empty body.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to an active, non-deleted user |
| `INVALID_USER_ID` | `400` | `userId` in the path is not a well-formed identifier |
| `INVALID_ID` | `400` | `articleId` or `commentId` in the path is not a well-formed identifier |
| `MSG-4` | `404` | Portfolio owner `{userId}` does not exist or is soft-deleted |
| `MSG-10` | `404` | Article `{articleId}` is soft-deleted/not found, or comment `{commentId}` does not exist |
| `MSG-5` | `403` | Authenticated user is neither the comment author nor the article owner |
