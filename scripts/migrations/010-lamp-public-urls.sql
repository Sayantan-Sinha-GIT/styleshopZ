-- Next serves the contents of public at the URL root.
UPDATE product_images i SET url=REPLACE(i.url,'/public/photos/','/photos/')
FROM products p WHERE p.id=i.product_id AND p.featured=TRUE
  AND i.url LIKE '/public/photos/products/lamp-%.webp';
