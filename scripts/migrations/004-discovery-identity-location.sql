ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
-- Existing accounts predate verification; preserve their access.
UPDATE users SET email_verified_at=created_at WHERE email_verified_at IS NULL;
CREATE TABLE IF NOT EXISTS auth_identities (
  provider text NOT NULL CHECK(provider='google'),
  provider_uid text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,provider_uid),
  UNIQUE(provider,user_id)
);
CREATE TABLE IF NOT EXISTS email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK(purpose IN('verify','reset')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_codes_user ON email_codes(user_id,purpose,created_at DESC);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE addresses ADD CONSTRAINT address_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS product_search_title ON products USING gin(lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS product_search_text ON products USING gin(to_tsvector('english',coalesce(title,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')));
