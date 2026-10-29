CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"workplace_id" text NOT NULL,
	"receipt_seq" integer NOT NULL,
	"date" date NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"collected_by" text DEFAULT 'me' NOT NULL,
	"notes" text,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_dentist_id_receipt_seq_index" ON "payments" USING btree ("dentist_id","receipt_seq");--> statement-breakpoint
CREATE INDEX "payments_patient_id_date_index" ON "payments" USING btree ("patient_id","date");--> statement-breakpoint
CREATE INDEX "payments_dentist_id_workplace_id_date_index" ON "payments" USING btree ("dentist_id","workplace_id","date");