CREATE TABLE "workplaces" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"type" text NOT NULL,
	"commission_pct" integer DEFAULT 100 NOT NULL,
	"deduct_lab_fees" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT 'indigo' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workplaces" ADD CONSTRAINT "workplaces_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workplaces_dentist_id_index" ON "workplaces" USING btree ("dentist_id");