-- Native @mastra/pg 1.22.3 MemoryPG schema; unused resource/observational storage omitted.
CREATE SCHEMA assistant;

            CREATE TABLE IF NOT EXISTS "assistant"."mastra_threads" (
              "id" TEXT PRIMARY KEY NOT NULL,
"resourceId" TEXT NOT NULL,
"title" TEXT NOT NULL,
"metadata" JSONB ,
"createdAt" TIMESTAMP NOT NULL,
"updatedAt" TIMESTAMP NOT NULL,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW(),
"updatedAtZ" TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS "assistant"."mastra_messages" (
              "id" TEXT PRIMARY KEY NOT NULL,
"thread_id" TEXT NOT NULL,
"content" TEXT NOT NULL,
"role" TEXT NOT NULL,
"type" TEXT NOT NULL,
"createdAt" TIMESTAMP NOT NULL,
"resourceId" TEXT ,
"createdAtZ" TIMESTAMPTZ DEFAULT NOW()
            );

CREATE INDEX IF NOT EXISTS "assistant_mastra_threads_resourceid_createdat_idx" ON "assistant"."mastra_threads" ("resourceId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "assistant_mastra_messages_thread_id_createdat_idx" ON "assistant"."mastra_messages" ("thread_id", "createdAt" DESC);
CREATE TABLE assistant.conversation_runs (
  id uuid PRIMARY KEY,
  thread_id text NOT NULL,
  resource_id text NOT NULL,
  message_id text NOT NULL UNIQUE,
  prompt_hash text NOT NULL,
  model_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','saved','cancelled','failed')),
  cancel_requested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_runs_thread_idx ON assistant.conversation_runs(thread_id,created_at DESC);
CREATE TABLE assistant.deleted_threads (
  id text PRIMARY KEY,
  resource_id text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assistant_threads_recents_idx ON assistant.mastra_threads("resourceId",(metadata->>'workspace'),"updatedAt" DESC,id);
ALTER TABLE assistant.mastra_messages ADD CONSTRAINT assistant_message_thread_fk FOREIGN KEY(thread_id) REFERENCES assistant.mastra_threads(id) ON DELETE CASCADE;
REVOKE ALL ON SCHEMA assistant FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA assistant FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='assistant_runtime') THEN
    CREATE ROLE assistant_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA assistant TO assistant_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA assistant TO assistant_runtime;
ALTER ROLE assistant_runtime SET search_path = assistant,pg_catalog;
ALTER ROLE assistant_runtime SET statement_timeout = '15s';
-- No public-schema grants, runtime DDL, resource-scoped memory, or telemetry tables.
