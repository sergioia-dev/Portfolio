---

name: backend-architecture
description: Explain and follow the back-end architecture and coding conventions of this portfolio API. Use when adding or changing endpoints, controllers, services, repositories, validators, errors, entities, migrations, seeders, or tests in back-end.
---

# Back-end Architecture

Express 5 + TypeScript API backed by PostgreSQL through TypeORM, Firebase Storage for uploads, JWT cookies for auth, Jest for tests, and Biome for lint/format.

## When to use

Use this skill before changing anything in `back-end/`:

- adding or modifying an API endpoint
- adding an entity, column, migration, or seeder row
- adding validation or a new domain error
- writing or fixing back-end tests
- reviewing whether a change follows the existing structure

## Runtime flow

1. `src/index.ts` initializes the TypeORM `dataSource`, then starts the Express app on `environment.PORT` (default `3000`).
2. `src/app.ts` creates the app, applies global middleware, wires dependencies manually, and mounts routers.
3. Global middleware order: CORS (frontend origins), `helmet`, `cookie-parser`, JSON/urlencoded body parsing, `speedLimiter`, `requestLimiter`.
4. A request flows `route -> middleware -> controller -> service -> repository -> TypeORM -> PostgreSQL`.
5. Responses are serialized by controllers. Domain errors are translated through `MessageRepository` before leaving the app.

Do not introduce a DI container or a service locator. Dependencies are constructed in `src/app.ts` and passed through constructors or router factories.

## Directory layout

```text
back-end/
├── src/
│   ├── index.ts                  # bootstrap: dataSource + HTTP server
│   ├── app.ts                    # middleware, manual DI, router mounting
│   ├── module/
│   │   ├── auth/
│   │   │   ├── controller/
│   │   │   ├── service/
│   │   │   ├── repository/
│   │   │   ├── routes/
│   │   │   ├── validators/
│   │   │   └── errors/
│   │   └── portfolio/
│   │       ├── experiences/
│   │       │   ├── controller/
│   │       │   ├── service/
│   │       │   ├── repository/
│   │       │   ├── routes/
│   │       │   ├── validators/
│   │       │   └── errors/
│   │       └── tags/            # same six-folder shape
│   ├── shared/
│   │   ├── database/            # entities per domain + manual migrations
│   │   ├── object-storage/      # Firebase upload helpers
│   │   ├── security/
│   │   │   ├── configuration/   # environment parsing
│   │   │   ├── jwt/             # token generation/verification
│   │   │   └── rate-limiting/   # limiters
│   │   └── util/                # pure helpers
│   └── util/                    # string helpers
├── database/seeder/             # idempotent reference-data seeders
├── test/module/                 # mirrors src/module
└── .skills/                     # repo-local agent skills
```

One feature gets one folder per concern. Do not create `auth.controller.ts` at the area root again; use `auth/controller/auth.controller.ts`.

## Layer responsibilities

| Layer        | Owns                                                                                             | Must not own                       |
| ------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `routes`     | Router factory, paths, middleware order                                                          | Business rules, DB access          |
| `controller` | Request parsing, auth user/permissions, multipart, HTTP status, serialization, error translation | SQL, business invariants           |
| `service`    | Business rules, ownership checks, uniqueness, uploads, precondition checks                       | Express `Request`/`Response`       |
| `repository` | TypeORM queries and persistence only                                                             | HTTP concepts, message translation |
| `validators` | Pure input validation returning a result union                                                   | Throwing HTTP errors directly      |
| `errors`     | Domain error class + factory functions with stable codes/statuses                                | Logging/response formatting        |

Dependency direction is downward only:

```text
routes -> controller -> service -> repository -> TypeORM
                 \-> validators / errors
service ------> object-storage / shared helpers
controller ---> message.repository (translation only)
```

Repositories never import controllers or routes. Services never import Express types. Validators do not read `Request`.

## Bootstrap and dependency wiring

`src/app.ts` is the composition root. It constructs repositories with `dataSource`, then services with repositories/storage, then controllers with services and `messageRepository`, then passes each controller to its router.

Router factories follow this shape:

```ts
export function featureRouter(
  controller: FeatureController,
  jwt: Jwt,
  messageRepository: MessageRepository,
): Router;
```

