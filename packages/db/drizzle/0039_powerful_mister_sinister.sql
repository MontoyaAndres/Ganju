ALTER TABLE "artifact" ADD COLUMN "artifact_resource_total_size" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sync_artifact_resource_total_size"()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE "artifact"
      SET "artifact_resource_total_size" = "artifact_resource_total_size" + COALESCE(NEW."size", 0)
      WHERE "id" = NEW."artifact_id";
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE "artifact"
      SET "artifact_resource_total_size" = GREATEST("artifact_resource_total_size" - COALESCE(OLD."size", 0), 0)
      WHERE "id" = OLD."artifact_id";
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW."artifact_id" = OLD."artifact_id") THEN
      IF (COALESCE(NEW."size", 0) <> COALESCE(OLD."size", 0)) THEN
        UPDATE "artifact"
          SET "artifact_resource_total_size" = GREATEST("artifact_resource_total_size" + COALESCE(NEW."size", 0) - COALESCE(OLD."size", 0), 0)
          WHERE "id" = NEW."artifact_id";
      END IF;
    ELSE
      UPDATE "artifact"
        SET "artifact_resource_total_size" = GREATEST("artifact_resource_total_size" - COALESCE(OLD."size", 0), 0)
        WHERE "id" = OLD."artifact_id";
      UPDATE "artifact"
        SET "artifact_resource_total_size" = "artifact_resource_total_size" + COALESCE(NEW."size", 0)
        WHERE "id" = NEW."artifact_id";
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
UPDATE "artifact" SET "artifact_resource_total_size" = COALESCE((
  SELECT SUM(COALESCE("artifact_resource"."size", 0))
  FROM "artifact_resource"
  WHERE "artifact_resource"."artifact_id" = "artifact"."id"
), 0);--> statement-breakpoint
DROP TRIGGER IF EXISTS "artifact_resource_total_size_trigger" ON "artifact_resource";--> statement-breakpoint
CREATE TRIGGER "artifact_resource_total_size_trigger"
AFTER INSERT OR UPDATE OR DELETE ON "artifact_resource"
FOR EACH ROW EXECUTE FUNCTION "sync_artifact_resource_total_size"();
