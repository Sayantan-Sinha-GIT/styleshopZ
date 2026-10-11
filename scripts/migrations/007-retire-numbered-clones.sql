-- Replace the inherited numbered sample clones with the curated DISC26 ranges.
-- Hiding preserves product IDs, variants, images, stock and all order history;
-- an owner can explicitly republish a legacy listing after giving it real content.
UPDATE products p SET status='hidden'
WHERE p.status='live' AND p.featured=FALSE
  AND p.title ~ ' · [0-9]+$'
  AND EXISTS(SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.sku ~ '^SKU-[A-Z]+-[0-9]+-[0-9]+$');
