-- Add real size choices to the new illustrative ranges without changing existing orders or stock.
INSERT INTO variants(product_id,sku,options,price_paise,mrp_paise,stock)
SELECT p.id,v.sku||'-'||size.label,v.options||jsonb_build_object('size',size.label),v.price_paise,v.mrp_paise,20
FROM products p JOIN variants v ON v.product_id=p.id JOIN categories c ON c.id=p.category_id
CROSS JOIN (VALUES('S'),('L'),('XL'))size(label)
WHERE p.featured=TRUE AND c.slug IN('mens-casual-shirts','womens-kurta-sets') AND v.sku LIKE 'DISC26-%' AND v.options->>'size'='M'
ON CONFLICT(sku) DO NOTHING;
INSERT INTO variants(product_id,sku,options,price_paise,mrp_paise,stock)
SELECT p.id,v.sku||'-'||size.label,v.options||jsonb_build_object('size',size.label),v.price_paise,v.mrp_paise,20
FROM products p JOIN variants v ON v.product_id=p.id JOIN categories c ON c.id=p.category_id
CROSS JOIN (VALUES('UK 7'),('UK 9'),('UK 10'))size(label)
WHERE p.featured=TRUE AND c.slug='running-shoes' AND v.sku LIKE 'DISC26-%' AND v.options->>'size'='UK 8'
ON CONFLICT(sku) DO NOTHING;
INSERT INTO deals(variant_id,deal_price_paise,starts_at,ends_at,quantity_cap,sold_count)
SELECT v.id,ROUND(v.price_paise*.85),NOW()-INTERVAL '1 minute',NOW()+INTERVAL '180 days',100,0
FROM variants v JOIN products p ON p.id=v.product_id
WHERE v.sku IN('DISC26-wireless-headphones-0','DISC26-tws-earbuds-0','DISC26-mens-casual-shirts-0','DISC26-countertop-blenders-0','DISC26-yoga-mats-0')
AND NOT EXISTS(SELECT 1 FROM deals WHERE variant_id=v.id);
