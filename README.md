# Research Library

Invite-only Next.js reader for peer-reviewed papers from Dr. Prathiba Reddy’s practice. PDFs stay in a **private Supabase Storage** bucket and are streamed through the app. There is no download button, no copy, and no print. This is a deterrent with attribution (email watermark), not true DRM — operating-system screenshots cannot be blocked.

Clinic site: [prathibareddythodima.com](https://prathibareddythodima.com/) (Research Library cards). This app is meant to live on **`https://research.prathibareddythodima.com`**.

## Local setup

1. Copy env vars:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase project **Settings → API**. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. For paid access, add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Optional `STRIPE_PRICE_ID` uses a Stripe Price in subscription mode; otherwise Checkout bills `billing_settings` as a one-time amount. For the purchase confirmation email, add `RESEND_API_KEY` and `RESEND_FROM` (a verified Resend sender).

2. In the Supabase dashboard:

   - **Authentication → Providers → Email**: enable magic links (OTP).
   - **Authentication → URL configuration**:
     - Site URL: `http://localhost:3000` (switch to the production domain later)
     - Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback**`, and the same paths on the production host.
   - **SQL Editor**: paste and run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql), then [`supabase/migrations/002_portal_foundation.sql`](supabase/migrations/002_portal_foundation.sql), then [`supabase/migrations/003_confirmation_email.sql`](supabase/migrations/003_confirmation_email.sql). The first creates `profiles`, `papers`, `invites`, RLS, the private `papers` bucket, and the 10 clinic paper rows. The second adds portal copy fields, `access_grants`, `billing_settings`, and a public `covers` bucket. The third records which checkout session already received a confirmation email.

3. Create your admin user:

   - Open `/login`, enter your email, then **invite yourself first** via SQL (the login form only sends a link if an invite exists):

     ```sql
     insert into public.invites (email, paper_id, expires_at)
     values ('you@example.com', null, now() + interval '1 year');
     ```

   - Request the magic link, sign in, then promote:

     ```sql
     update public.profiles
     set role = 'admin'
     where email = 'you@example.com';
     ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. In **Admin**, upload PDFs, set paper copy and optional covers, set the subscription price, and invite readers. Readers always go through `/login` (or the home form) to receive a magic link.

## How access works

```
Clinic card → /papers/[slug]  (public portal)
           → existing email → magic link → /papers/[slug]/read
           → or purchase → Stripe Checkout → webhook grant → /papers/[slug]/unlocked
           → /api/papers/[slug]/file streams PDF with the service role
           → PDF.js draws pages on canvas (no text layer, no native toolbar)
```

Unauthenticated visitors stay on the paper portal. Only `/papers` (library index), `/papers/[slug]/read`, `/admin`, and the file API require a session.

An invite with `paper_id` null grants every published paper and also writes a library `access_grants` row. A specific `paper_id` still grants only that paper via `invites`. A grant (invite or purchase) unlocks the whole published library until `expires_at`. Admins bypass both checks.

Set price, duration, support email, and portal copy in **Admin**. Covers are optional. Stripe Checkout is the paid path: the webhook (`/api/stripe/webhook`) is the source of truth for grants. Point Stripe at that URL (local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`). The success page only displays status; it does not write access. After pay, the webhook sends a magic link and a confirmation email (**Your Research Access is Confirmed**) whose button opens `/login?next=/papers/[slug]/read`. A replay of the same checkout session does not send that confirmation again.

## Clinic site URL mapping

Ask whoever hosts [prathibareddythodima.com](https://prathibareddythodima.com/) to point each Research Library card at:

| Card on clinic site | New href |
| --- | --- |
| The Allergy Blueprint | `https://research.prathibareddythodima.com/papers/allergy-blueprint` |
| Understanding Vertigo | `https://research.prathibareddythodima.com/papers/understanding-vertigo` |
| The Healthy Ear | `https://research.prathibareddythodima.com/papers/the-healthy-ear` |
| Clearer Breathing | `https://research.prathibareddythodima.com/papers/clearer-breathing` |
| Allergy Care at Home | `https://research.prathibareddythodima.com/papers/allergy-care-at-home` |
| Balance & Recovery | `https://research.prathibareddythodima.com/papers/balance-and-recovery` |
| Voice Health | `https://research.prathibareddythodima.com/papers/voice-health` |
| Pediatric ENT Notes | `https://research.prathibareddythodima.com/papers/pediatric-ent-notes` |
| Sleep & Breathing | `https://research.prathibareddythodima.com/papers/sleep-and-breathing` |
| Clinical Research Digest | `https://research.prathibareddythodima.com/papers/clinical-research-digest` |

Until those hrefs change, this app is only reachable by URL (public portal; reading still needs invite or purchase).

## Deploy on Vercel

1. Push this repo and import it in Vercel.
2. Add the same env vars, including `RESEND_API_KEY` and `RESEND_FROM`. Set `NEXT_PUBLIC_SITE_URL=https://research.prathibareddythodima.com`.
3. Add the domain `research.prathibareddythodima.com` in Vercel, then create a DNS CNAME (or A) at your domain registrar pointing at Vercel.
4. Update Supabase Auth Site URL and Redirect URLs to the production origin (`https://research.prathibareddythodima.com/auth/callback`).
5. In Stripe, add a webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded` to `https://research.prathibareddythodima.com/api/stripe/webhook`, then put the signing secret in `STRIPE_WEBHOOK_SECRET`.
6. Smoke-test: uninvited email gets the generic “if invited…” message and no mail; invited email opens the viewer; test-mode purchase writes a grant, sends **Your Research Access is Confirmed**, and a replay of that webhook does not send a second confirmation; Network tab shows `/api/papers/.../file`, not a public Storage URL; print is blanked; canvas text cannot be copied.

## Protections (and limits)

Implemented: private bucket, server-side PDF proxy with no download filename, `Cache-Control: no-store`, frame deny, no text layer, one page at a time with previous/next and full screen, watermark with the reader’s email, access ID, and practice name, blocked context menu / copy / save / print shortcuts, overlay when the tab is hidden.

Not possible in a browser: blocking OS screenshots, phone photos, or a determined user with developer tools. Treat this as access control plus attribution.

## First PDF

Admin → choose a paper → upload a PDF. The file is stored as `{slug}.pdf` in the `papers` bucket and `papers.storage_path` is updated. Until a file exists, the viewer shows a placeholder message.
