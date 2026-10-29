# Context

## Vision

Help a solo dentist go paperless: every patient's information, chart, X-rays, appointments and payments in one private place that she can search in seconds from a phone, tablet or laptop. It should be simple enough to use between patients, and cheap enough to run on free tiers.

## Target users

| User | Needs |
|---|---|
| **Pilot dentist** | Store patient records and find them fast. Works in two places: a station at a **partner clinic** (earns a commission share) and her **own clinic at home**. Wants earnings and supplies kept separate per place. |
| **Other individual dentists (later)** | The same app with their own account. Each sees only their own patients and data. |
| **Admin (the developer)** | Creates and disables dentist accounts, resets passwords, and can see all data for support. |

There is no receptionist role in v1.

## Core features (v1)

| Feature | What it covers |
|---|---|
| Patient records + search | Demographics, contact, emergency contact, medical history and allergies, notes, privacy consent. Fuzzy search by name, phone or patient code from any page (Ctrl+K). |
| Dental chart | FDI tooth diagram (adult 11–48, child 51–85). Per-tooth, per-surface conditions with dates and notes. |
| Treatments | Procedures done, with teeth, date, workplace, fee and lab fee. |
| X-rays & files | Upload and view X-rays, photos and documents per patient (private storage). |
| Appointments | Day/week calendar per dentist, colour-coded by workplace. Email reminders before each appointment. |
| Billing & payments | Payments (cash, GCash, Maya, card, bank), running balance per patient, printable receipt. |
| Earnings & commission | Per workplace: gross, collected, her share (commission %, optional lab-fee deduction), payouts received from the partner clinic, expenses, net. Monthly report + CSV. |
| Inventory | Items per workplace, stock in/out/adjust history, low-stock alerts. |
| Accounts | Admin-created dentist accounts. Roles: `admin`, `dentist`. |

## Out of scope (for now)

| Not in v1 | Why |
|---|---|
| SMS reminders | Costs per message. Email is free with Resend and the purchased domain. |
| Clinic-level multi-location (shared staff/patients) | Each dentist works solo. Workplaces cover her two places. |
| Receptionist role | Only the dentist uses it. |
| Offline mode | A hosted web app is simpler and safer for backups. |
| Advanced analytics | The dashboard and earnings report cover what's needed. |
| Native mobile app | Responsive web only. |
| Public sign-up / online booking | Accounts are created by the admin. |

## Key user flows

1. **Find a patient.** Press Ctrl+K (or tap search) → type part of a name, phone or `P-0012` → open the patient. Misspellings still match.
2. **New patient intake.** Patients → New → fill in details and medical history → tick privacy consent (and the reminder opt-in if they want emails) → save → lands on the patient page.
3. **Chart and treatment.** Patient → Chart → click a tooth → choose surfaces and condition → save. Treatments → add procedure, teeth, workplace, fee and lab fee. The fee adds to the patient's balance.
4. **Upload an X-ray.** Patient → Files → upload (or take a photo on a phone) → it appears in the grid → click to view full screen.
5. **Book an appointment → reminder.** Appointments → click a slot (or "New") → pick the patient, workplace and time → save. About 24 hours before (configurable), the patient gets an email if they opted in. A manual "Send reminder now" is also available.
6. **Take a payment.** Patient → Billing → Add payment (amount, method, who collected it) → print the receipt with that workplace's header.
7. **Monthly earnings.** Earnings → pick a month → see each workplace side by side: her share, what the partner clinic still owes, expenses and net. Record a payout when the clinic pays her. Export CSV.
8. **Inventory.** Inventory → choose a workplace → restock, record use or adjust. Items below their reorder level show on the dashboard.
9. **Admin creates an account.** Admin → Accounts → New dentist (name, email, temporary password) → the dentist signs in and sets up their workplaces in Settings.

## Constraints

- **Data Privacy Act of 2012 (RA 10173):** record consent per patient, keep data private per dentist, soft-delete only, keep an audit log, no clinical details in emails.
- **Free tiers first:** Neon free, Cloudflare R2 (10 GB free, card on file), Resend free, Vercel Hobby. Vercel Hobby is **non-commercial only**, so move to Pro before charging any dentist.
- **Locale:** English UI, Philippine peso (₱, `en-PH`), timezone `Asia/Manila`, dates like `29 Oct 2026`.
- **Devices:** responsive web, from phone (375 px) to desktop. Touch targets of at least 44 px.
