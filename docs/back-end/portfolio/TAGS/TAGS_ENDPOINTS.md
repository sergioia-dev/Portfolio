## 1. Create a Tag

**Purpose:** Create a new tag owned by the caller's account. Requires the feature `PORTFOLIO_CREATE`. Tag names are unique **per user, case‑insensitively**.
**Method/Path:** `POST /portfolio/tags`

**Content type:** `multipart/form-data` (not `application/json`) — the request carries an optional image part. This is a documented exception to the Conventions section; other endpoints in the module remain JSON.

### Request parts


| Part | Type | Rules |
|---|---|---|
| `name` | text field | **required**; 1–50 characters after trim; unique per user, case‑insensitive |
| `filterable` | text field | **optional**; literal `true` or `false`; **default `true`** when omitted. Any other value → `INVALID_FIELD` |
| `image` | file | **optional**; must be SVG by magic bytes (`<svg` / `<?xml` … `<svg`), max 256 KB. Sanitized server‑side before persisting |

**multipart example**

```
--boundary
Content-Disposition: form-data; name="name"

javascript
--boundary
Content-Disposition: form-data; name="filterable"

true
--boundary
Content-Disposition: form-data; name="image"; filename="js.svg"
Content-Type: image/svg+xml

<svg xmlns="http://www.w3.org/2000/svg">…</svg>
--boundary--
```

### Success

- **`201 Created`** 


`image_url` is derived from `img_path` at read time (`null` when no image). The client never sees the storage path.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_CREATE` feature |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` is not `multipart/form-data` |
| `MISSING_FIELD` | `400` | `name` absent, or present as an empty/whitespace‑only value |
| `INVALID_NAME` | `400` | `name` exceeds 50 characters after trim, or contains control characters |
| `INVALID_FIELD` | `400` | `filterable` present but not the literal `true` / `false` |
| `INVALID_IMAGE` | `400` | `image` part is not a valid SVG (magic bytes), exceeds 256 KB, or fails sanitization |
| `MSG-13` | `409` | A tag named `name` already exists **for this user** (case‑insensitive) — also returned when the DB unique index rejects the insert |


## 2. Update a Tag

**Purpose:** Fully replace the mutable state of an existing tag owned by the caller's account. Requires the feature `PORTFOLIO_UPDATE`. Tag names remain unique **per user, case‑insensitively**, excluding the tag itself.
**Method/Path:** `PUT /portfolio/tags/{id}`

**Content type:** `multipart/form-data` (not `application/json`) — the request may carry an image file. Same documented exception to the Conventions section as Create.

**Storage model (unchanged from Create):** the client never sends a URL or a path. It uploads the file; the backend validates, sanitizes, stores it, and regenerates `img_path`. `img_path` is server‑generated only. A public URL, if exposed, is derived at read time from `img_path`.

when the image is replace the old one must remove/overriden

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `id` | **yes** | Tag identifier. Must be well-formed. |


### Request parts

| Part | Type | Rules |
|---|---|---|
| `name` | text field | **required**; 1–50 characters after trim; unique per user, case‑insensitive, excluding this tag |
| `filterable` | text field | **required** (no default on PUT — see note); literal `true` or `false`. Any other value → `INVALID_FIELD` |
| `image` | file | **optional**; SVG by magic bytes (`<svg` / `<?xml` … `<svg`), max 256 KB; sanitized server‑side before persisting. If present → **replaces** the current image |


**multipart example** (rename + toggle `filterable`, keep existing image)

```
--boundary
Content-Disposition: form-data; name="name"

typescript
--boundary
Content-Disposition: form-data; name="filterable"

false
--boundary--
```

**multipart example** (replace image)

```
--boundary
Content-Disposition: form-data; name="name"

javascript
--boundary
Content-Disposition: form-data; name="filterable"

true
--boundary
Content-Disposition: form-data; name="image"; filename="js.svg"
Content-Type: image/svg+xml

<svg xmlns="http://www.w3.org/2000/svg">…</svg>
--boundary--
```

### Success

- **`200 OK`** .

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_UPDATE` feature |
| `INVALID_ID` | `400` | `{id}` is not a well-formed identifier |
| `MSG-14` | `404` | Tag `{id}` does not exist, is soft‑deleted, or is not owned by the caller |
| `MSG-11` | `412` | `If-Match` supplied and does not match the current `updated_at` (concurrent modification) |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` is not `multipart/form-data` |
| `MISSING_FIELD` | `400` | `name` or `filterable` absent, or `name` present as empty/whitespace‑only |
| `INVALID_NAME` | `400` | `name` exceeds 50 characters after trim, or contains control characters |
| `INVALID_FIELD` | `400` | `filterable` present but not the literal `true`/`false`; `remove_image` present but not `true`/`false`; or `image` and `remove_image=true` supplied together |
| `INVALID_IMAGE` | `400` | `image` part is not a valid SVG (magic bytes), exceeds 256 KB, or fails sanitization |
| `MSG-13` | `409` | Renaming would collide with another tag owned by the same user (case‑insensitive) — also returned when the DB unique index rejects the update |


