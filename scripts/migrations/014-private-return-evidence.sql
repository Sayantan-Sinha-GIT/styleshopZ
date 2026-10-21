-- Return evidence contains customer photos and should only be visible to the
-- customer and owner. Upgrade photos attached before private uploads existed.
UPDATE uploads AS upload
SET private = TRUE
WHERE private = FALSE
  AND EXISTS (
    SELECT 1
    FROM returns AS request,
      jsonb_array_elements_text(request.photos) AS photo(url)
    WHERE photo.url = '/uploads/' || upload.id::text
  );
