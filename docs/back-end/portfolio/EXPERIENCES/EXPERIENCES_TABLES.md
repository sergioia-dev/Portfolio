# Experiences Tables

In this section we are describing the tables required for completing the implementation of the module.

```sql
CREATE TABLE IF NOT EXISTS "experiences_id" (
	"id" UUID NOT NULL,
	"website_url" VARCHAR(2048),
	"start_date" DATE NOT NULL,
	"end_date" DATE,
	"user_id" UUID NOT NULL,
	PRIMARY KEY("id")
);
```

```sql
CREATE TABLE IF NOT EXISTS "experiences" (
	"id" UUID NOT NULL,
	"title" VARCHAR(255) DEFAULT '100' NOT NULL,
	"description" VARCHAR(1000) NOT NULL,
	"language_id" UUID NOT NULL,
	PRIMARY KEY("id", "language_id")
);
);
```
