# User Tables and related

```sql
CREATE TABLE IF NOT EXISTS "users" (
	-- This must be UUID version 7
	"id" UUID NOT NULL,
	"provider_id" UUID NOT NULL,
	"username" VARCHAR(80) UNIQUE,
	"email" VARCHAR(255) UNIQUE,
	"password" TEXT NOT NULL,
	"rol_id" UUID NOT NULL,
	"deleted_at" TIMESTAMP,
	"is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "user_information" (
	"id" UUID NOT NULL,
	"full_name" VARCHAR(255),
	"phone" VARCHAR(17),
	"country" VARCHAR(50),
	"full_name" VARCHAR(255),
	"github_url" VARCHAR(2048),
	"gitlab_url" VARCHAR(2048),
	"linkedin_url" VARCHAR(2048),
	"business_email" VARCHAR(2048),
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "roles" (
	"id" UUID NOT NULL,
	"name " VARCHAR(100) NOT NULL UNIQUE,
	"description" VARCHAR(500) NOT NULL,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "functionalities" (
	"id" UUID NOT NULL,
	-- This must be a ENUM
	"name" VARCHAR(100) NOT NULL UNIQUE,
	"description" VARCHAR(500) NOT NULL,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "rol_funcionalities" (
	"rol_id" UUID NOT NULL,
	"functionality_id" UUID NOT NULL,
	PRIMARY KEY("rol_id", "functionality_id")
);

CREATE TABLE IF NOT EXISTS "providers" (
	"id" UUID NOT NULL,
	"name" VARCHAR(50) NOT NULL UNIQUE,
	PRIMARY KEY("id")
);

```
