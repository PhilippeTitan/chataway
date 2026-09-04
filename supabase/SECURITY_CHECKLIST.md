# Supabase Security Checklist

The repository enforces authenticated ownership for `seen_videos` through the
`002_auth_security.sql` migration. Apply migrations before enabling production
traffic.

## Authentication

- **URL Configuration:** set Site URL to the real HTTPS origin. Add only trusted
  production and local callback URLs, including `/auth/callback`.
- **Sign In / Providers:** enable only providers that have been configured and
  verified. Keep anonymous sign-ins enabled only if guest mode is required.
- **Sessions:** use the shortest practical inactivity timeout, enable single
  session per user when appropriate, and revoke refresh tokens after password
  changes.
- **Multi-Factor:** enable TOTP and require an enrolled factor for privileged
  accounts. Do not treat an email confirmation as a second factor.
- **Passkeys:** enable the Passkeys beta, register the production origins, and
  test recovery before requiring passkeys. The installed Supabase JS client in
  this repository does not expose a passkey/WebAuthn method, so registration and
  login must use Supabase's current documented client when that API is adopted.

## Abuse Protection

- **Rate Limits:** keep the lowest limits that support normal sign-in, token
  refresh, password reset, and OTP traffic. Monitor false positives after launch.
- **Attack Protection:** enable CAPTCHA for sign-up, sign-in, password reset,
  and anonymous sign-in if available for the project. Configure the provider's
  secret only in Supabase, never in `NEXT_PUBLIC_*` variables.
- **Auth Hooks:** add a blocking hook for policy checks such as age/consent,
  disposable-email rules, and account status. Keep hook endpoints private and
  verify Supabase's signing secret.

## Observability and Database

- **Audit Logs:** enable retention/export appropriate for incident response and
  alert on password resets, factor changes, provider changes, and admin actions.
- **Policies:** keep RLS enabled on every user-owned table. Never expose a
  service-role key to the browser or commit it to the repository.
- **Database:** restrict the API schema to required tables/functions, review
  exposed functions for `SECURITY DEFINER`, and revoke execute privileges from
  `anon` unless a function is intentionally public.
- **Performance:** monitor Auth Performance and database query timings after
  enabling protections; add indexes based on observed plans rather than guesses.