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
  apiVersion: "2025-06-30.basil",
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

  // Orders - Using Supabase directly
  app.post("/api/orders", async (req, res) => {
    try {
      console.log('📝 Creating new order with data:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the order data
      const orderData = insertOrderSchema.parse(req.body);
      console.log('✅ Order data validation passed:', orderData);
      
      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        return res.status(500).json({ message: "Supabase configuration missing" });
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🔗 Supabase client initialized');
      
      // Insert order into Supabase orders table
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: orderData.userId,
          status: 'pending',
          image_url: orderData.photoUrl, // Map photoUrl to image_url
          model_type: orderData.style,   // Map style to model_type
          engraving_text: orderData.engravingText || null,
          font_style: orderData.fontStyle || 'arial',
          color: orderData.color || 'black',
          quality: orderData.quality || 'standard',
          total_amount: orderData.totalAmount,
          stripe_payment_intent_id: orderData.stripePaymentIntentId || null,
          stl_file_url: orderData.stlFileUrl || null,
          specifications: orderData.specifications || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        return res.status(500).json({ 
          message: "Failed to create order in Supabase", 
          error: error.message 
        });
      }
      
      console.log('✅ Order successfully created in Supabase:', order.id);
      console.log('📊 Order details:', {
        id: order.id,
        user_id: order.user_id,
        image_url: order.image_url,
        model_type: order.model_type,
        engraving_text: order.engraving_text,
        total_amount: order.total_amount
      });
      
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
      const orders = await storage.getOrdersByUserId(userId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error: any) {
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
        await storage.updateOrder(orderId, {
          stripePaymentIntentId: paymentIntent.id,
        });
      }
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
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
      await storage.updateOrder(orderId, {
        status: "completed",
        stlFileUrl: stlFileUrl,
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
