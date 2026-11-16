# Project Tables

```sql

CREATE TABLE IF NOT EXISTS "projects_id" (
	"id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"repository_url" TEXT NOT NULL,
	"website_url" TEXT,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "projects" (
	"id" UUID NOT NULL,
	"title" VARCHAR(255) NOT NULL,
	"description" VARCHAR(500) NOT NULL,
	"language_id" UUID NOT NULL,
	PRIMARY KEY("id", "language_id")
);

CREATE TABLE IF NOT EXISTS "project_tags" (
	"project_id" UUID NOT NULL,
	"tag_id" UUID NOT NULL,
	PRIMARY KEY("project_id", "tag_id")
);

```

