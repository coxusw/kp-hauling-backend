# KP Hauling & Dumpster Services Backend MVP

Local-only business backend prototype for tracking dumpster inventory, rentals, pickup deadlines, availability, alerts, and dispatch logistics. The app starts as a blank slate so you can enter real test records yourself.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase-backed test structure
- Blank local data by default

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000/hauling
```

The app is configured with a `/hauling` base path so it can be tested at:

```text
https://tap-deck.com/hauling
```

Routes outside `/hauling` are intentionally ignored by this app and its middleware so the existing Tap Deck site is not affected.

If Supabase variables are not configured, the app falls back to local test storage. Hosted testing should use Supabase.

## Test Login

The local/demo auth layer starts with this owner login:

```text
Email: admin@kp.local
Password: admin123
```

Owner/admin users can see the full backend and add driver/admin logins from `/drivers`.

Driver users only see:

- `/driver`
- `/timecard`
- `/driver-availability`

This login system is for test/demo hosting only. It includes middleware protection for `/hauling/*`, but before production use, replace it with Supabase Auth and database-backed role policies.

## Blank Local Data

The live app starts with:

- No dumpsters
- No scheduled jobs
- No current deliveries
- No pickups

Use Schedule Job to:

- Schedule new customer jobs
- Assign an available dumpster to a job
- Enter one-way mileage from the dumpster's current address to the job address
- Enter scheduled drop-off and pickup times
- Delete canceled or incorrectly entered jobs
- Edit jobs after scheduling, delivery, pickup-needed, overdue, or completion
- Add extra charges and partial payments as they happen

Use Inventory to:

- Add dumpsters
- Take available dumpsters out of service
- Put out-of-service dumpsters back in service
- Delete dumpsters that are no longer in service after active jobs are cleared

When Supabase is configured, records are saved to KP-prefixed Supabase tables. If Supabase is not configured, records are saved in browser `localStorage` for local review.

An optional sample/reference seed file remains in:

```text
lib/seed-data.ts
```

That file can be useful later for testing migrations or Supabase seed scripts, but it is not loaded by default.

The sample data includes:

- 10 dumpsters across 10 yd, 15 yd, 20 yd, and 30 yd sizes
- 8 rental jobs
- Available, scheduled, delivered, pickup-needed, overdue, completed, in-transit, and out-of-service examples
- Alerts for due-tomorrow pickups, due-today pickups, overdue dumpsters, out-of-service dumpsters, and unassigned scheduled work

The local alert/calendar operating date is set in:

```text
lib/data.ts
```

```ts
export const TODAY = "2026-06-07";
```

Change that value when you want to review how alerts and calendar buckets respond.

## Pages

- `/` - dashboard metrics, priority work, and alerts
- `/inventory` - add inventory and remove dumpsters
- `/schedule` - schedule customer jobs and prevent double booking
- `/dispatch` - grouped dispatch board by job/status lane
- `/calendar` - today, tomorrow, overdue, and future scheduled work
- `/availability` - availability by dumpster size
- `/driver-availability` - driver availability board and driver availability updates
- `/drivers` - owner/admin driver and admin login management, cash handoffs, hourly rates, and timecard payouts
- `/log` - finished job history, totals, expenses, exports, and projections
- `/driver` - mobile-friendly driver work list with local mark-delivered and mark-picked-up actions
- `/timecard` - driver-entered work time with required notes and payout history

## Mobile App And Notifications

The app includes PWA metadata so it can be added to a phone home screen from the browser while testing.

Push notifications use browser push subscriptions saved in Supabase. Users can choose the reminder types they want and set their own daily due-reminder time from Settings.

- Admin: driver availability changed
- Admin: drop-offs due, pickups due, and overdue pickups
- Driver: delivery assigned
- Driver: pickup assigned
- Driver: assigned drop-offs due, assigned pickups due, and assigned overdue pickups

Vercel Cron checks `/hauling/api/cron/due-reminders` every 15 minutes. The endpoint only sends when a user's saved reminder time is reached, and it records a sent-history row to avoid duplicate same-day reminders.

## Supabase Notes

Run the setup SQL in Supabase SQL Editor:

```text
supabase/kp-hauling-setup.sql
```

If the main setup was already run before cron reminders existed, run this incremental SQL instead:

```text
supabase/kp-hauling-cron-reminders.sql
```

If the main setup was already run before custom dumpster sizes existed, run this incremental SQL too:

```text
supabase/kp-hauling-inventory-options.sql
```

If the main setup was already run before driver timecards existed, run this incremental SQL too:

```text
supabase/kp-hauling-timecards.sql
```

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET` optional, but recommended

## Mileage Tracking

Each dumpster has a `Current Address` field. When you schedule a job and assign a dumpster, the form shows the dumpster's starting address alongside the job address, then lets you enter one-way mileage manually.

Manual mileage keeps the local MVP simple and avoids map API costs. Automatic mileage can be added later when the app is ready for production.

## Scheduling Safety

When a dumpster is selected for a new job, the app checks active jobs for overlapping rental windows. If the same dumpster is already assigned during that drop-off to pickup window, scheduling is blocked and a warning appears.

Existing double bookings also appear in dashboard alerts so old bad data can be cleaned up.

Recommended future tables:

- `dumpsters`
- `rental_jobs`
- `customers`
- `drivers`
- `payments`
- `notifications`
- `rental_agreements`

## Vercel-Ready Notes

This prototype is configured to run under `/hauling` for a test deployment, so the Vercel project/domain should serve it at:

```text
tap-deck.com/hauling
```

Set this environment variable in Vercel if you want the path to stay explicit:

```text
NEXT_PUBLIC_BASE_PATH=/hauling
```

When you are ready for hosting:

1. Create the Supabase project and tables.
2. Add the same Supabase variables in Vercel project settings.
3. Add the VAPID push keys in Vercel project settings.
4. Keep production-only secrets out of committed files.

For hosted testing, the app uses Supabase records and Supabase Auth.

## Future Features

This structure leaves room for:

- Customer-facing booking form
- Customer portal
- Online payment tracking
- SMS/email notifications
- Rental agreements
- Driver login
- Supabase auth and database
