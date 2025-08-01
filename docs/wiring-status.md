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