Mount with `app.use(featureRouter(controller, jwt, messageRepository))`.

Protected route order is deliberate:

```text
requireAuth -> requireFeature -> multipart parser -> controller handler
```

Public routes omit `requireAuth` and `requireFeature`.

## Authentication and authorization

- `Jwt` generates access/refresh tokens. Access tokens carry `sub`, `email`, `role`, and `permissions`.
- Cookies are `httpOnly`, `secure`, `sameSite: "strict"`, `path: "/"`. Default access lifetime is 15 minutes, refresh 7 days.
- `requireAuth` verifies `accessToken`, assigns `userId` and `permissions` to `AuthenticatedRequest`, and maps missing/invalid tokens to `unauthorized()` (401).
- `requireFeature(feature, messageRepository)` must check `userId` first (401), then `permissions.includes(feature)` (403, `MSG-5`). Feature strings are uppercase, e.g. `PORTFOLIO_CREATE`, `PORTFOLIO_UPDATE`, `PORTFOLIO_DELETE`.

## Request, response, and error contract

Success responses:

- create: `201` + created resource
- update: `200` + updated resource
- delete: `204` with an empty body
- auth mutations: `{ success: true }`
- paginated collections: `{ items, meta: { filterable, page, limit, total, total_pages } }`
- public list/detail: `Cache-Control: public, max-age=60`

Input rules:

- Treat request bodies as `unknown` and validate before use.
- Multipart booleans arrive as the strings `"true"`/`"false"`; do not assume native booleans.
- Trim names and reject empty strings, control characters, and over-limit lengths.
- Uploads are validated by magic bytes, not only MIME type; SVG limit is 256 KB.
- Parse `limit`/`page` with explicit bounds and defaults.

Error rules:

- Each domain defines its own error class, e.g. `TagError extends Error` with `readonly code`, `readonly httpStatus`, and `message`.
- Error factories live in `errors/<feature>.errors.ts` and carry the stable code and exact English message.
- Controllers call `createSendError(messageRepository)`; it resolves the code through `MessageRepository.getMessage(code, language)` using `?language=`, falls back to the error message, and sends 500 `{ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" }` for unknown failures.
- Preserve the documented validation order: 401 -> 403 -> invalid id 400 -> not found 404 -> If-Match 412 -> media type 415 -> missing/invalid fields 400 -> conflict 409.
- Add new codes and both translations to `database/seeder/exception_seeder.ts`; never hard-code a user-visible message only in a controller.

## Validation pattern

Validators are pure and return:

```ts
type Validation<T> = { value: T } | { error: DomainError };
```

Each validator either returns a normalized value or an error factory result. Services call validators; controllers do not duplicate validation. Validators are tested directly without HTTP.

## Data and entity conventions

- Entity files: `src/shared/database/<domain>/<name>.entity.ts`.
- Table and column names: `snake_case`.
- Entity properties: `camelCase`, with explicit column names when they differ, e.g. `@Column({ name: "image_url" }) imageUrl`.
- Primary keys: `@PrimaryColumn("uuid")`; services generate ids with `node:crypto` `randomUUID()`.
- Timestamps: `@CreateDateColumn` / `@UpdateDateColumn` with `timestamptz`.
- Relations: explicit `@ManyToOne` / `@JoinColumn`; use `onDelete: "CASCADE"` where child rows have no meaning without the parent.
- Soft deletes are domain-specific: `User.deleted_at` is boolean; `Experience.deleted_at` is a timestamp. Do not add a soft-delete column just by habit.
- `synchronize` is `false`. Every schema change needs a hand-written migration in `src/shared/database/migrations/<timestamp>-PascalName.ts` with both `up` and `down`.
- Add functional or composite uniqueness in the migration, e.g. per-user case-insensitive tag names use `CREATE UNIQUE INDEX ... ("user_id", LOWER("name"))`.

## Object storage

`src/shared/object-storage/object_storage.ts` wraps Firebase Storage:

- `createObject(remotePath, data, contentType?, contentDisposition?)`
- `updateObject(...)` with the same optional metadata
- `objectPathFromUrl(url)` converts a public URL back to a storage path
- `deleteObject(path)`

