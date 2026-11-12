# IServ SSO setup for DR1FT

The school administration UI stores the IServ issuer URL, client ID and encrypted client secret for each school.

## Required deployment configuration

Generate a dedicated 32-byte encryption key:

```bash
openssl rand -hex 32
```

Set the resulting 64-character hex value as `DR1FT_SSO_ENCRYPTION_KEY` in the Editorial application's Vercel environment (Preview and Production as appropriate). Keep this key stable and back it up in the organization's secret manager. Losing it makes stored client secrets unrecoverable. Never use the Supabase anon key or service-role key for this purpose.

Apply the migration:

```
supabase/migrations/20261103100000_school_sso_connections.sql
```

## School-side setup

A school administrator registers an external application named DR1FT in IServ under **Verwaltung → System → Single-Sign-On**. The exact redirect URI will be supplied when the OIDC authorization-code callback is implemented. Do not use the IServ-internal redirect URI shown in an ordinary IServ login URL.

The school administrator then enters the IServ issuer/base URL, client ID and client secret in **Schulverwaltung → Anmeldesysteme**.

## Security notes

- Client secrets are encrypted server-side with AES-256-GCM before being stored.
- The encryption key is held only in the Editorial server environment.
- The API returns only whether a secret exists; it never returns ciphertext or plaintext.
- Access is restricted to active school administrators, school leads and platform administrators.
- This branch provides credential management only. It does not yet implement OIDC discovery, authorization, callback, token validation or a live IServ login button.
