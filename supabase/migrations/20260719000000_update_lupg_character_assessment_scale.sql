alter table public.lupg_character_monitoring_reports
  alter column status drop default,
  alter column status drop not null;

alter table public.lupg_character_monitoring_reports
  drop constraint lupg_character_monitoring_reports_status_check;

update public.lupg_character_monitoring_reports
set status = case status
  when 'needs_discussion' then 'needs_guidance'
  when 'not_observed' then null
  else status
end
where status in ('needs_discussion', 'not_observed');

alter table public.lupg_character_monitoring_reports
  add constraint lupg_character_monitoring_reports_status_check
  check (
    status is null
    or status in (
      'needs_guidance',
      'not_applied',
      'in_progress',
      'consistent',
      'established'
    )
  );

-- Preserve historical coaching rows that predate mandatory notes while
-- enforcing the rule for every new or subsequently edited row.
alter table public.lupg_character_monitoring_reports
  add constraint lupg_character_monitoring_reports_guidance_note_check
  check (
    status is distinct from 'needs_guidance'
    or nullif(btrim(notes), '') is not null
  ) not valid;

comment on column public.lupg_character_monitoring_reports.status is
  'Nullable collective character-application assessment. NULL means Belum dinilai.';
