# Article Tables

```sql

CREATE TABLE IF NOT EXISTS "comments" (
	"id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
	"article_id" UUID NOT NULL,
	"parent_comment" UUID,
	"comment" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT "CURRENT_TIMESTAMP()",
    "updated" BOOLEAN  NOT NULL DEFAULT FALSE,
    "updated_at" TIMESTAMP 
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "article_tags" (
	"tag_id" UUID NOT NULL,
	"article_id" UUID NOT NULL,
	PRIMARY KEY("tag_id", "article_id")
);

CREATE TABLE IF NOT EXISTS "articles_id" (
	"id" UUID NOT NULL,
	"user_id" UUID NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT FALSE 
    deleted_at TIMESTAMP
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "articles" (
	"id" UUID NOT NULL,
	"raw_markdown" TEXT NOT NULL,
	"rendered_html" TEXT NOT NULL,
	"language_id" UUID NOT NULL,
	"title" VARCHAR(100) NOT NULL,
	"description" VARCHAR(500) NOT NULL,
	"updated_at" TIMESTAMP NOT NULL,
	PRIMARY KEY("id", "language_id")
);

```
