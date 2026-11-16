# Tags tables

```sql
CREATE TABLE IF NOT EXISTS "tags" (
	"id" UUID NOT NULL,
	"name" VARCHAR(50) NOT NULL ,
	"filterable" BOOLEAN NOT NULL,
	"image_url" VARCHAR(2048),
	PRIMARY KEY("id")
);
```
