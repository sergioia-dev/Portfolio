# Certifications tables

```sql
CREATE TABLE IF NOT EXISTS "certifications" (
	"id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"title" VARCHAR(150) NOT NULL,
	"description " VARCHAR(1000) NOT NULL,
	"document_url" VARCHAR(2048) NOT NULL,
	PRIMARY KEY("id")
);

```
