# ConsentForm Fetcher

A Next.js application for finding RCR consent templates, importing patient demographics from KOMS, and saving pre-populated PDFs to a clinician folder.

## Local verification

Requires Node.js 22.12 or later (Node 22 recommended) and npm.

```bash
npm ci
npm run check
npm run build
```

`check` runs ESLint, TypeScript and regression tests. `npm run test:smoke` launches the isolated sandbox and verifies authentication, API behavior, page rendering and feedback privacy over HTTP (port 9002 must be free). CI also builds the application and checks production dependencies for high-severity advisories. TypeScript and lint errors are no longer ignored during builds.

To exercise the workflow without AD, KOMS, or a real file share:

```bash
npm run dev:sandbox
```

Open the localhost URL printed by the launcher and sign in as `demo` using its temporary password. Enter a synthetic patient number, select **Get Demographics**, select **Synthetic Doctor**, and choose the synthetic template. Review the fields and select **Submit & Save PDF**. Inspect the output and logs in the temporary directory printed by the launcher. Do not enter real patient information in this mode.

The sandbox binds to loopback, isolates configuration and document storage, serves a synthetic PDF, and stubs KOMS. It does not contact AD or KOMS. The sandbox flag has no effect in production. Temporary files remain after exit so they can be inspected; remove that specific directory when finished.

## Deployment configuration

For selecting this release on production and preserving a rollback checkpoint, follow [Selecting production branches](docs/production-branches.md).

See [Deployment and feedback logs](docs/deployment-and-feedback.md) before updating an existing installation. Version 0.2 introduces authentication, TLS, session, filename and retention changes.

Copy `.env.example` to `.env` and the `src/config/*.example.json` files to corresponding local `*.json` files. On PowerShell:

```powershell
Copy-Item .env.example .env
'app', 'ad', 'email', 'staff' | ForEach-Object {
    Copy-Item "src/config/$_.example.json" "src/config/$_.json"
}
```

Set a random `SECRET_COOKIE_PASSWORD` of at least 32 characters. Do not use the example placeholder. Configure AD over LDAPS, KOMS, and an absolute server-side consent folder. Real configuration and environment files must remain outside version control.

For first-run setup, temporarily set a random `SETUP_TOKEN` of at least 32 characters. On the login page, use username `setup` and that token as the password. Setup sessions last at most 15 minutes and can access configuration only. Save and test the directory connection before setting the Full Access Group DN. Setting that group closes setup access; sign in using AD thereafter and remove `SETUP_TOKEN`.

```bash
npm run build
npm start
```

Production requires HTTPS because session cookies are secure. Configure `APP_ORIGIN` with the externally visible origin when using a reverse proxy.

## Main workflow

1. Enter or retrieve patient demographics, then check them for accuracy.
2. Choose a clinician and, optionally, a Macmillan contact.
3. Select a populated unique patient identifier.
4. Select a consent template. If preview is enabled, review and edit its fields before saving. Otherwise generation begins immediately.
5. Use the displayed path to locate the saved PDF, complete the remaining fields, and sign/file it using the deployment's established process.

Changing patient or clinician details clears any existing preview. Select the template again to rebuild it. An inspection that finishes after changing patients or selecting another template is ignored.

PDFs are saved under `<consent folder>/<clinician>/TEMP/` with a timestamp and random suffix. `RequiresPatientSignature` and `FullySigned` folders are also created. **Existing PDFs are not automatically deleted.** Agree a document-retention and filing procedure with the deployment owner. The generated path is the actual server path; Linux paths are not automatically converted into Windows share paths.

The current workflow saves PDFs on the server. The legacy browser/Acrobat preference is retained in configuration for compatibility but does not open or download the generated file. The SEND EMAILS control remains a placeholder.

## Access and sessions

- **Read:** use patient/PDF workflows and view configuration.
- **Change:** also update ordinary configuration and form catalogues.
- **Full:** also change AD configuration and export/import the full configuration backup.
- **Setup:** temporary configuration-only access using an explicit setup token, available only before the Full Access Group is configured.

Server handlers and PDF actions enforce permissions independently of page controls. AD login requires membership in the configured User Access Group; elevated groups should inherit baseline membership. Users with no matching application role are denied.

Sessions expire after eight hours. Explicit Sign Out clears the browser cookie. Refreshing or closing a tab no longer triggers logout; tabs in the same browser share the session. Close the session explicitly when leaving a shared workstation. Role changes in AD take effect on the next login; existing sessions are not revalidated against AD on each request.

Machine restrictions are optional network controls, not a separate authentication factor. They require a trusted proxy that replaces a dedicated client-IP header, blocks direct backend access, and a working DNS configuration. See the deployment guide.

## Feedback and known limits

Enable the dedicated feedback log using the deployment guide. It records fixed operation stages, timings, status/error codes and correlation IDs, without patient values or credentials. Share these files with a description of the operation and its approximate time. Do not share filled PDFs, environment files, configuration backups, browser HAR files, or general server logs as feedback.

Local tests use synthetic data and mocked integrations. They cannot validate your real AD certificate chain, group nesting, KOMS session behavior, proxy rules, Windows share permissions, or operational retention policy. Those require a controlled deployment walkthrough. Form field matching remains heuristic and generated clinical documents require human review. This repository does not establish compliance with clinical, accessibility or information-governance standards.
