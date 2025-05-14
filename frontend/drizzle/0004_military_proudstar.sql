CREATE TABLE "draft_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration_sec" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "draft_media" ADD CONSTRAINT "draft_media_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;