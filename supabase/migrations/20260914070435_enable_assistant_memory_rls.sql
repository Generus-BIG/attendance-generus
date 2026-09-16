-- Follow-up for live databases where 20260914064703 was applied before RLS hardening.
ALTER TABLE assistant.mastra_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant.mastra_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant.conversation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant.deleted_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY assistant_runtime_all_threads ON assistant.mastra_threads
  FOR ALL TO assistant_runtime USING (true) WITH CHECK (true);
CREATE POLICY assistant_runtime_all_messages ON assistant.mastra_messages
  FOR ALL TO assistant_runtime USING (true) WITH CHECK (true);
CREATE POLICY assistant_runtime_all_runs ON assistant.conversation_runs
  FOR ALL TO assistant_runtime USING (true) WITH CHECK (true);
CREATE POLICY assistant_runtime_all_deleted_threads ON assistant.deleted_threads
  FOR ALL TO assistant_runtime USING (true) WITH CHECK (true);
