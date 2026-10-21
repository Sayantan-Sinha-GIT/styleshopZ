ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS support_tickets_queue_idx ON support_tickets(status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON support_tickets(user_id, updated_at DESC);
