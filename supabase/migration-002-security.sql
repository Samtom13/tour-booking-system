-- =====================================================================
-- Migration 002: 権限昇格脆弱性の修正
-- 問題: user_clients の「own rows」ポリシーが INSERT にも適用されており、
--       認証済みユーザーが自分を任意のクライアント（Bond含む）に追加できた。
-- =====================================================================

-- 1. user_clients: INSERT を禁止し、SELECT / DELETE のみ自分の行に許可
DROP POLICY IF EXISTS "own rows" ON user_clients;
CREATE POLICY "read own rows" ON user_clients
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "delete own rows" ON user_clients
  FOR DELETE USING (user_id = auth.uid());

-- 2. clients: 直接INSERTも禁止（作成は下の関数経由のみ）
DROP POLICY IF EXISTS "allow insert clients" ON clients;

-- 3. クライアント作成＋作成者の紐付けを1つのトランザクションで行う関数
CREATE OR REPLACE FUNCTION create_client_with_owner(p_name text, p_slug text)
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
  INSERT INTO clients (name, slug) VALUES (trim(p_name), p_slug) RETURNING id INTO v_id;
  INSERT INTO user_clients (user_id, client_id, role) VALUES (auth.uid(), v_id, 'admin');
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION create_client_with_owner(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_client_with_owner(text, text) TO authenticated;

-- 4. Bondクライアントは削除不可（誤操作・悪意の両方から保護）
DROP POLICY IF EXISTS "protect bond from delete" ON clients;
CREATE POLICY "protect bond from delete" ON clients
  AS RESTRICTIVE FOR DELETE USING (is_bond = false);
