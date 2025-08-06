# Formily

## Overview
Formily is a comprehensive web application that converts user-uploaded photos into custom 3D printable objects. It targets a broad audience, including hunters, pet owners, and families, by offering specialized product types like hunting trophies, pet sculptures, and 3D keepsakes. The application provides a seamless multi-step user journey from photo upload and customization to secure payment and STL file delivery, aiming to become a leading platform for personalized 3D printing services.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (December 2024)
**Admin Security System Implemented**: Complete admin password gate system with ADMIN_SECRET environment variable authentication (default: 'formilypass'). Fixed React hooks ordering issues by creating separate AdminAuthWrapper component for authentication logic. All admin endpoints functional including auto-dispatch management, print job dispatch, order completion, and STL regeneration.

**Deployment Build Process Fixed (August 2025)**: Resolved deployment failure where server couldn't find client build files. Created `build-for-deployment.js` script and `scripts/post-build.js` to properly copy client files from `dist/public/` to `dist/server/public/` where the server expects them. The complete build process now ensures all static files are correctly positioned for production deployment.

**Enhanced STL Generation Pipeline with Quality Improvements (August 2025)**: Implemented comprehensive quality enhancements to the STL generation pipeline with three major improvements: (1) **Background Removal Preprocessing** - Images are automatically processed with OpenCV-based background removal before sending to TripoSR, saved to `/uploads/clean/` with fallback to original if processing fails. (2) **Mesh Scale Normalization** - GLB files are processed with trimesh Python library to center mesh at origin and scale largest axis to exactly 100mm for consistent 3D printing dimensions. (3) **Quality Gate Validation** - STL files smaller than 10KB are automatically rejected and orders marked as "failed" to prevent delivery of empty or corrupted models. Enhanced error handling provides user-friendly messages for mesh validation failures, quality gate rejections, and normalization errors. All processing logged with detailed metrics for troubleshooting.

**Complete Real Image Upload & Processing Pipeline (August 2025)**: Replaced placeholder image URLs with full real image upload functionality. Users can now upload actual photos that are saved to `/uploads/` directory and served via `/uploads/:filename` routes. Upload endpoint generates proper URLs using Replit domain environment variables. Complete end-to-end validation: real image upload → order creation with real URLs → STL generation from actual images → downloadable STL files. Successfully tested with order `a507b63c-36a5-4d3e-9373-dff145c0df72` using real uploaded image `jake_1754368083797.jpg` (3.58MB) → generated `50KB STL file`.

**STL Generation Race Condition Fixed (August 2025)**: Identified and resolved critical issue where payment success flow was calling legacy mock `triggerSTLGeneration` function instead of real Replicate TripoSR service. This caused orders to be marked as "ready" with fake STL URLs but no actual files generated. Fixed by updating payment success and manual trigger endpoints to use `generateSTLWithReplicate` service directly. Verified fix with previously broken order `683e28d4-da52-4bfd-a52a-5616b2154619` - now generates real 50KB STL files successfully.

## System Architecture
**Full-Stack Monorepo Structure**:
- **Frontend**: React 18 + TypeScript + Vite, utilizing shadcn/ui (Radix primitives), Tailwind CSS, and Lucide icons for a responsive, mobile-first design. Wouter handles client-side routing.
- **Backend**: Express.js + TypeScript, serving a unified API and static files.
- **Database**: PostgreSQL via Supabase, managed with Drizzle ORM for type-safe interactions.
- **Authentication**: Supabase anonymous authentication with localStorage fallback.
- **Payments**: Stripe integration with React Stripe.js for secure checkout.
- **File Handling**: Multer memory storage for image uploads, with a 10MB limit and validation.
- **STL Generation**: Integrates with a mock AI service for STL generation, simulating dynamic processing times and file size estimations.
- **Printer Dispatch**: Includes a webhook integration for dispatching completed orders to external print partners.

**Key Features**:
- **Complete User Journey**: Multi-step workflow (Upload → Style Selection → Customization → Payment → Order Confirmation → Order History).
- **Customization**: Offers text engraving, font styles, and quality options.
- **Order Management**: Tracks orders through pending, processing, and completed states, enabling STL downloads.
- **Production Readiness**: Configured for deployment with robust error handling, environment validation, graceful shutdowns, and optimized build processes.

## External Dependencies
- **Supabase**: For PostgreSQL database, anonymous authentication, and file storage (planned).
- **Stripe**: For payment processing and secure checkout sessions.
- **Multer**: For handling file uploads on the server.
- **Replicate-style AI Service (Mock)**: Simulated for 3D model generation.
- **External Print Partner Webhook**: For dispatching print jobs.