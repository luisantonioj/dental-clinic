CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"workplace_id" text NOT NULL,
	"date" date NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"notes" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"dentist_id" text NOT NULL,
	"workplace_id" text NOT NULL,
	"date" date NOT NULL,
	"period_start" date,
	"period_end" date,
	"amount" integer NOT NULL,
	"notes" text,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_dentist_id_user_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_workplace_id_workplaces_id_fk" FOREIGN KEY ("workplace_id") REFERENCES "public"."workplaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_dentist_id_workplace_id_date_index" ON "expenses" USING btree ("dentist_id","workplace_id","date");--> statement-breakpoint
CREATE INDEX "payouts_dentist_id_workplace_id_date_index" ON "payouts" USING btree ("dentist_id","workplace_id","date");