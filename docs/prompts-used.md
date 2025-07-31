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
