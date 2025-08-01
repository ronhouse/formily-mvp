# Wiring Status – Formily MVP

| Feature                  | Status        | Notes                                                     |
|--------------------------|---------------|------------------------------------------------------------|
| Anonymous Auth           | ✅ Done        | Supabase session working                                   |
| Supabase Client          | ✅ Done        | Connected via `.env` using VITE_SUPABASE_URL + ANON_KEY    |
| Environment Variables    | ✅ Done        | Misassignment fixed (URL ↔️ Key); stored in Replit Secrets |
| Image Upload             | ✅ Done        | Working locally; not yet using Supabase Storage            |
| Model Type Dropdown      | ✅ Done        | Options: Keychain, Tag, Plaque                             |
| Engraving Input          | ✅ Done        | Working; no length or profanity validation yet             |
| Order Summary Screen     | ✅ Done        | Displays user selections + STL mock                        |
| Mock STL Gen URL         | ✅ Done        | Fake URL returned successfully                             |
| Submit to DB             | ✅ Done        | Now inserts full payload into Supabase `orders` table      |
| Orders Table Schema      | ✅ Done        | Rebuilt to match app schema: color, font, quality, etc.    |
| TotalAmount Format Fix   | ✅ Done        | Converted to string to avoid Zod validation error          |
| Supabase Storage         | 🔄 In Progress | Bucket exists; upload integration not wired yet            |
| Stripe Payment Flow      | ❌ To Do       | Payment intent + webhook flow not yet implemented          |
| Partner Webhook (Print)  | ❌ Phase 3     | To trigger fulfillment partner integration post-payment    |
