CREATE TABLE "credential" (
	"id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"name" varchar NOT NULL,
	"credentials" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text,
	"subscription_id" text,
	"product_id" text,
	"onboarded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	"transcription_model" varchar NOT NULL,
	"vision_model" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"content" json,
	"user_id" varchar NOT NULL,
	"image" varchar,
	"members" text[],
	"demo_project" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_execution" (
	"id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"trigger_input" json,
	"result" json,
	"execution_log" json
);
--> statement-breakpoint
CREATE TABLE "workflow" (
	"id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"content" json,
	"user_id" varchar NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