## 3. Delete a Tag

**Purpose:** Delete an existing tag owned by the caller's account. Requires the feature `PORTFOLIO_DELETE`.
**Method/Path:** `DELETE /portfolio/tags/{id}`

**Semantics:** **hard delete.** The row is removed from the table. The name is freed immediately, so a new tag with the same name can be created right after. No request body is expected — any body sent is ignored.

**Associations:** if the tag is attached to any other table the tag cannot be deleted until free 

**Repeat calls:** a second `DELETE` on the same `id` returns `404 MSG-14` — the row is gone. Clients that need retry semantics should treat `404` on a delete they've already issued as success.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `id` | **yes** | Tag identifier. Must be well-formed. |

### Success

- **`204 No Content`** — empty body.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_DELETE` feature |
| `INVALID_ID` | `400` | `{id}` is not a well-formed identifier |
| `MSG-14` | `404` | Tag `{id}` does not exist, or is not owned by the caller |
| `MSG-15` | `406` | Tag `{id}` does not exist, or is not owned by the caller |


## 4. List Tags

**Purpose:** Publicly list the tags of a given user, optionally restricted by `filterable`. **No authentication, no feature check** — the portfolio owner is identified in the path, not by the session. This is the same access model as `GET /users/{userId}/portfolio/experiences`.
**Method/Path:** `GET /users/{userId}/tags`

**Semantics:** returns every tag owned by the user in the path. Tags are **hard‑deleted** (no `deleted_at` on the table), so "every tag" is simply "every row where `user_id = {userId}`". Ordering is deterministic so pagination is stable. Tags of a soft‑deleted user are excluded (the user lookup fails → `404 MSG-4`).

**`filterable` is tri‑state**, not a boolean with a default — see the note under the query parameters. Absence ≠ `false`; the three cases are distinct.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Identifier of the user whose tags are being read. Must be well-formed. Unknown or soft‑deleted user → `404 MSG-4`. |

### Query parameters

| Name | Required | Rules |
|---|---|---|
| `filterable` | no | `true` → only `filterable = TRUE`; `false` → only `filterable = FALSE`; **omitted → no filter (all filterable = true)**. Any other value → `INVALID_QUERY_PARAM`. |
| `limit` | no | Page size, integer `1..100`. Default `20`. |
| `page` | no | 1‑based page number, integer `≥ 1`. Default `1`. |

### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "b41e...",
      "name": "javascript",
      "filterable": true,
      "image_url": "https://cdn.example.com/tags/b41e.svg",
    },
    {
      "id": "c7d2...",
      "name": "backend",
      "filterable": false,
      "image_url": null,
    }
  ],
  "meta": {
    "filterable": null,
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1,
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
| `MSG-4` | `404` | User `{userId}` does not exist or is soft‑deleted |
| `INVALID_QUERY_PARAM` | `400` | `filterable` present but not the literal `true`/`false`; `limit` or `page` out of range or not an integer  |

`UNAUTHORIZED` and `MSG-5` no longer apply and must be removed from this endpoint's table. **No new exception codes** — `INVALID_ID`, `MSG-4` and `INVALID_QUERY_PARAM` all already exist.

## 5. Get a Tag by ID

**Purpose:** Publicly fetch a single tag of a given user. **No authentication, no feature check** — the owner is identified in the path, not by the session. Same access model as `GET /users/{userId}/tags`.
**Method/Path:** `GET /users/{userId}/tags/{id}`

**Semantics:** returns the tag **only if** it exists, belongs to `{userId}`, and the user is not soft‑deleted. Tags are **hard‑deleted**, so there is no `deleted_at` filter on the tag side. 

**`404` folds three conditions** — see notes: tag absent, tag owned by a different user, user absent. Deliberate, same convention as the experiences get‑by‑id.

### Path parameters

| Name | Required | Rules |
|---|---|---|
| `userId` | **yes** | Owner of the tag. Must be well-formed. Unknown  → `404 MSG-4`. |
| `id` | **yes** | Tag identifier. Must be well-formed. |

### Query parameters

None.

### Success

- **`200 OK`**

```json
{
  "id": "b41e...",
  "name": "javascript",
  "filterable": true,
  "image_url": "https://cdn.example.com/tags/b41e.svg",
}
```

The object shape is **identical to one `items[]` entry** of `GET /users/{userId}/tags` and to the Create/Update responses. Same serializer — do not let them drift.

### Response headers

| Header | Notes |
|---|---|
| `Cache-Control` | `public, max-age=60` — depends only on path, not the caller. |

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `INVALID_ID` | `400` | `userId` or `id` in the path is not a well-formed identifier (the message names which) |
| `MSG-4` | `404` | User `{userId}` does not exist or is soft‑deleted |
| `MSG-14` | `404` | Tag `{id}` does not exist, or belongs to a different user |

`UNAUTHORIZED` and `MSG-5` do not apply and must not appear in this table. **No new exception codes** — `INVALID_ID`, `MSG-4` and `MSG-14` all already exist.

