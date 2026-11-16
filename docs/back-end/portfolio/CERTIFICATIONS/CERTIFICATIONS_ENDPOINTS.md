# Certifications Endpoint - Definitions

**Transversal requirements**

[Exceptions](../../exceptions/Exceptions.md)
[Features](../../FEATURES.md)

## 1. Create a Certification

**Purpose:** Create a new Certification owned by the caller's account. Requires the feature `PORTFOLIO_CREATE`. Certifications names are unique **per user, case‑insensitively**.
**Method/Path:** `POST /portfolio/certifications`

**Content type:** `multipart/form-data` (not `application/json`) — the request carries a required image part. This is a documented exception to the Conventions section; other endpoints in the module remain JSON.

**Object Storage** when storing the object in object-storage must be stored as /{userId}/certifications/{UUID}.pdf

### Request parts


| Part | Type | Rules |
|---|---|---|
| `title` | text field | **required**; 1-150 characters after trim; unique per user, case‑insensitive |
| `description` | text field | **required**; 1-1000 characters after trim |
| `document` | file | **required**; must be pdf |

**multipart example**

```
--boundary
Content-Disposition: form-data; name="title"

javascript
--boundary
Content-Disposition: form-data; name="description"

true
--boundary
Content-Disposition: form-data; name="image"; filename="certification.pdf"
Content-Type: pdf
--boundary--
```

### Success

- **`201 Created`** 


`document_url` is derived from `document`. The client never sees the storage path.
The document is store inside the object storage and when saved what is saved in the database(postgres) its his url.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_CREATE` feature |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | `Content-Type` is not `multipart/form-data` |
| `MISSING_FIELD` | `400` | `title/description/document` absent, or present as an empty/whitespace‑only value |
| `INVALID_FIELD` | `400` | `description/title` present but not text |
| `INVALID_FORMAT` | `400` | `pdf`  |


## 2. Update a Certification

**Purpose:** Update an existing Certification owned by the caller's account. Requires the feature `PORTFOLIO_UPDATE`. All body parts are optional, but **at least one must be present**. Certification titles remain unique **per user, case‑insensitively** (excluding the certification being updated).

**Method/Path:** `PATCH /portfolio/certifications/{certification_id}`

**Content type:** `multipart/form-data` — same documented exception as Create, because the body may carry an optional replacement document. A JSON body is **not** accepted.

### Path parameters

| Param | Type | Rules |
|---|---|---|
| `certification_id` | path | **required**; must be a well‑formed certification id (`INVALID_ID` otherwise) |

### Request parts

| Part | Type | Rules |
|---|---|---|
| `title` | text field | optional; if present, 1‑150 characters after trim; unique per user, case‑insensitive (excluding itself) |
| `description` | text field | optional; if present, 1‑1000 characters after trim |
| `document` | file | optional; if present, must be `pdf`. Replaces the stored document; `document_url` is re‑derived and the previous object is removed from object storage |

> An empty `document` part (empty filename / 0 bytes) is treated as absent, not as a replacement.

## 3. Delete a Certification

**Purpose:** Delete an existing Certification owned by the caller's account. Requires the feature `PORTFOLIO_DELETE`. The associated document is removed from object storage.

**Method/Path:** `DELETE /portfolio/certifications/{certification_id}`

**Content type:** none (no request body).

### Path parameters

| Param | Type | Rules |
|---|---|---|
| `certification_id` | path | **required**; must be a well‑formed certification id (`INVALID_ID` otherwise) |

### Success

- **`204 No Content`** — the certification was deleted. No response body.

### Errors

Evaluated in this order; the first failure is returned.

| Code | HTTP | Condition |
|---|---:|---|
| `UNAUTHORIZED` | `401` | Missing/invalid `accessToken`, or token does not resolve to the account owner |
| `MSG-5` | `403` | Authenticated user does not have the `PORTFOLIO_DELETE` feature |
| `INVALID_ID` | `400` | `certification_id` is not a well‑formed id |
| `MSG-10` | `404` | Certification does not exist or does not belong to the caller's account (no existence leak) |

### Notes on storage cleanup

1. Delete the database row first (transaction commit), then remove the document object from object storage.
2. If the object storage deletion fails, do **not** roll back the row deletion; log the orphaned object key for a background cleanup job.
3. The client never sees the storage path; `document_url` is not returned.

### Idempotency decision (choose one)

| Option | Behavior |
|---|---|
| **Strict (recommended)** | A second `DELETE` on an already‑deleted id returns `404 MSG-10`. Matches the ownership filter and avoids leaking whether the id ever existed. |
| **Idempotent** | A second `DELETE` returns `204 No Content`. Simpler for clients but loses the "not found" signal. |


## 4. List a User's Certifications

**Purpose:** Return the public list of certifications owned by a given user. This endpoint is **public**: it does not require an `accessToken` and does not require any feature. Only non‑sensitive fields are exposed.

**Method/Path:** `GET /users/{userId}/certifications`

**Content type (response):** `application/json`

### Path parameters

| Param | Type | Rules |
|---|---|---|
| `userId` | path | **required**; must be a well‑formed user id (`INVALID_USER_ID` otherwise) |

### Query parameters (optional)

| Param | Type | Rules |
|---|---|---|
| `page` | integer | optional; default `1`; must be `>= 1` (`INVALID_QUERY_PARAM` otherwise) |
| `limit` | integer | optional; default `20`; must be between `1` and `100` (`INVALID_QUERY_PARAM` otherwise) |


### Success

- **`200 OK`**

```json
{
  "items": [
    {
      "id": "c_01HX...",
      "title": "javascript avanzado",
      "description": "Certificación actualizada",
      "document_url": "https://storage.example.com/certifications/c_01HX....pdf",
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## 5. Get a Single Certification

**Purpose:** Return a single public certification owned by a given user. This endpoint is **public**: it does not require an `accessToken` and does not require any feature. Only non‑sensitive fields are exposed, matching the shape returned by the list endpoint.

**Method/Path:** `GET /users/{userId}/certifications/{certificationId}`

**Content type (response):** `application/json`

### Path parameters

| Param | Type | Rules |
|---|---|---|
| `userId` | path | **required**; must be a well‑formed user id (`INVALID_USER_ID` otherwise) |
| `certificationId` | path | **required**; must be a well‑formed certification id (`INVALID_CERTIFICATION_ID` otherwise) |

### Success

- **`200 OK`**

```json
{
  "id": "c_01HX...",
  "title": "javascript avanzado",
  "description": "Certificación actualizada",
  "document_url": "https://storage.example.com/certifications/c_01HX....pdf"
}


