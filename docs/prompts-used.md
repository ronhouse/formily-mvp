# Prompts Used – Replit Agent & GPT

## 2025-07-29 – Full Scaffold
> Build a React web app called Formily. The app allows users to upload a photo...

Result: Scaffolded Vite frontend, upload UI, routing, auth, Express backend.

## 2025-07-30 – Auth + Order Logic
> Add anonymous authentication using Supabase...

> Add a function to insert the order into Supabase...

## Next:
- STL mock logic + summary screen
- Stripe test checkout

## 2025-07-30 – Button Routing + Upload Fix
> Fix the following two issues in the Formily app:
> 1. Make the “Get Started” button route to the upload/customization screen
> 2. Fix the photo upload flow (FormData, multer, UI errors, success flow)

Result: Working upload flow and redirect, server responds with image URL

---

## 2025-07-30 – Mock STL Generator + Summary Screen
> After image upload, create a mock STL link and show a summary screen:
> - Image preview
> - Model type + engraving
> - STL download link

Result: Summary screen visible, mock STL shown, flow complete up to payment

## 2025-07-31 – Fix Supabase Insert Path

> The checkout process is hitting a 500 error and orders aren't appearing in Supabase. Can you verify where the app is writing orders, confirm the database connection is Supabase (not Replit), and insert valid payloads?

Result: Agent confirmed connection was hitting Replit PostgreSQL. Fixed environment keys, verified full Supabase connectivity, and added insert logging.

---

## 2025-07-31 – Orders Table Schema Rebuild

> The Supabase orders table is missing fields like color, font, and stl_file_url. Can you recreate the table to match the app’s full schema?

Result: Agent generated SQL to drop and rebuild the table. Schema now matches app and receives real data.

### Stripe Checkout Integration

**Prompt:**  
“I'm thinking stripe but I feel like I need to understand this better… would I still be able to test the flow without inserting payment?”

**Result:**  
- Agent wired up full Stripe Checkout in test mode using Stripe API keys
- Created checkout session with metadata
- Added frontend payment button and post-payment confirmation route
- Stripe redirect and return flow tested successfully with test card
- Supabase order status properly updated to `paid` on success

## Stripe Integration Fix Prompt
> Fix domain routing issue where checkout redirect points to localhost. Replit autoscale server is deployed, need HTTPS-compatible success and cancel URLs with dynamic detection.

## Webhook & STL Gen Prompt
> After payment, send order to a mock STL generation endpoint. Update Supabase with a file URL and status. Add real-time polling and manual retry fallback in the confirmation screen.

## Deployment Fix Prompt
> Replit build fails due to ports and static path issues. Fix `serveStatic` directory mismatch and ensure express listens on 0.0.0.0:5000 in production.

Stripe & STL Integration:
- Prompted agent to fix checkout redirect issue (“Hmm... couldn't reach”)
- Prompted agent to fix confirmation STL generation link (was pointing to example.com)
- Final fix added dynamic domain detection, STL download button, and retry fallback

## Phase 4 Key Prompts

### 1. STL Generation Endpoint
> "Write an endpoint that accepts a Supabase order ID, retrieves the image URL, sends it to a mock STL generation service..."

### 2. Printer Dispatch Endpoint
> "Create a new Express endpoint: POST /api/send-to-printer/:orderId. Validate completed STL, post to print partner..."

### 3. Admin Panel Page
> "Create a new React page at `src/pages/admin.tsx` that fetches all orders, displays them in a table..."

### 4. Admin Controls
> "Add three new admin actions to each order row: Regenerate STL, Mark as Failed, Force Complete..."

### 5. Auto Dispatch + Email System
> "Add an Auto Dispatch toggle to admin. When enabled, automatically dispatch new completed STL orders..."

### 6. Password Gate for `/admin`
> "Add a password gate to the admin page that prompts for a shared secret and stores it in localStorage..."

### Phase 5: STL Quality Improvements

#### A. Remove Legacy Mock Trigger
> “Replace payment success logic's mock STL trigger with real STL generation function.”

#### B. GLB to STL Conversion Validation
> “Add logging and mesh-count checks during GLB → STL conversion.”

#### C. Frontend Polling Fix
> “Ensure confirmation page stops spinner when status = 'completed' and `stl_file_url` is populated.”

#### D. Quality Enhancements Prompt
> “Normalize STL scale, center mesh, add background-removal, and enforce minimum file size before saving.”
