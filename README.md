# Pink Birthday Website ♡

A responsive Arabic RTL birthday site with:
- Guest PIN: `2509`
- Admin PIN: `1910`
- Photo gallery, audio uploads/player, editable private letter and subtitle
- Supabase Postgres database + Storage
- PIN verification in a Supabase Edge Function (not hard-coded in the browser)

## Important
The PINs are checked on the server, not in `index.html`. Still, 4-digit PINs are easy to guess. For a real public deployment, use longer PINs or add rate limiting/WAF rules. Never put the Supabase `service_role` key in the website.

## Setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`.
3. Deploy the Edge Function named `birthday-api`:
   - Supabase CLI: `supabase functions deploy birthday-api`
   - Or create the function in the Supabase Dashboard and paste `supabase/functions/birthday-api/index.ts`.
4. Set function secrets (Dashboard > Edge Functions > Secrets, or CLI):
   ```
   BIRTHDAY_GUEST_PIN=2509
   BIRTHDAY_ADMIN_PIN=1910
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
   `SUPABASE_URL` is normally available automatically to Edge Functions.
5. Copy your deployed function URL. It looks like:
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/birthday-api`
6. In `index.html`, replace:
   `YOUR_SUPABASE_FUNCTION_URL`
   with the function URL above.
7. Publish `index.html` and the `supabase` folder using your preferred static hosting. The SQL and function are backend setup files; the website itself is `index.html`.

## Notes
- The storage bucket is public so the guest page can play/view uploaded media. Do not upload private documents or anything sensitive.
- Photos are limited to 8 MB; audio to 15 MB in the interface.
- Upload only music/audio you have permission to use.
- For extra protection, configure rate limiting on the Edge Function and use longer secrets than the requested 4-digit PINs.
