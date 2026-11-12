#!/usr/bin/env bash
set -euo pipefail

# DR1FT: ledger-only migration version repair for byte-identical SQL pairs.
# This script does NOT execute migration SQL. It changes only migration history.
# Run from the repository root after: supabase link --project-ref oegshknzeqmjmkraxozr
#
# Default: print the commands only.
# Apply:   ./scripts/supabase-repair-exact-migration-versions.sh --apply
#
# Before --apply: take a database backup and inspect the linked project.

PROJECT_REF="oegshknzeqmjmkraxozr"

REMOTE_VERSIONS=(
  20261104220252
  20261104220254
  20261104220257
  20261104220259
  20261104220301
  20261104220311
  20261104220313
  20261104220338
  20261106123614
  20261106155937
  20261106160159
  20261107094755
  20261107094824
  20261107101744
)

LOCAL_VERSIONS=(
  20261104180000
  20261104190000
  20261104200000
  20261104210000
  20261104220000
  20261104250000
  20261104260000
  20261104270000
  20261106143000
  20261106170500
  20261106171500
  20261107120000
  20261107121500
  20261107112000
)

printf '%s\n' "DR1FT migration-ledger repair"
printf '%s\n' "Expected linked project: ${PROJECT_REF}"
printf '%s\n' "Exact SQL matches to remap: ${#REMOTE_VERSIONS[@]}"
printf '%s\n' ""
printf '%s\n' "Remote versions to mark reverted:"
printf '  %s\n' "${REMOTE_VERSIONS[@]}"
printf '%s\n' ""
printf '%s\n' "Local versions to mark applied:"
printf '  %s\n' "${LOCAL_VERSIONS[@]}"
printf '%s\n' ""

if [[ "${1:-}" != "--apply" ]]; then
  cat <<'EOF'
PREVIEW ONLY. No database change was made.
After taking a backup and confirming the linked project, run:
  ./scripts/supabase-repair-exact-migration-versions.sh --apply
EOF
  exit 0
fi

if [[ "${DR1FT_ALLOW_PROD_MIGRATION_REPAIR:-}" != "YES" ]]; then
  echo "Refusing to modify migration history."
  echo "Set DR1FT_ALLOW_PROD_MIGRATION_REPAIR=YES only after backup and project verification."
  exit 2
fi

read -r -p "Type the exact project ref to confirm (${PROJECT_REF}): " CONFIRM
if [[ "${CONFIRM}" != "${PROJECT_REF}" ]]; then
  echo "Project confirmation did not match. Aborting."
  exit 2
fi

echo "Current linked migration ledger (review before continuing):"
supabase migration list --linked

read -r -p "Type REPAIR-LEDGER-ONLY to proceed: " FINAL_CONFIRM
if [[ "${FINAL_CONFIRM}" != "REPAIR-LEDGER-ONLY" ]]; then
  echo "Final confirmation missing. Aborting."
  exit 2
fi

# First remove only the proven old ledger versions, then register the exact
# same SQL under the repository's canonical local versions. No SQL is replayed.
supabase migration repair "${REMOTE_VERSIONS[@]}" --status reverted --linked
supabase migration repair "${LOCAL_VERSIONS[@]}" --status applied --linked

echo ""
echo "Post-repair migration ledger:"
supabase migration list --linked
echo ""
echo "Dry-run pending SQL migrations:"
supabase db push --dry-run --linked
