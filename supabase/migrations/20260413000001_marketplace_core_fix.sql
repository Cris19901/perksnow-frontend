-- Fix marketplace tables: drop any partial/legacy versions and recreate correctly.
-- Safe to run since no real order data exists yet.

-- Drop in correct dependency order
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- ============================================================
-- 1. Orders table
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','shipped','delivered','cancelled','refunded')),
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  shipping_address JSONB NOT NULL,
  paystack_reference TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Order items table
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Product reviews table
-- ============================================================
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_review_per_order UNIQUE (product_id, reviewer_id, order_id)
);

-- ============================================================
-- 4. Products: add marketplace columns if missing
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_time TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INT NOT NULL DEFAULT 0;

-- Auto-approve any existing products
UPDATE products SET is_approved = true WHERE is_approved = false;

-- ============================================================
-- 5. Marketplace toggle in app_settings
-- ============================================================
INSERT INTO app_settings (setting_key, setting_value, setting_category, description)
VALUES (
  'marketplace_enabled',
  '{"value": false}'::jsonb,
  'marketplace',
  'Toggle the marketplace on/off for all users. When false, users see a coming soon screen.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION decrement_product_stock();

CREATE OR REPLACE FUNCTION restore_product_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE products p
    SET stock_quantity = p.stock_quantity + oi.quantity,
        updated_at = NOW()
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = p.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION restore_product_stock_on_cancel();

CREATE OR REPLACE FUNCTION recalculate_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_product_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE products
  SET rating = COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM product_reviews
        WHERE product_id = v_product_id
      ), 0),
      reviews_count = (
        SELECT COUNT(*) FROM product_reviews WHERE product_id = v_product_id
      ),
      updated_at = NOW()
  WHERE id = v_product_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_product_rating
  AFTER INSERT OR DELETE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION recalculate_product_rating();

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers_own_orders"       ON orders FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "buyers_insert_orders"    ON orders FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "buyers_update_orders"    ON orders FOR UPDATE USING (buyer_id = auth.uid());
CREATE POLICY "service_role_orders"     ON orders FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "order_items_view"   ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND buyer_id = auth.uid())
  OR seller_id = auth.uid()
);
CREATE POLICY "order_items_insert"       ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND buyer_id = auth.uid())
);
CREATE POLICY "service_role_order_items" ON order_items FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "reviews_public_read" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert"      ON product_reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update_own"  ON product_reviews FOR UPDATE USING (reviewer_id = auth.uid());
CREATE POLICY "reviews_delete_own"  ON product_reviews FOR DELETE USING (reviewer_id = auth.uid());

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_orders_buyer_id       ON orders(buyer_id);
CREATE INDEX idx_orders_status         ON orders(status);
CREATE INDEX idx_orders_paystack_ref   ON orders(paystack_reference);
CREATE INDEX idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX idx_order_items_product   ON order_items(product_id);
CREATE INDEX idx_order_items_seller    ON order_items(seller_id);
CREATE INDEX idx_reviews_product_id    ON product_reviews(product_id);
CREATE INDEX idx_reviews_reviewer_id   ON product_reviews(reviewer_id);
CREATE INDEX idx_products_is_approved  ON products(is_approved);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT ALL ON orders TO service_role;
GRANT ALL ON order_items TO service_role;
GRANT ALL ON product_reviews TO service_role;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT ON order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_reviews TO authenticated;

DO $$ BEGIN
  RAISE NOTICE 'Marketplace tables created successfully.';
END $$;
