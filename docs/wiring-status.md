# Wiring Status – Formily MVP

| Feature                | Status        | Notes                                                         |
|------------------------|---------------|---------------------------------------------------------------|
| Anonymous Auth         | ✅ Done        | Supabase session working                                      |
| Image Upload           | ✅ Done        | Supabase preview confirmed                                    |
| Model Type Dropdown    | ✅ Done        | 3 options: Keychain, Tag, Plaque                              |
| Engraving Input        | ✅ Done        | Length not yet validated                                      |
| Submit to DB           | ✅ Done        | Fully integrated with Supabase orders table                   |
| Mock STL Gen URL       | ✅ Done        | Linked in confirmation + order history                        |
| Order Summary Screen   | ✅ Done        | Shows model, engraving, STL link                              |
| Stripe Payment Flow    | ✅ Done        | Test mode complete: summary → checkout → confirmation         |
| Partner Webhook (Print)| ❌ Phase 3     | Triggers after payment for real STL generation + fulfillment  |
