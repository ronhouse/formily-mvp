-- Update Supabase orders table to match application schema
-- Add missing columns with appropriate data types

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT 'arial',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'black',
ADD COLUMN IF NOT EXISTS quality TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stl_file_url TEXT,
ADD COLUMN IF NOT EXISTS specifications JSONB;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Verify the updated schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;