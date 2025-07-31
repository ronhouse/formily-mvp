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

  // Orders - Using PostgreSQL with enhanced logging
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
      
      // Prepare full payload for database insert
      const fullPayload = {
        userId: orderData.userId,
        photoUrl: imageUrl, // This will map to image_url in DB
        style: orderData.style, // This will map to model_type in DB  
        engravingText: orderData.engravingText || null,
        fontStyle: orderData.fontStyle || 'arial',
        color: orderData.color || 'black',
        quality: orderData.quality || 'standard',
        totalAmount: orderData.totalAmount,
        stripePaymentIntentId: orderData.stripePaymentIntentId || null,
        stlFileUrl: orderData.stlFileUrl || null,
        specifications: orderData.specifications || null
      };
      
      console.log('📋 FULL DATABASE INSERT PAYLOAD:');
      console.log('=====================================');
      console.log(JSON.stringify(fullPayload, null, 2));
      console.log('=====================================');
      console.log('Field mappings for database:');
      console.log('- photoUrl →', fullPayload.photoUrl, '(stored as image_url)');
      console.log('- style →', fullPayload.style, '(stored as model_type)');
      console.log('- engravingText →', fullPayload.engravingText, '(stored as engraving_text)');
      console.log('=====================================');
      
      // Create order using PostgreSQL storage with enhanced error handling
      let order;
      try {
        order = await storage.createOrder(fullPayload);
        console.log('✅ Order successfully inserted into database with ID:', order.id);
      } catch (dbError: any) {
        console.error('❌ DATABASE INSERT FAILED:');
        console.error('Error type:', dbError.constructor.name);
        console.error('Error message:', dbError.message);
        console.error('Error stack:', dbError.stack);
        console.error('Payload that failed:', JSON.stringify(fullPayload, null, 2));
        throw new Error(`Database insert failed: ${dbError.message}`);
      }
      
      console.log('📊 Successfully created order details:');
      console.log('- Order ID:', order.id);
      console.log('- User ID:', order.userId);
      console.log('- Image URL (from DB):', order.photoUrl);
      console.log('- Style/Model Type (from DB):', order.style);
      console.log('- Engraving Text (from DB):', order.engravingText);
      console.log('- Total Amount (from DB):', order.totalAmount);
      console.log('- Created At:', order.createdAt);
      
      res.json(order);
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
