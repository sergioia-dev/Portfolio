# Database Architecture

PostgreSQL database accessed through TypeORM. Entities are the single source of truth for the schema; the DataSource runs with `synchronize: true`, so tables and constraints are created and updated from the entity classes at startup.

## Stack

- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Driver**: `pg`
- **Schema management**: `synchronize: true` (no migrations)

## DataSource

`back-end/src/shared/database/data-source.ts`:

```typescript
const dataSource = new DataSource({
  type: "postgres",
  url: environment.DATABASE_URL!,
  entities: [__dirname + "/**/*.entity.{ts,js}"],
  synchronize: true,
});

export default dataSource;
```

`back-end/src/index.ts` initializes it before the server starts and exits if initialization fails:

```typescript
dataSource
  .initialize()
  .then(() => {
    app.listen(environment.API);
  })
  .catch((error) => {
    console.error("!!! Error initializing database :\n", error);
    process.exit(1);
  });
```

## Entity Organization

```
back-end/src/shared/database/
├── data-source.ts
├── content/
│   ├── blog.entity.ts
│   ├── blog_translation.entity.ts
│   ├── project.entity.ts
│   ├── project_translation.entity.ts
│   └── tag.entity.ts
└── user/
    ├── provider.entity.ts
    ├── role.entity.ts
    ├── functionality.entity.ts
    └── user.entity.ts
```

## Content Model

```
blogs 1 ─── n blog_translations        (language: EN | ES)
blogs n ─── n tags                     (blog_tags)
projects 1 ─── n project_translations  (language: EN | ES)
projects n ─── n tags                  (project_tags)
```

- Translations store `title` (varchar 150) and `description` (text) per language.
- `tags.name` is unique (varchar 50).
- Junction tables use composite primary keys and cascade deletes.
- `created_at` / `updated_at` are `timestamptz` with `DEFAULT now()`.

## Security Model

```
users n ─── 1 providers                (provider_id)
users n ─── 1 roles                    (rol_id)
roles n ─── n functionalities          (rol_funcionalities)
```

- All primary keys are application-generated UUIDs.
- `users.username` and `users.email` are unique and nullable; `password` is required.
- Authorization is role-based: a role owns a set of functionalities through the `rol_funcionalities` junction table.

## Repository Access

Repositories obtain typed repositories from the shared DataSource and build queries with the TypeORM query builder:

```typescript
dataSource.getRepository(Blog).createQueryBuilder("blog")
```

See [Repository Pattern](../back-end/REPOSITORY-PATTERN.md) for the conventions used by the content repositories.

## Schema Changes

Edit or add an entity class; TypeORM applies the change on the next startup. Because synchronization is enabled in every environment, review entity changes carefully before deploying — TypeORM alters or drops columns to match the entities.
