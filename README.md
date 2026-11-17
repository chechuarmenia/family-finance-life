# Family Finance Life

Independent mobile web app hosted on GitHub Pages, with Supabase Auth, PostgreSQL and a Supabase Edge Function. No ChatGPT account is required.

## App and source
- Site: https://chechuarmenia.github.io/family-finance-life/
- Frontend: `docs/index.html`, `docs/auth.js`, `docs/config.js`.
- Backend: `supabase/functions/family-finance/index.ts` and `rates.js`.
- Schema: `schema.sql` (already applied to the hosted project; do not reapply).
- Project reference: `qhhjdyhasdjypeswxbxi`.

Financial records and membership emails live only in Supabase. Never commit household exports, passwords, access tokens, service-role keys or backups. The publishable key in config.js is intentionally public; RLS controls access.

## Working together (Chechu and Vahan)
Both people can use the dashboard from any browser with their own verified email and password. The app login is independent of GitHub, ChatGPT and Claude.

To edit the app code: Vahan needs a free GitHub account and collaborator/write permission on this repository. Either person can edit files or use their preferred AI editor, commit changes, and publish them. Claude assistance does not itself grant access to GitHub or Supabase. Backend changes require a Supabase account with an appropriate role in the organization; app membership does not grant infrastructure access.

## Publishing frontend changes
GitHub Pages publishes the `main` branch's `/docs` directory. Changes to docs/ publish through GitHub's normal Pages build. Test before committing. No frontend build step is required.

## Publishing backend changes
Deploy the family-finance function from the checked-in function files through the Supabase CLI or MCP. Preserve verify_jwt=true and server-side user verification. The function uses only user-scoped requests and database RLS; it does not bypass policies with a service key.

## Auth setup
Set the Supabase Auth Site URL and Redirect URLs to https://chechuarmenia.github.io/family-finance-life/ so confirmation and password-reset emails return here. Configure production email delivery before relying on account signup or password recovery. The app offers email/password login, account creation and password recovery.

## Data rules
Accounts are separated by location and currency. Historical reports use each movement's saved daily reference rates. Current balances use the latest daily rates. Transfers move existing money and are never counted as income or expense. Use the actual sent/received amounts. Optimistic version checks reject overwrites from stale devices.

## Database access
family_members is an administrator-managed allowlist. Each signed-in user can see only their own membership. family_state is readable/writable only by members. save_family_state is security invoker and uses version matching. Never replace membership with an unconditional authenticated policy.