Store only the public URL in the database. When replacing an image, upload the new object, update the row, then delete the old object. If the DB write fails after upload, delete the newly uploaded object.

## Naming and style conventions

- File names: feature concern files use `<feature>.<concern>.ts`; entities use `<name>.entity.ts`; migrations use `<timestamp>-PascalName.ts`; seeders use `snake_case.ts`.
- Classes, entities, services, repositories, controllers: `PascalCase`; default export for classes.
- Routers, error factories, validators, helpers: named exports.
- Functions and variables: `camelCase`; constants: `UPPER_SNAKE_CASE`.
- TypeScript `strict` is on. Type parameters, return values, and nullable fields explicitly.
- No comments unless the reason is non-obvious.
- Keep functions small and single-purpose.
- Use `try/catch` around async/controller work; log server errors with the existing `console.error("!!! ...", error)` style and return a safe response.
- Biome enforces formatting, import order, and line length. `pnpm test` fails on any warning.

## Adding a feature end to end

1. **Entity**: add `src/shared/database/<domain>/<feature>.entity.ts` with snake_case columns and relations.
2. **Migration**: add a timestamped migration, run `pnpm migration:run`, and verify with `pnpm migration:show`.
3. **Errors**: add `<feature>.errors.ts` with the domain error class and factories. Append new codes/translations to `database/seeder/exception_seeder.ts` and run `pnpm seeds:run`.
4. **Validators**: add pure validators returning `Validation<T>`, including multipart string booleans and upload checks.
5. **Repository**: add `<feature>.repository.ts`; inject `DataSource`, expose intent-named methods, keep TypeORM here.
6. **Service**: add `<feature>.service.ts`; validate, enforce ownership/uniqueness/preconditions, coordinate storage and repository calls.
7. **Controller**: add `<feature>.controller.ts`; parse auth user, files, query/body, serialize the public shape, set status/cache headers, translate errors.
8. **Routes**: add `<feature>.routes.ts` with the middleware order and public/protected split.
9. **Wire**: construct and mount the feature in `src/app.ts`.
10. **Tests**: mirror the feature under `test/module/...`; cover validators, service rules, repository queries, controller responses, and route middleware.
11. **Verify**: `pnpm test`, `pnpm run build`, `pnpm migration:show`, `pnpm seeds:run`.

## Testing conventions

- Jest + `ts-jest`; tests live in `back-end/test/module/<area>/<feature>/` and mirror `src`.
- Unit-test validators directly.
- Mock repositories and storage in service tests; assert calls and returned error codes.
- Repository tests mock `DataSource.getRepository(Entity)` by entity class.
- Controller tests use a chainable fake response (`status`, `json`, `send`, `set` return the response) and a fake `MessageRepository`.
- Multipart controller tests use a `PassThrough` stream, set both `content-type` and `content-length`, and wait a tick for busboy before asserting.
- Coverage thresholds are 90% for statements, branches, functions, and lines.

## Commands

```bash
pnpm run dev            # nodemon + ts-node
pnpm run build          # tsc
pnpm start              # production build
pnpm test               # biome + jest --coverage
pnpm run test:coverage  # jest only
pnpm run test:lint      # biome only
pnpm run test:format    # biome --write
pnpm migration:show
pnpm migration:run
pnpm migration:revert
pnpm seeds:run
pnpm db:setup           # db:up + migrations + seeds
```

## Pitfalls

- Forgetting a migration because `synchronize` is false. The entity alone will not change the database.
- Import depth changes when moving files into the concern folders. Check `shared` imports especially; auth/experience/tag modules sit at different depths under `src/module`.
- Mounting a protected route without `requireAuth` or omitting the feature check.
- Returning TypeORM entities directly when the API contract uses snake_case fields such as `image_url`.
- Treating multipart booleans as booleans instead of `"true"`/`"false"`.
- Catching a unique-constraint error without checking PostgreSQL code `23505`, or leaving an uploaded object orphaned.
- Adding an error code without a seeder translation, so the fallback English leaks into localized responses.
- Reordering validation so a 404 is returned before an invalid-id 400, or a 403 before the 401 check.
- Using `biome check` without `--write`, then wondering why `pnpm test` fails on formatting or warnings.
