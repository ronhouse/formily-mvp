-- Drop the existing orders table if it exists (this will delete any existing data)
DROP TABLE IF EXISTS orders;

-- Create orders table in Supabase with exact schema matching the application
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  image_url TEXT NOT NULL,
  model_type TEXT NOT NULL,
  engraving_text TEXT,
  font_style TEXT DEFAULT 'arial',
  color TEXT DEFAULT 'black',
  quality TEXT DEFAULT 'standard',
  total_amount NUMERIC NOT NULL,
  stripe_payment_intent_id TEXT,
  stl_file_url TEXT,
  specifications JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;