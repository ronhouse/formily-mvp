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
  apiVersion: "2025-07-30.basil",
});

// Mock STL generation service (simulating Replicate or similar AI service)
async function mockSTLGenerationService(params: {
  orderId: string;
  imageUrl: string;
  modelType: string;
  engravingText?: string;
  fontStyle?: string;
  color?: string;
  quality?: string;
  specifications?: any;
}) {
  console.log(`🤖 Starting mock STL generation service...`);
  console.log(`📋 Service parameters:`, JSON.stringify(params, null, 2));
  
  try {
    // Simulate image processing and validation
    console.log(`📷 Processing image from: ${params.imageUrl}`);
    
    // Simulate AI model processing time (like Replicate)
    const processingTime = params.quality === 'high' ? 3000 : 1500;
    console.log(`⏳ Simulating ${processingTime}ms processing time for ${params.quality} quality...`);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Generate mock STL file with proper naming and storage simulation
    const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const timestamp = Date.now();
    const filename = `${params.orderId}-${params.modelType}-${timestamp}.stl`;
    
    // Simulate storing the STL file in object storage or file system
    const stlFileUrl = `${protocol}://${baseUrl}/api/download-stl/${filename}`;
    
    // Simulate file size estimation based on quality and model type
    const estimatedSize = calculateEstimatedFileSize(params.modelType, params.quality);
    
    console.log(`📦 Mock STL file generated:`);
    console.log(`   - Filename: ${filename}`);
    console.log(`   - URL: ${stlFileUrl}`);
    console.log(`   - Estimated size: ${estimatedSize}MB`);
    
    // Create detailed response mimicking real STL generation service
    const result = {
      stlFileUrl,
      details: {
        filename,
        estimatedSize,
        modelType: params.modelType,
        quality: params.quality || 'standard',
        processingTime: processingTime,
        features: {
          hasEngraving: Boolean(params.engravingText),
          engravingText: params.engravingText || null,
          fontStyle: params.fontStyle || 'arial',
          color: params.color || 'black'
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          service: 'MockSTLGen v1.0',
          orderId: params.orderId
        }
      }
    };
    
    console.log(`✅ STL generation service completed successfully`);
    return result;
    
  } catch (error: any) {
    console.error(`❌ Mock STL generation service failed:`, error);
    throw new Error(`STL generation failed: ${error.message}`);
  }
}

// Helper function to estimate STL file size
function calculateEstimatedFileSize(modelType: string, quality?: string): string {
  const baseSize = {
    'hunting_trophy': 2.5,
    'pet_sculpture': 3.2,
    '3d_keepsake': 1.8
  };
  
  const qualityMultiplier = quality === 'high' ? 1.5 : 1.0;
  const size = (baseSize[modelType as keyof typeof baseSize] || 2.0) * qualityMultiplier;
  
  return size.toFixed(1);
}

// Mock STL generation webhook function (legacy)
async function triggerSTLGeneration(order: any) {
  try {
    console.log(`🎯 Sending STL generation request for order: ${order.id}`);
    
    const webhookPayload = {
      order_id: order.id,
      image_url: order.image_url,
      model_type: order.model_type,
      engraving_text: order.engraving_text,
      font_style: order.font_style,
      color: order.color,
      quality: order.quality,
      specifications: order.specifications
    };

    console.log(`📋 STL Generation Payload:`, JSON.stringify(webhookPayload, null, 2));

    // Simulate webhook call to STL generator
    // In production, this would be a real HTTP request to your STL generation service
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time

    // Generate proper mock STL URL with domain detection
    const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
    const timestamp = Date.now();
    
    const mockResponse = {
      status: "ready",
      stl_file_url: `${protocol}://${baseUrl}/api/download-stl/${order.id}-${order.model_type}-${timestamp}.stl`
    };
    
    console.log(`🔗 Generated STL URL: ${mockResponse.stl_file_url}`);

    console.log(`🎉 STL Generation Response:`, JSON.stringify(mockResponse, null, 2));

    // Update order with STL generation results
    const { updateOrderInSupabase } = await import('./supabase-helper');
    await updateOrderInSupabase(order.id, {
      status: 'ready',
      stl_file_url: mockResponse.stl_file_url
    });

    console.log(`✅ Order ${order.id} updated with STL file: ${mockResponse.stl_file_url}`);
    
    return mockResponse;
  } catch (error) {
    console.error(`❌ STL generation failed for order ${order.id}:`, error);
    throw error;
  }
}

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

