# Persistence recovery

This runbook covers the Alexander onboarding database and the private submission archive. It does not include passwords, secret values, or customer questionnaire contents.

## What to restore

| System | Holds | Recovery |
| --- | --- | --- |
| RDS PostgreSQL `alexander-onboarding` | Current draft and every submission row, including full JSON | Automated backups and point-in-time recovery, 7 days |
| S3 submission archive | Immutable `raw-draft.json`, `normalized-config.json`, and `manifest.json` | Versioning is enabled. Objects are not the draft database. |
| Browser localStorage | A resilience copy for the person editing | Not a backup of other sessions |

The database is not publicly accessible. Restore it inside the VPC. Do not open `0.0.0.0/0` or set `PubliclyAccessible` to true to run a query.

## Restore PostgreSQL

1. In the AWS console or CLI, find the instance identifier `alexander-onboarding` in `us-east-1`.
2. Restore a snapshot or a point-in-time copy to a new instance. Keep the new instance private, encrypted, and in the Alexander VPC.
3. Do not delete the original instance while deletion protection is on. Turning protection off is a separate, deliberate change.
4. Point the RDS Proxy at the restored instance only after the application database role and schema are present. Re-run the migration Lambda if the restored copy predates migration `001`. The migration does not drop tables.
5. Confirm with the persistence Lambda `schemaStatus` operation that `onboarding_sessions`, `onboarding_submissions`, and `schema_migrations` version `001` exist.

Point-in-time recovery creates a new instance. Application traffic moves only when the proxy target is updated. Keep the previous instance until a draft read and a submission checksum check succeed.

## Find a submission

Submissions are keyed by the onboarding session id and the content revision stored on the row. The session id is the `alexander_onboarding_session` cookie value, a UUID.

The S3 prefix is:

```text
onboarding/<sessionId>/submissions/<sha256 of the content revision>/
```

The database row `onboarding_submissions` stores the raw questionnaire, the normalized configuration, the object keys, and both SHA-256 hashes. Use the persistence Lambda `inspectSession` operation. It returns hashes, sizes, and whether the S3 bytes match. It does not need to be printed with the questionnaire body.

## Check a snapshot checksum

1. Read `raw_sha256` and `normalized_sha256` from `onboarding_submissions` for that session and revision.
2. Download the three objects with credentials that can read only this bucket. Keep the files out of logs and out of git.
3. Compute SHA-256 of `raw-draft.json` and `normalized-config.json`.
4. Compare those digests to the database columns and to `manifest.json`.
5. A matching manifest means the snapshot set finished. A database row is still required before Alexander treats the questionnaire as received.

If the object hash does not match the row, keep both copies and investigate before deleting anything. Versioning on the bucket retains overwritten objects.

## What not to do

- Do not restore by making the database public.
- Do not copy a production questionnaire into a ticket, a log, or a git commit.
- Do not delete `onboarding_submissions` rows to “clean up” a retry. The same revision is one row.
- Do not remove the KMS key. RDS storage and the archive depend on it, and the key is retained on stack deletion.
