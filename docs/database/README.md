# Database Documentation

PostgreSQL database layer built with TypeORM. The schema is defined entirely by entity classes in `back-end/src/shared/database/` and kept in sync by `synchronize: true` — there are no migrations or seed scripts.

## Contents

- [Architecture](./DATABASE-ARCHITECTURE.md) — DataSource, entity organization, synchronization
- [Schema](./DATABASE-SCHEMA.md) — tables, columns, constraints, relationships

## Stack

- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Driver**: `pg`

## Layout

```
back-end/src/shared/database/
├── data-source.ts          # DataSource configuration
├── content/                # Blog, project, tag and translation entities
└── user/                   # Provider, role, functionality and user entities
```

## DataSource

```typescript
const dataSource = new DataSource({
  type: "postgres",
  url: environment.DATABASE_URL!,
  entities: [__dirname + "/**/*.entity.{ts,js}"],
  synchronize: true,
});
```

`src/index.ts` calls `dataSource.initialize()` before starting the server, so entity changes are applied to the database on startup.

## Environment

`DATABASE_URL` is the only database-specific variable. See the root [README](../../README.md#-configuration) for the full environment configuration.
