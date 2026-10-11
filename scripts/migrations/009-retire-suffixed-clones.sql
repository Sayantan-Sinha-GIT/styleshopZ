-- The inherited seed also used collision suffixes on some duplicate SKUs.
UPDATE products p SET status='hidden'
WHERE p.status='live' AND p.featured=FALSE
  AND p.title ~ ' · [0-9]+$'
  AND EXISTS(SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.sku ~ '^SKU-[A-Z]+-[0-9]+-[0-9]+(-[a-zA-Z0-9]+)?$');
