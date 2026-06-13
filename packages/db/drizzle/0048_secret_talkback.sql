CREATE TABLE "artifact_execution" (
	"id" text PRIMARY KEY NOT NULL,
	"artifact_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"source" text NOT NULL,
	"user_id" text,
	"external_actor_id" text,
	"external_actor_name" text,
	"artifact_tool_id" text,
	"artifact_prompt_id" text,
	"artifact_resource_id" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_execution" ADD CONSTRAINT "artifact_execution_artifact_id_artifact_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_execution" ADD CONSTRAINT "artifact_execution_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_execution" ADD CONSTRAINT "artifact_execution_artifact_tool_id_artifact_tool_id_fk" FOREIGN KEY ("artifact_tool_id") REFERENCES "public"."artifact_tool"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_execution" ADD CONSTRAINT "artifact_execution_artifact_prompt_id_artifact_prompt_id_fk" FOREIGN KEY ("artifact_prompt_id") REFERENCES "public"."artifact_prompt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_execution" ADD CONSTRAINT "artifact_execution_artifact_resource_id_artifact_resource_id_fk" FOREIGN KEY ("artifact_resource_id") REFERENCES "public"."artifact_resource"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artifact_execution_artifact_idx" ON "artifact_execution" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_execution_artifact_createdAt_idx" ON "artifact_execution" USING btree ("artifact_id","created_at");--> statement-breakpoint
CREATE INDEX "artifact_execution_userId_idx" ON "artifact_execution" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artifact_execution_kind_idx" ON "artifact_execution" USING btree ("kind");