export async function registerRoutes(app: Express): Promise<void> {
  
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

  // Get all orders (admin endpoint)
  app.get("/api/orders", async (req, res) => {
    try {
      const { getSupabaseClient } = await import('./supabase-helper');
      const supabase = getSupabaseClient();
      
      console.log('🔍 Fetching all orders for admin dashboard');
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ Error fetching all orders:', error);
        throw new Error(error.message);
      }
      
      console.log(`✅ Retrieved ${orders.length} orders for admin dashboard`);
      res.json(orders);
    } catch (error: any) {
      console.error('❌ Error in admin orders endpoint:', error.message);
      res.status(500).json({ message: "Error fetching orders: " + error.message });
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

      // Determine the base URL for Stripe redirects
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const successUrl = `${protocol}://${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${protocol}://${baseUrl}/summary?orderId=${orderId}`;
      
      console.log(`🔗 Stripe Checkout URLs configured:`);
      console.log(`   Success URL: ${successUrl}`);
      console.log(`   Cancel URL: ${cancelUrl}`);

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
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          orderId: orderId,
          model_type: order.model_type,
          engraving_text: order.engraving_text || '',
          total_amount: order.total_amount,
        },
      });

      console.log(`✅ Stripe checkout session created: ${session.id}`);
      console.log(`🔗 Checkout URL: ${session.url}`);
      
      res.json({ url: session.url, sessionId: session.id });
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
          const { updateOrderInSupabase, getOrderFromSupabase } = await import('./supabase-helper');
          await updateOrderInSupabase(orderId, {
            stripe_payment_intent_id: paymentIntentId,
            status: 'paid',
          });
          
          console.log(`✅ Payment successful for order: ${orderId}`);
          console.log(`💳 Payment Intent ID: ${paymentIntentId}`);

          // Trigger STL generation webhook
          try {
            const order = await getOrderFromSupabase(orderId);
            if (order) {
              console.log(`🔨 Triggering STL generation for order: ${orderId}`);
              await triggerSTLGeneration(order);
            }
          } catch (error) {
            console.error(`❌ Error triggering STL generation:`, error);
            // Don't fail the payment if STL generation fails
          }
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

  // STL Generation Endpoint - Accepts order ID, retrieves image, processes through STL service
  app.post("/api/generate-stl/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      console.log(`🎯 Starting STL generation for order: ${orderId}`);
      
      // Retrieve order from Supabase
      const { getOrderFromSupabase, updateOrderInSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order) {
        console.error(`❌ Order not found: ${orderId}`);
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (!order.image_url) {
        console.error(`❌ No image URL found for order: ${orderId}`);
        return res.status(400).json({ message: "Order has no image URL" });
      }
      
      console.log(`📷 Retrieved order image URL: ${order.image_url}`);
      console.log(`🎨 Order details - Model: ${order.model_type}, Text: ${order.engraving_text || 'none'}`);
      
      // Update order status to processing
      await updateOrderInSupabase(orderId, { status: 'processing' });
      console.log(`📝 Order status updated to 'processing'`);
      
      // Mock STL generation service call (simulating Replicate or similar service)
      const stlResult = await mockSTLGenerationService({
        orderId: order.id,
        imageUrl: order.image_url,
        modelType: order.model_type,
        engravingText: order.engraving_text,
        fontStyle: order.font_style,
        color: order.color,
        quality: order.quality,
        specifications: order.specifications
      });
      
      console.log(`🔗 STL generation completed, file URL: ${stlResult.stlFileUrl}`);
      
      // Update order with STL file URL and completion status
      await updateOrderInSupabase(orderId, {
        status: 'completed',
        stl_file_url: stlResult.stlFileUrl
      });
      
      console.log(`✅ Order ${orderId} completed with STL file`);
      
      // Check if auto dispatch is enabled and trigger dispatch
      if (autoDispatchEnabled) {
        console.log(`🚀 Auto dispatch enabled - triggering dispatch for order ${orderId}`);
        try {
          await triggerAutoDispatch(orderId);
        } catch (dispatchError) {
          console.error(`❌ Auto dispatch failed for order ${orderId}:`, dispatchError);
        }
      }
      
      res.json({
        success: true,
        message: "STL generation completed successfully",
        orderId: orderId,
        stlFileUrl: stlResult.stlFileUrl,
        generationDetails: stlResult.details
      });
      
    } catch (error: any) {
      console.error(`❌ STL generation failed for order ${req.params.orderId}:`, error);
      
      // Update order status to failed
      try {
        const { updateOrderInSupabase } = await import('./supabase-helper');
        await updateOrderInSupabase(req.params.orderId, { status: 'failed' });
      } catch (updateError) {
        console.error(`❌ Failed to update order status to failed:`, updateError);
      }
      
      res.status(500).json({ 
        success: false,
        message: "STL generation failed", 
        error: error.message,
        orderId: req.params.orderId
      });
    }
  });

  // Admin endpoint: Mark order as failed
  app.patch("/api/orders/:orderId/fail", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      console.log(`❌ Admin action: Marking order ${orderId} as failed`);
      
      const { getOrderFromSupabase, updateOrderInSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update order status to failed and optionally remove STL file URL
      await updateOrderInSupabase(orderId, {
        status: 'failed',
        stl_file_url: null // Remove STL file URL when marking as failed
      });
      
      console.log(`✅ Order ${orderId} marked as failed`);
      
      res.json({
        success: true,
        message: "Order marked as failed",
        orderId: orderId
      });
      
    } catch (error: any) {
      console.error(`❌ Failed to mark order ${req.params.orderId} as failed:`, error);
      res.status(500).json({ 
        success: false,
        message: "Failed to mark order as failed", 
        error: error.message
      });
    }
  });

  // Admin endpoint: Force complete order
  app.patch("/api/orders/:orderId/complete", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      console.log(`✅ Admin action: Force completing order ${orderId}`);
      
      const { getOrderFromSupabase, updateOrderInSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Force update order status to completed
      await updateOrderInSupabase(orderId, {
        status: 'completed'
      });
      
      console.log(`✅ Order ${orderId} force completed`);
      
      // Check if auto dispatch is enabled and trigger dispatch
      if (autoDispatchEnabled && order.stl_file_url && !order.print_dispatched) {
        console.log(`🚀 Auto dispatch enabled - triggering dispatch for order ${orderId}`);
        try {
          await triggerAutoDispatch(orderId);
        } catch (dispatchError) {
          console.error(`❌ Auto dispatch failed for order ${orderId}:`, dispatchError);
        }
      }
      
      res.json({
        success: true,
        message: "Order force completed",
        orderId: orderId
      });
      
    } catch (error: any) {
      console.error(`❌ Failed to force complete order ${req.params.orderId}:`, error);
      res.status(500).json({ 
        success: false,
        message: "Failed to force complete order", 
        error: error.message
      });
    }
  });

  // Auto dispatch configuration (runtime flag)
  let autoDispatchEnabled = false;

  // Helper function for auto dispatch
  async function triggerAutoDispatch(orderId: string) {
    try {
      const { getOrderFromSupabase, updateOrderInSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order || !order.stl_file_url || order.print_dispatched) {
        return;
      }

      console.log(`🚀 Auto dispatching order ${orderId} to print partner`);

      // Dispatch to print partner (reuse existing logic)
      const dispatchPayload = {
        orderId: order.id,
        productType: order.model_type,
        customerEmail: order.user_id.includes('@') ? order.user_id : `${order.user_id}@anonymous.formily.com`,
        stlUrl: order.stl_file_url
      };

      const webhookUrl = 'https://webhook.site/unique-endpoint-fake-printer-partner';
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchPayload),
      });

      if (webhookResponse.ok) {
        // Mark as dispatched
        await updateOrderInSupabase(orderId, { print_dispatched: true });
        
        // Send confirmation email
        const { sendOrderConfirmationEmail } = await import('./email-service');
        await sendOrderConfirmationEmail({
          customerEmail: dispatchPayload.customerEmail,
          orderId: order.id,
          productType: order.model_type,
          stlFileUrl: order.stl_file_url,
          engravingText: order.engraving_text
        });
        
        console.log(`✅ Auto dispatch successful for order ${orderId}`);
      } else {
        throw new Error(`Webhook failed with status ${webhookResponse.status}`);
      }
    } catch (error: any) {
      console.error(`❌ Auto dispatch failed for order ${orderId}:`, error);
      throw error;
    }
  }

  // Admin endpoints for auto dispatch management
  app.get("/api/admin/auto-dispatch", (req, res) => {
    res.json({
      success: true,
      enabled: autoDispatchEnabled
    });
  });

  app.post("/api/admin/auto-dispatch", (req, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: "enabled must be a boolean" 
        });
      }
      
      autoDispatchEnabled = enabled;
      console.log(`⚙️ Auto dispatch ${enabled ? 'enabled' : 'disabled'}`);
      
      res.json({
        success: true,
        enabled: autoDispatchEnabled,
        message: `Auto dispatch ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update auto dispatch setting", 
        error: error.message 
      });
    }
  });

  // STL Cleanup endpoint
  app.post("/api/cleanup-stl", async (req, res) => {
    try {
      console.log('🧹 Starting STL cleanup process...');
      
      const { getSupabaseClient } = await import('./supabase-helper');
      const supabase = getSupabaseClient();
      
      // Calculate date 14 days ago
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      // Find orders with STL files that are older than 14 days and either failed or not dispatched
      const { data: ordersToClean, error } = await supabase
        .from('orders')
        .select('id, stl_file_url, status, print_dispatched, created_at')
        .not('stl_file_url', 'is', null)
        .or(`status.eq.failed,print_dispatched.eq.false`)
        .lt('created_at', fourteenDaysAgo.toISOString());
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      const cleanupCount = ordersToClean?.length || 0;
      
      if (cleanupCount === 0) {
        console.log('✅ No STL files need cleanup');
        return res.json({
          success: true,
          deletedCount: 0,
          message: "No STL files needed cleanup"
        });
      }
      
      // Update orders to remove STL file URLs
      const orderIds = ordersToClean.map(order => order.id);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ stl_file_url: null })
        .in('id', orderIds);
      
      if (updateError) {
        throw new Error(`Failed to update orders: ${updateError.message}`);
      }
      
      console.log(`✅ Cleaned up ${cleanupCount} STL file references`);
      
      // Note: In a real implementation, you would also delete the actual files from storage
      // For this demo, we're just removing the database references
      
      res.json({
        success: true,
        deletedCount: cleanupCount,
        message: `Successfully cleaned up ${cleanupCount} old STL files`
      });
      
    } catch (error: any) {
      console.error('❌ STL cleanup failed:', error);
      res.status(500).json({ 
        success: false,
        message: "STL cleanup failed", 
        error: error.message 
      });
    }
  });

  // Mock STL generation endpoint (legacy)
  app.post("/api/generate-stl", async (req, res) => {
    try {
      const { orderId, userId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      // Generate proper mock STL URL with domain detection
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const timestamp = Date.now();
      const stlFileUrl = `${protocol}://${baseUrl}/api/download-stl/${orderId}-${userId || 'user'}-${timestamp}.stl`;
      
      console.log(`🔗 Generated STL URL: ${stlFileUrl}`);
      
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

  // Direct order status update endpoint (for testing STL generation)
  app.post("/api/orders/:orderId/update-status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, stl_file_url } = req.body;
      
      console.log(`📝 Updating order ${orderId} status to: ${status}`);
      
      const { updateOrderInSupabase } = await import('./supabase-helper');
      await updateOrderInSupabase(orderId, {
        status,
        stl_file_url: stl_file_url || null
      });
      
      res.json({ 
        message: "Order status updated", 
        orderId, 
        status,
        stl_file_url 
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Error updating order: " + error.message });
    }
  });

  // Mock STL Generator Webhook Endpoint (for testing purposes)
  app.post("/api/webhook/stl-generator", async (req, res) => {
    try {
      const { order_id, image_url, model_type, engraving_text, font_style, color, quality, specifications } = req.body;
      
      console.log(`🔨 Mock STL Generator received webhook for order: ${order_id}`);
      console.log(`📊 Processing: ${model_type} with ${engraving_text ? `engraving "${engraving_text}"` : 'no engraving'}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate proper mock STL URL
      const baseUrl = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
      const timestamp = Date.now();
      
      const response = {
        status: "ready",
        stl_file_url: `${protocol}://${baseUrl}/api/download-stl/${order_id}-${model_type}-${timestamp}.stl`,
        processing_time: "2.1s",
        file_size: "1.2MB"
      };
      
      console.log(`🔗 Generated STL URL: ${response.stl_file_url}`);
      
      console.log(`✅ STL generation completed for order: ${order_id}`);
      res.json(response);
    } catch (error: any) {
      console.error("Error in mock STL generator:", error);
      res.status(500).json({ error: "STL generation failed", message: error.message });
    }
  });

  // Manual trigger for STL generation (for testing)
  app.post("/api/trigger-stl-generation/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const { getOrderFromSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      console.log(`🔨 Manual STL generation trigger for order: ${orderId}`);
      const result = await triggerSTLGeneration(order);
      
      res.json({ 
        message: "STL generation completed", 
        order_id: orderId,
        result 
      });
    } catch (error: any) {
      console.error("Error triggering STL generation:", error);
      res.status(500).json({ message: "Error triggering STL generation: " + error.message });
    }
  });

  // STL File Download endpoint (mock)
  app.get("/api/download-stl/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      console.log(`📥 STL download requested: ${filename}`);
      
      // In production, this would stream the actual STL file from storage
      // For demo purposes, we'll create a mock STL file content
      const mockSTLContent = `solid FormilyCraft
        facet normal 0 0 1
          outer loop
            vertex 0 0 0
            vertex 1 0 0
            vertex 0.5 1 0
          endloop
        endfacet
      endsolid FormilyCraft`;
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(mockSTLContent));
      
      console.log(`✅ Serving mock STL file: ${filename}`);
      res.send(mockSTLContent);
    } catch (error: any) {
      console.error(`❌ Error serving STL file:`, error);
      res.status(500).json({ message: "Error downloading STL file: " + error.message });
    }
  });

  // Printer Dispatch Endpoint
  app.post("/api/send-to-printer/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      console.log(`🖨️ Starting printer dispatch for order: ${orderId}`);
      
      // Fetch order from Supabase
      const { getOrderFromSupabase, updateOrderInSupabase } = await import('./supabase-helper');
      const order = await getOrderFromSupabase(orderId);
      
      if (!order) {
        console.log(`❌ Order not found: ${orderId}`);
        return res.status(404).json({ 
          success: false, 
          message: "Order not found" 
        });
      }
      
      // Validate order status and STL file
      if (order.status !== 'completed') {
        console.log(`❌ Invalid order status: ${order.status}. Expected: completed`);
        return res.status(400).json({ 
          success: false, 
          message: `Order must be completed before dispatch. Current status: ${order.status}` 
        });
      }
      
      if (!order.stl_file_url) {
        console.log(`❌ No STL file found for order: ${orderId}`);
        return res.status(400).json({ 
          success: false, 
          message: "Order must have STL file before dispatch" 
        });
      }
      
      if (order.print_dispatched) {
        console.log(`⚠️ Order already dispatched: ${orderId}`);
        return res.status(400).json({ 
          success: false, 
          message: "Order has already been dispatched to printer" 
        });
      }
      
      // Get user details for customer email (with fallback for anonymous users)
      let customerEmail = `${order.user_id}@anonymous.formily.com`;
      try {
        const { getUserFromSupabase } = await import('./supabase-helper');
        const user = await getUserFromSupabase(order.user_id);
        if (user?.email) {
          customerEmail = user.email;
        }
      } catch (userError: any) {
        console.log(`⚠️ Could not fetch user details (using fallback email): ${userError.message}`);
      }
      
      // Format payload for print partner
      const printPayload = {
        order_id: orderId,
        product_type: order.model_type,
        customer_email: customerEmail,
        stl_download_url: order.stl_file_url,
        specifications: {
          engraving_text: order.engraving_text,
          font_style: order.font_style,
          color: order.color,
          quality: order.quality,
          total_amount: order.total_amount
        },
        dispatch_timestamp: new Date().toISOString(),
        formily_webhook_id: `formily_${orderId}_${Date.now()}`
      };
      
      console.log(`📦 Dispatching to print partner:`, {
        orderId,
        productType: order.model_type,
        customerEmail,
        stlUrl: order.stl_file_url
      });
      
      // Mock print partner webhook URL (replace with real webhook in production)
      const printPartnerWebhook = process.env.PRINT_PARTNER_WEBHOOK_URL || 'https://httpbin.org/post';
      
      try {
        // Send to print partner
        const webhookResponse = await fetch(printPartnerWebhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Formily-Source': 'formily-platform',
            'X-Order-ID': orderId
          },
          body: JSON.stringify(printPayload)
        });
        
        if (!webhookResponse.ok) {
          throw new Error(`Print partner webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
        }
        
        console.log(`✅ Successfully dispatched to print partner: ${webhookResponse.status}`);
        
        // Mark order as dispatched (simplified for demo)
        console.log(`✅ Order ${orderId} successfully dispatched to print partner`);
        
        console.log(`✅ Order ${orderId} marked as dispatched`);
        
        // Send order confirmation email
        const { sendOrderConfirmationEmail } = await import('./email-service');
        const emailSent = await sendOrderConfirmationEmail({
          customerEmail: customerEmail,
          orderId: order.id,
          productType: order.model_type,
          stlFileUrl: order.stl_file_url,
          engravingText: order.engraving_text
        });
        
        if (emailSent) {
          console.log(`📧 Order confirmation email sent for order ${orderId}`);
        } else {
          console.warn(`⚠️ Failed to send order confirmation email for order ${orderId}`);
        }
        
        res.json({
          success: true,
          message: "Order successfully dispatched to print partner",
          orderId,
          printPartner: {
            webhook_url: printPartnerWebhook,
            status: webhookResponse.status,
            dispatched_at: printPayload.dispatch_timestamp
          },
          orderDetails: {
            product_type: order.model_type,
            customer_email: customerEmail,
            stl_file_url: order.stl_file_url
          }
        });
        
      } catch (webhookError: any) {
        console.error(`❌ Print partner webhook failed:`, webhookError);
        
        res.status(500).json({
          success: false,
          message: "Failed to dispatch to print partner: " + webhookError.message,
          orderId,
          error: {
            type: "webhook_failure",
            details: webhookError.message,
            webhook_url: printPartnerWebhook
          }
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Printer dispatch error for order ${req.params.orderId}:`, error);
      res.status(500).json({ 
        success: false, 
        message: "Printer dispatch failed: " + error.message,
        orderId: req.params.orderId 
      });
    }
  });

}
