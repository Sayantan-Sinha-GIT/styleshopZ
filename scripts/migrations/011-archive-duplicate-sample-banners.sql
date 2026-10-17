-- Earlier sample imports created three copies of each campaign. Keep the
-- earliest active copy and archive identical sample rows without deleting them.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY title, image_url, link_url, sort_order
           ORDER BY starts_at, id
         ) AS copy_number
  FROM banners
  WHERE is_active = TRUE
    AND starts_at <= NOW()
    AND ends_at IS NULL
    AND image_url LIKE '/photos/banner%.webp'
    AND title IN (
      'Festival of Sound · Up to 40% Off Audio',
      'Latest Workstations & Ultrabooks',
      'Lightning Deals of the Day'
    )
)
UPDATE banners AS banner
SET is_active = FALSE
FROM ranked
WHERE banner.id = ranked.id AND ranked.copy_number > 1;
