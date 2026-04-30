-- 1.4.5 회귀 5b — 프로필 사진/닉네임/bio 저장이 storage 만 성공하고 profiles 컬럼은
-- null 인 채로 남는 회귀. 원인은 PostgREST upsert + RLS 의 어떤 path 가 silent
-- fail. SECURITY DEFINER RPC 로 통일해 RLS 우회 + auth.uid() 명시 검증.
--
-- 사용처: supabase JS SDK 의 supabase.rpc('update_my_profile', { _nickname, _avatar_url, _bio })
-- 인자 모두 NULL 허용 — NULL 이면 기존 값 유지 (COALESCE).

CREATE OR REPLACE FUNCTION public.update_my_profile(
  _nickname text DEFAULT NULL,
  _avatar_url text DEFAULT NULL,
  _bio text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result public.profiles;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET nickname = COALESCE(_nickname, nickname),
      avatar_url = COALESCE(_avatar_url, avatar_url),
      bio = COALESCE(_bio, bio),
      updated_at = NOW()
  WHERE id = uid
  RETURNING * INTO result;

  -- row 없는 경우(아직 profile 미생성) 명시 INSERT.
  IF result.id IS NULL THEN
    INSERT INTO public.profiles (id, nickname, avatar_url, bio)
    VALUES (uid, _nickname, _avatar_url, _bio)
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text) TO authenticated;
