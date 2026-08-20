# MT, PHQ, and Intensif Context

The LUPG workspace includes PHQ, APR Intensif, and AR Intensif alongside the
existing monthly-report workflow. The approved product specification is
[`docs/superpowers/specs/2026-08-20-mt-phq-intensif-design.md`](docs/superpowers/specs/2026-08-20-mt-phq-intensif-design.md).

## Roles and Routes

`mt` (Mubalegh Tugasan/Guru) is a first-class role assigned to exactly one
kelompok through JWT `app_metadata.kelompok`. It is deliberately not a variant
of `team_manager`:

| Role | PHQ | APR / AR Intensif | Existing operational and monthly-report features |
| --- | --- | --- | --- |
| `super_admin`, `admin` | All kelompok and desa recap | All kelompok and desa recap | Existing access remains |
| `mt` | Assigned kelompok only | Assigned kelompok only | No access |
| `team_manager`, `member` | No access | No access | Existing access remains |

MT's LUPG landing page is `/admin/lupg/phq/summary`. Protected routes are:

- `/admin/lupg/phq/summary`
- `/admin/lupg/phq/participants`
- `/admin/lupg/phq/progress`
- `/admin/lupg/phq/attendance`
- `/admin/lupg/apr-intensif`
- `/admin/lupg/ar-intensif`

Frontend visibility and `ROUTE_ACCESS` are usability boundaries. Database RLS
and server-side RPC checks are the authorization boundary. Keep the explicit
PHQ child route rules and sidebar gating synchronized when changing access.

Creating or editing an MT user requires kelompok selection in the management
dialog and `manage-user` Edge Function. Existing MT accounts that were created
without a kelompok must be reassigned and must refresh their JWT by signing in
again.

## PHQ

PHQ has an independent roster in `lupg_phq_participants`; it is never linked
to main `participants` and never affects Generus census data. A PHQ participant
has name, kelompok, gender, active status, optional birth date, category
(`ACR`, `APR`, `AR`, `GPN A`, or `GPN B`), and manually maintained highest
hafalan snapshot. The teacher-entered juz mastery percentage is authoritative;
do not derive it from ayat ranges.

PHQ meetings (`lupg_phq_meetings`) belong to one kelompok and calendar month.
There may be at most four per kelompok/month. Ordered by date, they display as
`M1` through `M4`; they are not calendar weeks. Progress and attendance are
separate child records for the same meetings:

- `lupg_phq_progress`: one row per participant/meeting; stores juz, surat,
  ayat range, score, and manual mastery percentage. Score predicates are
  Mumtaz 90-100, Jayyid Jiddan 80-89, Jayyid 70-79, Maqbul 60-69, and Dhaif
  below 60.
- `lupg_phq_attendance`: one row per participant/meeting using `Hadir`,
  `Izin`, `Sakit`, or `Alpa`.
- `lupg_phq_monthly_notes`: one free-form note per `kelompok x month`.

Monthly attendance is `Hadir / all PHQ meetings in the selected month * 100`.
Every non-`Hadir` status counts as absent. Historical PHQ data remains editable.
The parent kelompok on PHQ participant and meeting rows is immutable; create a
new correctly scoped record rather than moving either parent. Child triggers
require participant and meeting kelompok to match.

MT sees only its kelompok summary. Admin and Super Admin receive a desa recap
with kelompok filtering and a juz distribution where each PHQ participant is
counted once under the manually maintained current highest juz.

## APR and AR Intensif

APR and AR Intensif are date-based attendance trackers using main
`participants`, not a new roster:

- `APR_INTENSIF` candidates are active main participants categorized `APR`.
- `AR_INTENSIF` candidates are active main participants categorized `AR`.
- Activities have no per-month limit. Attendance statuses are `Hadir`, `Izin`,
  `Sakit`, and `Alpa`; the monthly percentage counts only `Hadir`.
- An attendance row is a historical snapshot. A candidate must be active and
  category-matched when added, but later deactivation or recategorization does
  not invalidate an existing attendance row.

`list_lupg_intensif_candidates(p_program_code, p_kelompok_id)` is a
`SECURITY DEFINER` RPC and accepts only `APR_INTENSIF` or `AR_INTENSIF`. For
MT, it ignores the browser-supplied kelompok and uses `user_kelompok_id()`.
Do not replace it with broad browser access to `participants`.

Authorized Intensif users can edit a candidate's main participant identity,
gender, category, birth data, and active status from the Intensif UI. They
cannot move the participant to another kelompok there. The
`update_lupg_intensif_participant` RPC omits kelompok from its parameters and,
for MT, verifies the current participant kelompok against `user_kelompok_id()`
before updating. Keep both protections if the edit surface changes.

The participant trigger may auto-promote `GPN A` to `GPN B` based on birth date.
The client must use the returned category after an Intensif participant update,
not assume its submitted category persisted unchanged.

## Data and Migration Boundaries

The initial MT/PHQ/Intensif schema and policies live in migrations
`20260820000000_mt_phq_intensif.sql` through
`20260820230000_add_intensif_candidate_rpc.sql`. Subsequent hardening covers
PHQ kelompok immutability, serialized/deferred scope validation, historical
attendance, and active PHQ progress participants. Candidate details and
scoped participant editing are in:

- `20260821010000_expand_intensif_candidate_details.sql`
- `20260821020000_add_intensif_participant_edit_rpc.sql`

New functions require a fixed `search_path`. Prefer `SECURITY INVOKER`; the
candidate and participant-edit RPCs are `SECURITY DEFINER` only because they
enforce a narrower authority surface than direct participant-table access.
Their execute grants are limited to `authenticated`, with `PUBLIC` and `anon`
revoked.
