| Feature                    | Status       | Notes                                                     |
|----------------------------|--------------|------------------------------------------------------------|
| Anonymous Auth            | ✅ Done       | Supabase session working                                  |
| Image Upload              | ✅ Done       | Fully integrated with Supabase Storage                    |
| Model Type Dropdown       | ✅ Done       | 3 options: Keychain, Tag, Plaque                          |
| Engraving Input           | ✅ Done       | Input captured and stored                                 |
| Submit to DB              | ✅ Done       | Full payload written to Supabase                          |
| Mock STL Gen URL          | ✅ Done       | Visible post-checkout & in order history                  |
| Order Summary Screen      | ✅ Done       | Shows engraving, color, font, STL link                    |
| Stripe Payment Flow       | ✅ Done       | Stripe Checkout in test mode with proper metadata         |
| Partner Webhook (Print)   | ✅ Phase 3 Complete | Sends order to mock webhook, updates status + STL URL |
| Stripe Payment Flow    | ✅ Done    | Test payment succeeded, order marked as 'paid' in Supabase |
| STL Generation         | ✅ Done    | Confirmation page now downloads STL (mock for now)          |
| Webhook Infrastructure | ✅ Done    | Endpoint built; real-time test succeeded                    |

# 🔌 Current System Wiring (Phase 3)

## Frontend (React / Vite)
- `/checkout` page → Creates Stripe Checkout session
- `/confirmation` page → Polls Supabase for order status + STL URL
- Button: "Download STL File" → fetches from Supabase file URL
- Button: "Retry STL Generation" → triggers webhook again manually

## Backend (Express)
- POST `/webhook/stl` (mocked): receives orderId + payload → updates Supabase with fake STL URL + "ready" status
- POST `/webhook/payment`: triggered by Stripe after payment → updates order to `paid`

## Database (Supabase)
- `orders` table with:
  - `order_id`, `status`, `session_id`, `image_url`, `model_type`, `file_url`, etc.
- Status values: `pending`, `paid`, `ready`

## Stripe Integration
- Stripe session creates order with `status: pending`
- On success, webhook sets `status: paid`
- App then triggers STL generator webhook (mock)

## Environment
- Detects Replit domain via `REPLIT_DOMAINS` or `REPLIT_DEV_DOMAIN`
- Uses HTTPS in production, HTTP in dev
- Ports: 5000 (local), 80 (external)

## PHASE 4 SYSTEM WIRING

### ✅ Stripe Checkout → Supabase
- Order created on payment success
- Includes image URL, product type, and customer metadata

### ✅ Supabase → STL Generation
- `/api/generate-stl/:orderId` fetches image and simulates STL
- STL URL saved to Supabase, status updated

### ✅ Admin Dashboard
- `/admin` page loads all orders from Supabase
- Manual controls wired to:
  - `/api/generate-stl`
  - `/api/send-to-printer`
  - `/api/orders/:orderId/fail`
  - `/api/orders/:orderId/complete`

### ✅ Auto Dispatch
- If enabled, system watches for new `status = completed` orders
- Automatically sends to printer and triggers email

### ✅ Email Notifications
- Triggered on successful dispatch
- Uses SendGrid API (`SENDGRID_API_KEY`)
- Includes STL link + confirmation message

### ✅ Cleanup Endpoint
- `/api/cleanup-stl` removes old STL records (failed + older than 14 days)
- Manual trigger only (no cron yet)

### 🚧 Still Mocked
- STL generation uses fake data, not real AI or mesh service
- Webhook posts to mock endpoint, not real print API

### 🆕 STL Pipeline Fixes August 5th 2025

- ✅ Replaced legacy `triggerSTLGeneration` mock in payment flow with actual call to Replicate-based STL service
- ✅ Ensured `.stl` file only saved after successful `.glb` conversion and mesh validation
- ✅ Frontend polling now awaits `status='completed'` and confirmed download URL
- ⚠️ Scale normalization, background filtering, and quality checks pending Phase 5 polish
