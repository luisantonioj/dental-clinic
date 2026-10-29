CREATE TABLE "patients" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"seq" integer NOT NULL,
	"code" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"birthdate" date,
	"sex" text,
	"phone" text,
	"email" text,
	"address" text,
	"occupation" text,
	"emergency_name" text,
	"emergency_phone" text,
	"emergency_relation" text,
	"allergies" text,
	"medical_conditions" text,
	"medications" text,
	"notes" text,
	"consent_at" timestamp with time zone,
	"reminders_opt_in" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"search_text" text GENERATED ALWAYS AS (lower(first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name || ' ' || code || ' ' || coalesce(phone, '') || ' ' || regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patients_dentist_id_seq_index" ON "patients" USING btree ("dentist_id","seq");--> statement-breakpoint
CREATE INDEX "patients_dentist_id_last_name_first_name_index" ON "patients" USING btree ("dentist_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX "patients_search_text_trgm_idx" ON "patients" USING gin ("search_text" gin_trgm_ops);