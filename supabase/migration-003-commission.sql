-- =====================================================================
-- Migration 003: クライアント手数料率（Bondの取り分％）
-- =====================================================================

-- 1. clients に手数料率カラムを追加（0〜100の％、デフォルト0）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0
  CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- 2. 作成RPCを手数料率対応に更新
CREATE OR REPLACE FUNCTION create_client_with_owner(
  p_name text,
  p_slug text,
  p_commission_rate numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name required';
  END IF;
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'invalid slug';
  END IF;
  IF p_commission_rate < 0 OR p_commission_rate > 100 THEN
    RAISE EXCEPTION 'invalid commission_rate';
  END IF;
  INSERT INTO clients (name, slug, commission_rate)
    VALUES (trim(p_name), p_slug, p_commission_rate)
    RETURNING id INTO v_id;
  INSERT INTO user_clients (user_id, client_id, role) VALUES (auth.uid(), v_id, 'admin');
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION create_client_with_owner(text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_client_with_owner(text, text, numeric) TO authenticated;
