-- First, check what columns exist in the current orders table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Create complete orders table schema if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the table exists but missing columns, add them
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS model_type TEXT,
ADD COLUMN IF NOT EXISTS engraving_text TEXT,
ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT 'arial',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'black',
ADD COLUMN IF NOT EXISTS quality TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS total_amount TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stl_file_url TEXT,
ADD COLUMN IF NOT EXISTS specifications JSONB,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;