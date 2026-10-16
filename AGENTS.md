<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Teacher pay rates are snapshotted on lesson_staff.rate_applied by a DB trigger; why: rate changes must never silently recalc past pay.
- Monthly charges are created only by the generate_charges DB function (unique student/month/kind) and payments auto-allocate via trigger; why: idempotent generation and consistent reconciliation.
- The 30/70 split math lives in src/lib/finance.ts with tests; why: single source for split and gym balance rules.
- Economic projections use a read-only database function sharing fee_amount and rate_for; why: forecasts must not create charges or change past pay.
- Imports use an owner-checked transactional database function and payment fingerprints; why: retries must not duplicate receipts or leave partial enrollments.
- Google Sheets reads use an authenticated owner-checked server function and the linked gateway connection; why: workspace sheet credentials never enter the browser.
