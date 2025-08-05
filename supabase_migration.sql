-- Supabase Migration Script
-- Creates users and orders tables with proper schema for Formily app

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table if it doesn't exist  
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  image_url TEXT NOT NULL,
  model_type TEXT NOT NULL,
  engraving_text TEXT,
  font_style TEXT DEFAULT 'arial',
  color TEXT DEFAULT 'black',
  quality TEXT DEFAULT 'standard',
  total_amount TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stl_file_url TEXT,
  print_dispatched BOOLEAN DEFAULT FALSE,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_anonymous_id ON users(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Enable Row Level Security (RLS) - Optional for security
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS if needed
-- CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable read access for all users" ON orders FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" on orders FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" on orders FOR UPDATE USING (true);

-- Verify tables were created
SELECT 'Users table columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;

SELECT 'Orders table columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;