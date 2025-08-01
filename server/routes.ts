import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import { storage } from "./storage";
import { insertUserSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

// Use placeholder key if not provided (for development)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_replace_with_real_stripe_secret_key';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User management
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByAnonymousId(userData.anonymousId);
      if (existingUser) {
        return res.json(existingUser);
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating user: " + error.message });
    }
  });

  app.get("/api/users/:anonymousId", async (req, res) => {
    try {
      const { anonymousId } = req.params;
      const user = await storage.getUserByAnonymousId(anonymousId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user: " + error.message });
    }
  });

  // Add endpoint to get user by Supabase user ID (for compatibility)
  app.get("/api/users/supabase/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserByAnonymousId(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching user: " + error.message });
    }
  });

  // File upload
  app.post("/api/upload", upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In a real implementation, you would upload to Supabase Storage
      // For now, we'll simulate a file URL
      const fileUrl = `https://example.com/uploads/${Date.now()}-${req.file.originalname}`;
      
      res.json({ 
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error uploading file: " + error.message });
    }
  });

  // Orders - Using Supabase directly with comprehensive logging
  app.post("/api/orders", async (req, res) => {
    try {
      console.log('📝 Creating new order with data:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the order data
      const orderData = insertOrderSchema.parse(req.body);
      console.log('✅ Order data validation passed:', orderData);
      
      // Validate image_url before inserting
      const imageUrl = orderData.photoUrl;
      console.log('🖼️  Validating image_url:', imageUrl);
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('❌ Invalid image_url - not a string:', typeof imageUrl, imageUrl);
        return res.status(400).json({ message: "Invalid image URL - must be a string" });
      }
      
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        console.error('❌ Invalid image_url format - must start with http(s):', imageUrl);
        return res.status(400).json({ message: "Invalid image URL format - must start with http(s)" });
      }
      
      console.log('✅ Image URL validation passed');
      
      // Import and configure Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      
      // Get environment variables (the environment variables are swapped in secrets)
      const supabaseUrl = process.env.VITE_SUPABASE_ANON_KEY; // This actually contains the URL
      const supabaseKey = process.env.VITE_SUPABASE_URL; // This actually contains the anon key
      
      console.log('🔧 Supabase Environment Check:');
      console.log('- Raw VITE_SUPABASE_URL env var:', process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 30)}...` : 'MISSING');
      console.log('- Raw VITE_SUPABASE_ANON_KEY env var:', process.env.VITE_SUPABASE_ANON_KEY ? `${process.env.VITE_SUPABASE_ANON_KEY.substring(0, 30)}...` : 'MISSING');
      console.log('- Assigned supabaseUrl (from ANON_KEY):', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
      console.log('- Assigned supabaseKey (from URL):', supabaseKey ? `${supabaseKey.substring(0, 30)}...` : 'MISSING');
      console.log('- URL validation - starts with https?', supabaseUrl ? supabaseUrl.startsWith('https://') : 'N/A');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        return res.status(500).json({ message: "Supabase configuration missing" });
      }
      
      // Validate Supabase URL format
      if (!supabaseUrl.startsWith('https://')) {
        console.error('❌ Invalid Supabase URL format:', supabaseUrl);
        return res.status(500).json({ message: "Invalid Supabase URL - must start with https://" });
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🔗 Supabase client initialized successfully');
      
      // Prepare complete Supabase insert payload with all application fields including mock STL
      const supabasePayload = {
        user_id: orderData.userId,
        status: 'pending',
        image_url: imageUrl,
        model_type: orderData.style,
        engraving_text: orderData.engravingText || null,
        font_style: orderData.fontStyle || 'arial',
        color: orderData.color || 'black',
        quality: orderData.quality || 'standard',
        total_amount: orderData.totalAmount,
        stripe_payment_intent_id: orderData.stripePaymentIntentId || null,
        stl_file_url: 'https://example.com/fake-download.stl', // Mock STL file URL
        specifications: orderData.specifications || null
      };
      
      console.log('📋 SUPABASE INSERT PAYLOAD:');
      console.log('=====================================');
      console.log(JSON.stringify(supabasePayload, null, 2));
      console.log('=====================================');
      console.log('Key field validation:');
      console.log('- image_url:', supabasePayload.image_url, '(type:', typeof supabasePayload.image_url, ')');
      console.log('- model_type:', supabasePayload.model_type);
      console.log('- engraving_text:', supabasePayload.engraving_text);
      console.log('=====================================');
      
      // Insert into Supabase orders table
      const { data: order, error } = await supabase
        .from('orders')
        .insert(supabasePayload)
        .select()
        .single();
      
      if (error) {
        console.error('❌ SUPABASE INSERT ERROR:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Payload that failed:', JSON.stringify(supabasePayload, null, 2));
        return res.status(500).json({ 
          message: "Failed to create order in Supabase", 
          error: error.message,
          details: error.details
        });
      }
      
      console.log('✅ SUPABASE INSERT SUCCESSFUL:');
      console.log('- Order ID:', order.id);
      console.log('- All returned fields:', Object.keys(order));
      console.log('- image_url stored:', order.image_url);
      console.log('- model_type stored:', order.model_type);
      console.log('- engraving_text stored:', order.engraving_text);
      
      // Convert snake_case back to camelCase for frontend compatibility
      const formattedOrder = {
        id: order.id,
        userId: order.user_id,
        status: order.status,
        photoUrl: order.image_url,
        style: order.model_type,
        engravingText: order.engraving_text,
        fontStyle: order.font_style,
        color: order.color,
        quality: order.quality,
        totalAmount: order.total_amount,
        stripePaymentIntentId: order.stripe_payment_intent_id,
        stlFileUrl: order.stl_file_url,
        specifications: order.specifications,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };
      
      console.log('📊 Formatted response for frontend:', {
        id: formattedOrder.id,
        image_url: formattedOrder.photoUrl,
        model_type: formattedOrder.style,
        engraving_text: formattedOrder.engravingText
      });
      
      res.json(formattedOrder);
    } catch (error: any) {
      console.error('💥 Order creation failed:', error);
      if (error.name === 'ZodError') {
        console.error('📋 Validation errors:', error.errors);
        res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          message: "Error creating order: " + error.message 
        });
      }
    }
  });

  app.get("/api/orders/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { getSupabaseClient } = await import('./supabase-helper');
      const supabase = getSupabaseClient();
      
      console.log('🔍 Fetching orders for user:', userId);
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Error fetching user orders:', error);
        throw new Error(error.message);
      }
      
      console.log(`✅ Found ${orders.length} orders for user ${userId}`);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { getOrderFromSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(req.params.id);
      
      console.log('✅ Order retrieved from Supabase:', order.id);
      res.json(order);
    } catch (error: any) {
      console.error('❌ Error fetching order from Supabase:', error.message);
      res.status(500).json({ message: "Error fetching order: " + error.message });
    }
  });

  // Stripe payment
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          orderId: orderId || "",
        },
      });
      
      // Update order with payment intent ID if orderId provided
      if (orderId) {
        const { updateOrderInSupabase } = await import('./supabase-helper');
        await updateOrderInSupabase(orderId, {
          stripe_payment_intent_id: paymentIntent.id,
        });
      }
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }

      // Get order details from Supabase
      const { getOrderFromSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Custom 3D ${order.model_type.charAt(0).toUpperCase() + order.model_type.slice(1)}`,
                description: order.engraving_text ? `Engraved: "${order.engraving_text}"` : 'Custom 3D printed model',
                // Remove images array since order.image_url may not be a valid public URL for Stripe
              },
              unit_amount: Math.round(parseFloat(order.total_amount) * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `https://${process.env.REPLIT_DEV_DOMAIN}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN}/summary?orderId=${orderId}`,
        metadata: {
          orderId: orderId,
          model_type: order.model_type,
          engraving_text: order.engraving_text || '',
          total_amount: order.total_amount,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Handle successful payment
  app.post("/api/payment-success", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      console.log(`🔍 Processing payment success for session: ${sessionId}`);

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log(`💰 Session payment status: ${session.payment_status}`);
      
      if (session.payment_status === 'paid') {
        const orderId = session.metadata?.orderId;
        const paymentIntentId = session.payment_intent as string;
        
        console.log(`📦 Order ID from session: ${orderId}`);
        
        if (orderId) {
          // Update order with payment info and status
          const { updateOrderInSupabase } = await import('./supabase-helper');
          await updateOrderInSupabase(orderId, {
            stripe_payment_intent_id: paymentIntentId,
            status: 'paid',
          });
          
          console.log(`✅ Payment successful for order: ${orderId}`);
          console.log(`💳 Payment Intent ID: ${paymentIntentId}`);
        }
      }

      res.json({ 
        session,
        orderId: session.metadata?.orderId,
        paymentStatus: session.payment_status
      });
    } catch (error: any) {
      console.error("Error processing payment success:", error);
      res.status(500).json({ message: "Error processing payment: " + error.message });
    }
  });

  // Mock STL generation endpoint
  app.post("/api/generate-stl", async (req, res) => {
    try {
      const { orderId, userId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      // Generate mock STL URL with user ID and timestamp
      const timestamp = Date.now();
      const stlFileUrl = `https://formily.fakecdn.io/generated/${userId}-${timestamp}.stl`;
      
      // Simulate STL generation process (instant completion for demo)
      const { updateOrderInSupabase } = await import('./supabase-helper');
      await updateOrderInSupabase(orderId, {
        status: "completed",
        stl_file_url: stlFileUrl,
      });
      
      res.json({ 
        message: "STL generation completed",
        stlFileUrl: stlFileUrl,
        orderId: orderId
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error generating STL: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
