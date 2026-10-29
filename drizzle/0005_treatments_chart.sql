CREATE TABLE "chart_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"tooth" integer NOT NULL,
	"surfaces" text[] DEFAULT '{}'::text[] NOT NULL,
	"condition" text NOT NULL,
	"status" text DEFAULT 'existing' NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"workplace_id" text NOT NULL,
	"date" date NOT NULL,
	"teeth" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"procedure" text NOT NULL,
	"notes" text,
	"fee" integer DEFAULT 0 NOT NULL,
	"lab_fee" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_entries" ADD CONSTRAINT "chart_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatments" ADD CONSTRAINT "treatments_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chart_entries_patient_id_tooth_index" ON "chart_entries" USING btree ("patient_id","tooth");--> statement-breakpoint
CREATE INDEX "treatments_patient_id_date_index" ON "treatments" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "treatments_dentist_id_workplace_id_date_index" ON "treatments" USING btree ("dentist_id","workplace_id","date");