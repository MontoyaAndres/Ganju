ALTER TABLE "artifact" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "artifact" SET "slug" = replace(gen_random_uuid()::text, '-', '') WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "artifact" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "artifact" DROP CONSTRAINT "artifact_hash_unique";--> statement-breakpoint
ALTER TABLE "artifact" DROP COLUMN "hash";
