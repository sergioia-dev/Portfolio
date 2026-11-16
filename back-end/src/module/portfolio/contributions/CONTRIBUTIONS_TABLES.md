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
