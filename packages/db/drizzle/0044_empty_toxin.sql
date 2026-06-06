CREATE TABLE "mcp_server_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"url" text NOT NULL,
	"transport" text NOT NULL,
	"auth_kind" text NOT NULL,
	"default_scopes" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_server_catalog_slug_unique" UNIQUE("slug")
);
