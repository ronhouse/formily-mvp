# Formily – Turn Your Photos Into 3D Printed Keepsakes

**Formily** is a mobile-first platform that lets users upload or take a photo of a meaningful object—a deer they just hunted, a pet they lost, a memorable catch, or a family moment—and transforms it into a 3D printable STL file, which is fulfilled through external print partners.

---

## 🌟 Current MVP Status

- ✅ Frontend UI scaffold (upload, dropdown, engraving input)
- ✅ Anonymous Supabase auth
- ✅ Order system initialized
- ✅ File upload endpoints wired
- ✅ Vite frontend + Express backend live

---

## 📁 Directory Structure (MVP)


---

## Current Status: MVP Functional

✅ Checkout
✅ Payment Webhooks
✅ STL Generator Webhook (Mock)
✅ Download Confirmation Page

---

## ✅ Phase 4: STL Generation Pipeline (Complete)

The core end-to-end STL generation flow is fully implemented:

- ✅ Users can upload an image from the Formily frontend
- ✅ The image is saved and stored with a real accessible URL
- ✅ Background removal (via AI or fallback) is attempted
- ✅ Cleaned image is sent to Replicate (TripoSR) to generate a `.glb`
- ✅ `.glb` is converted into `.stl` and hosted for download
- ✅ User can download the STL file and view it in slicer software

> Verified: STL files are generated and rendered correctly with real geometry.

---

## 🛠️ Phase 5: Rebuild Using n8n (Coming Soon)

To improve reliability and modularity, Phase 5 will transition the image → STL workflow into a **visual n8n pipeline**, allowing better:

- Debugging and observability
- Error handling and fallback logic
- Model switching for better background removal and 3D generation
- Scalable orchestration of Replicate calls

---

## 🗂️ Current Stack

- **Frontend:** Replit + Supabase client
- **Backend:** Express (Node.js), Python subprocesses
- **AI Services:** Replicate (TripoSR, rembg), OpenCV fallback
- **Storage:** Supabase (Postgres + storage buckets)
- **Hosting:** Replit
- **Next Phase:** n8n integration for automation

---

## 📁 Directory Overview

```bash
/uploads/              # Uploaded user images
/uploads/clean/        # Background-removed images
/uploads/stl/          # Final STL files for download
/python/               # .glb to .stl conversion scripts
logs/                  # Logging for STL generation, errors, etc.
