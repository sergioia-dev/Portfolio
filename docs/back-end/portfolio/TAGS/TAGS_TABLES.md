# Tags tables

```sql
CREATE TABLE IF NOT EXISTS "tags" (
	"id" UUID NOT NULL,
	"name" VARCHAR(50) NOT NULL UNIQUE,
	"filterable" BOOLEAN NOT NULL,
	"img_path" VARCHAR(500),
	PRIMARY KEY("id")
);
```
