# Deployment and feedback logs

## Before updating an existing installation

1. Retain the previous application release and back up local configuration securely on the deployment machine. Do not send that backup for feedback.
2. Use Node.js 22.12 or later. The LDAP client has been updated to version 9; test the actual directory integration before routine use.
3. Confirm `SECRET_COOKIE_PASSWORD` is a random secret of at least 32 characters. Keep `AD_CONFIG_ENCRYPTION_KEY` unchanged if it encrypts an existing bind password. If that key is absent, the session secret also encrypts the bind password, so changing it requires re-entering the password.
4. Configure an `ldaps://` URL. Certificate validation is now mandatory. With no `caFile`, Node's trust store is used. For an internal CA, configure the correct CA PEM file. Plain LDAP and unvalidated TLS no longer work.
5. Set `APP_ORIGIN` to the public origin, for example `https://consent.example.local`. Forward browser Origin headers unchanged. The backend must be isolated from untrusted direct access.
6. If using machine restrictions, set `TRUSTED_CLIENT_IP_HEADER` to a dedicated header that your proxy **overwrites** with the actual client IP. Do not use a client-supplied value or append to a forwarded chain. `X-Forwarded-For` is unsupported. The lookup requires reverse DNS with forward confirmation. Loopback and missing/invalid identities are rejected. If the restriction is unused, leave both this variable and the AD machine group empty.
7. The consent folder must be an absolute path understood by the server OS. On Windows, a UNC share can be used if the service account has permission. On Linux, mount the share and use its local absolute path; the application currently returns that path and does not translate it for Windows clients.
8. Ensure `FORM_ALLOWED_HOSTS` includes the exact HTTPS hostname of each form source and redirect destination. The default is `www.rcr.ac.uk,rcr.ac.uk`. Non-public network addresses, credentials in URLs, nonstandard ports, and non-HTTPS sources are rejected. Source requests are bounded in time and size.
9. Agree a filing/retention policy: generated documents are now preserved, including multiple documents for the same patient and clinician. Filenames add a random suffix. Any downstream automation depending on the old exact naming convention must be checked. Uploads use generated filenames rather than the original client-supplied name.
10. Build and restart using the new release. Test with synthetic patients first. Do not set `SANDBOX_MODE` in a real deployment.

The production build uses the patched Next.js 15 release in the lockfile. A scoped PostCSS override keeps Next's bundled dependency on a patched compatible 8.x release; re-evaluate the override when updating Next.js. Run `npm ci` to reproduce the checked dependency tree.

## First-run configuration

Automatic unauthenticated setup access has been removed. If the Full Access Group DN is empty (or the old `CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com` placeholder), temporarily set `SETUP_TOKEN` to a random value of at least 32 characters. Generate secrets locally, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Restart, then log in as `setup` with this token as the password. This session allows configuration only and lasts 15 minutes. Configure and test LDAPS first. Set the User, Change and Full group DNs last. Once Full is configured, the setup session cannot access APIs; log in with an authorized AD account and remove `SETUP_TOKEN` from the environment.

If no administrator can log in, recovery is an operator task: correct the local AD configuration on the server or deliberately clear the Full group and temporarily enable the setup token. There is no remotely accessible unauthenticated recovery endpoint.

## Runtime configuration storage

By default, runtime configuration is in `src/config`, and the form catalogue is `public/consent-forms.json`. Both locations need to be writable by the service account for configuration changes.

For an external writable directory, set `CONFIG_DIR` and provision these files there:

- `app.json`, `ad.json`, `email.json`, `staff.json`
- `tumour-sites.json`, `tumour-groups.json`
- `consent-forms.json`

Copy the initial form catalogue from `public/consent-forms.json`. Keep configuration on persistent storage. Multiple independent application replicas have separate in-memory catalogue caches; this release does not provide coordinated multi-replica configuration updates. Configuration backup import is not a database transaction, so retain an operator backup when restoring.

## Enable and collect feedback

Set these environment variables and restart:

```dotenv
FEEDBACK_LOG_ENABLED=true
FEEDBACK_LOG_DIR=C:\ConsentFetcherLogs
```

On Linux use an absolute directory such as `/var/log/consent-fetcher`, provisioned with write access for the service account. If omitted, the log directory is `logs` under the application's working directory. Do not place the log directory under `public`, a patient-document folder, or a generally readable web share. Apply service-account-only ACLs on Windows; new directories/files use restrictive modes on POSIX.

The application creates `feedback-<process-id>.jsonl`. Each file is newline-delimited JSON. At 2 MiB it rotates to `.jsonl.1`, then `.jsonl.2`; at most three files are retained per process (approximately 6 MiB). Old feedback files are removed after seven days **on the next log write**. Multiple server processes have separate files. Stop logging or restart the service with `FEEDBACK_LOG_ENABLED=false` when the investigation is complete. Existing logs remain until removed or expired by a later write.

To provide feedback:

1. Note the local date/time, timezone, operation attempted, expected outcome and observed outcome. Do not include a patient name or identifier.
2. Reproduce once with synthetic data if possible.
3. Copy the relevant `feedback-*.jsonl*` files from the dedicated directory. For a consistent snapshot, copy after the operation finishes; a line written during copying can be incomplete.
4. Bring those files here with the description. API responses include `X-Correlation-ID`; include it if available, but a timestamp is sufficient.

Do **not** copy `.env`, AD/staff configuration, configuration backups, filled PDFs, browser network captures, the sandbox launcher's password output, or general application/proxy access logs. Those are outside the privacy filter and can contain sensitive data.

## What the feedback contains

- Application version, Node version, OS, UTC timestamp and a random correlation ID.
- A fixed operation name: login, patient lookup, PDF inspection/generation, configuration, upload, etc.
- Start/completion/failure events, response status, duration, PDF field count and byte count.
- PDF stages (`source`, `rendering`, `writing`) to distinguish source problems from PDF or share failures.
- An allowlisted error category, such as `EACCES`, `ENOSPC`, `ENOTFOUND`, `TIMEOUT`, or `LDAP_INVALID_CREDENTIALS`. Unrecognized errors become `UNKNOWN`.

No patient/staff values, patient identifiers, account names, passwords, cookies, tokens, request bodies, field names, URLs, filenames, filesystem paths, stack traces, or raw exception messages are serialized. This deliberately limits detail: an `UNKNOWN` error may require another targeted diagnostic change. Log writing failures do not block clinical operations; the process emits a fixed message saying that feedback logging is unavailable.

Example (synthetic):

```json
{"timestamp":"2026-09-07T12:00:00.000Z","version":"0.2.0","node":"v22.23.2","platform":"win32","correlationId":"00000000-0000-4000-8000-000000000000","operation":"pdf-fill","event":"failed","errorCode":"EACCES"}
```

## Controlled deployment walkthrough

Use synthetic data and record feedback timestamps for:

- An authorized login and a denied user; Read, Change and Full permissions.
- A refresh and explicit logout, including behavior with two tabs.
- AD connection test with the actual certificate chain; permitted and denied machines if used.
- KOMS demographic lookup, timeout/failure, and confirmation that the returned patient number matches the requested one.
- PDF preview, changing patient, changing clinician, selecting two templates quickly, and clearing a prefilled field.
- Two users generating documents for the same clinician; verify that both files remain and have correct contents.
- Share access, downstream filename handling, and manual filing/retention.

These checks supplement local automated tests. Passing them does not establish clinical-safety or regulatory certification.
