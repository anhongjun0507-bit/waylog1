-- Waylog 데모 리뷰 시드 — Play Store 스크린샷 용
-- 사용법:
--   1. Supabase SQL Editor 새 쿼리 창 열기
--   2. 아래 전체 복붙
--   3. Run (Ctrl/Cmd + Enter)
--   4. "INSERT 0 12" 비슷하게 12개 삽입 메시지 확인
--   5. 앱 새로고침 → 홈 피드에 12개 리뷰 카드가 보임
--
-- 다시 실행하면 중복으로 또 12개 들어가니 한 번만 실행.
-- 지우려면 맨 아래 cleanup 쿼리 실행.

do $$
declare
  uid uuid;
begin
  -- 가장 최근에 가입한 사용자(=본인)를 자동 선택.
  -- 만약 여러 명이고 특정 유저로 넣고 싶으면 아래 줄을 수정:
  --   select id into uid from auth.users where email = 'your@email.com';
  select id into uid from auth.users order by created_at desc limit 1;
  if uid is null then
    raise exception 'auth.users 에 사용자가 없어요. 먼저 가입/로그인 해주세요.';
  end if;

  insert into public.reviews (user_id, title, content, category, tags, product_name, media, likes_count, views_count, created_at)
  values
    (uid,
     '칼맥 디 3개월 후기 — 손톱이 진짜 단단해졌어요',
     '평소 손톱이 잘 부러지고 머리카락도 푸석거려서 시작했는데, 90일 다 먹으니까 차이가 확 느껴져요. 칼슘+마그네슘+비타민D 조합이라 따로 챙겨먹는 것보다 훨씬 편하고, 위장에 부담도 적었어요. 큰 통이라 가성비도 굿.',
     'food',
     ARRAY['칼슘','뼈건강','3개월후기','뉴트리라이트'],
     '뉴트리라이트 칼맥 디',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h9e/hc0/9410924412958/NU_110608K_1_280_R.jpg"}]'::jsonb,
     87, 412, now() - interval '2 days'),

    (uid,
     '아세로라 C 매일 챙겨먹은 결과',
     '겨울에 감기 안 걸리려고 시작. 100일분이라서 가족이랑 같이 먹기 좋고, 한 알 한 알이 천연 아세로라 향이 살짝 나서 먹기 부담 없어요. 피로감 회복이 좀 빨라진 느낌.',
     'food',
     ARRAY['비타민C','면역력','일상템'],
     '뉴트리라이트 아세로라 C',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/ha2/h05/9410927689758/NU_105058K_280_R.jpg"}]'::jsonb,
     54, 287, now() - interval '4 days'),

    (uid,
     '뉴트리 마린 오메가3 — 비린맛 진짜 없음',
     '오메가3 종류는 다 비린맛 때문에 못 먹었는데 이건 진짜 깔끔해요. 캡슐도 작아서 삼키기 편하고 트림도 안 올라와요. 30일분이라 부담 없이 시작하기 좋음.',
     'food',
     ARRAY['오메가3','파이토마린','혈행건강'],
     '뉴트리 마린 오메가-3',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h83/hb9/9363112001566/NU_126138K_1_280_R.jpg"}]'::jsonb,
     32, 198, now() - interval '6 days'),

    (uid,
     '비타민C 겔 마스크로 인생 토닝팩 발견',
     '아침에 푸석한 피부에 5분만 올려도 톤이 환해지는 게 보여요. 끈적임 없고 흡수 빠른 겔 타입이라 아이메이크업 전에 써도 부담 없음. 비건이라 더 좋고요.',
     'beauty',
     ARRAY['비타민C','토닝팩','홈케어','비건'],
     '아티스트리 비타민 C 겔 마스크',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h64/hda/9495760273438/AR_128276V_1_280_R.jpg"}]'::jsonb,
     128, 631, now() - interval '1 day'),

    (uid,
     '비타민C + 히알루론산 트리플 액션 — 한 달 후',
     '34개월 처음으로 안티에이징 진지하게 시작한 제품. 각질이 없어지고 피부 결이 매끈해진 게 느껴져요. 텍스처가 가벼워서 메이크업 전에도 좋고 단독으로도 충분.',
     'beauty',
     ARRAY['안티에이징','히알루론산','트리플액션'],
     '아티스트리 비타민C+히알루론산',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h09/h51/9297385816094/AR_125517K_1_280_R.jpg"}]'::jsonb,
     76, 389, now() - interval '3 days'),

    (uid,
     '프로틴 아키텍처 크림 — 탄력 케어의 끝판왕',
     '가격대 있어서 망설였는데 한 통 다 쓰고 결국 재구매. 자고 일어나면 피부가 탱탱하게 채워진 느낌이 있어요. 향도 자극 없고 묵직한 텍스처라 겨울에 특히 좋음.',
     'beauty',
     ARRAY['탄력','크림','프리미엄'],
     '아티스트리 프로틴 아키텍처 크림',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h34/h02/9310883446814/AR_314494K_1_280_R.jpg"}]'::jsonb,
     93, 521, now() - interval '5 days'),

    (uid,
     '옵티미스트 가습기 — 겨울 필수템',
     '미세수분이 진짜 다르긴 해요. 일반 가습기랑 다르게 가구 위에 물방울 안 맺히고 호흡할 때 부드럽게 느껴짐. 디자인도 깔끔해서 거실에 두기 좋음. 매일 청소 안 해도 되는 게 가장 큰 장점.',
     'wellness',
     ARRAY['가습기','겨울','홈케어','웰빙'],
     '옵티미스트',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/hca/h46/9472461111326/HL_321249K_1_280_R.jpg"}]'::jsonb,
     67, 304, now() - interval '7 days'),

    (uid,
     '리플렉서 1699 — 종일 서서 일하는 사람 필수',
     '간호사라서 종일 서있는데 발 피로가 진짜 다르더라고요. 자기 전 15분만 해도 뻐근함이 풀리고 다음 날 다리 무거움이 줄어요. 가격은 비싸지만 매일 쓰니까 본전 뽑음.',
     'wellness',
     ARRAY['풋케어','셀프케어','루틴'],
     '리플렉서 1699',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h39/h81/9297686298654/NBD_314237K_1_280_R_v2.jpg"}]'::jsonb,
     45, 218, now() - interval '8 days'),

    (uid,
     'SA8 프리워시 스프레이 — 얼룩 진짜 잘 빠짐',
     '아이 옷에 김치 국물, 토마토 묻으면 바로 뿌려두고 세탁기 돌리면 거의 완전 제거. 화학 냄새 적고 한 통이 오래 가요. 집들이 선물로도 자주 사용함.',
     'home',
     ARRAY['세탁','얼룩제거','암웨이홈','집들이선물'],
     'SA8 프리워시 스프레이 세제',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/ha5/hd5/9082394181662"}]'::jsonb,
     58, 256, now() - interval '10 days'),

    (uid,
     '디쉬드랍스 바이오퀘스트 — 손이 안 거칠어져요',
     '겨울만 되면 손등이 갈라지던 사람인데 이거 쓰고부터 안 거칠어졌어요. 거품도 잘 나고 한두 방울이면 충분해서 한 통이 진짜 오래 갑니다.',
     'home',
     ARRAY['주방세제','민감성','암웨이홈'],
     '디쉬드랍스 식기 세정제',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/h08/hc2/9082394705950"}]'::jsonb,
     41, 187, now() - interval '12 days'),

    (uid,
     '글리스터 프로액션 — 입냄새 확실히 줄어요',
     '구강 클리닉 다녀온 뒤 추천 받아 시작. 일반 치약이랑 차원이 다른 개운함이고, 점심 먹은 뒤 트림 올라와도 입냄새가 적어진 게 느껴져요. 민트 향이 강하지 않아서 부담 없음.',
     'kitchen',
     ARRAY['치약','구강관리','민트'],
     '글리스터 프로액션 컴플리트',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/hff/hc4/9322150789150/BB_124106K_1_280_R.jpg"}]'::jsonb,
     38, 165, now() - interval '14 days'),

    (uid,
     'g&h 너리쉬 바디로션 — 향이 너무 좋음',
     '발라서 흡수 빠르고 끈적임 0. 향이 은은해서 강한 향수 못 쓰는 사람한테 추천. 400ml라서 양이 넉넉하고 가족 같이 써도 한 달은 가요.',
     'kitchen',
     ARRAY['바디로션','데일리','g&h'],
     'g&h 너리쉬 바디 로션',
     '[{"type":"image","url":"https://media.amway.co.kr/sys-master/images/hbf/h8e/9338345979934/BB_125891K_400ml_280_R.jpg"}]'::jsonb,
     52, 234, now() - interval '15 days');

  raise notice 'Seeded 12 demo reviews for user %', uid;
end$$;

-- =====================================================================
-- 정리: 위 12개 리뷰만 지우고 싶을 때 (제목 prefix 없으니 본문 매칭)
-- =====================================================================
-- delete from public.reviews
-- where user_id = (select id from auth.users order by created_at desc limit 1)
--   and title in (
--     '칼맥 디 3개월 후기 — 손톱이 진짜 단단해졌어요',
--     '아세로라 C 매일 챙겨먹은 결과',
--     '뉴트리 마린 오메가3 — 비린맛 진짜 없음',
--     '비타민C 겔 마스크로 인생 토닝팩 발견',
--     '비타민C + 히알루론산 트리플 액션 — 한 달 후',
--     '프로틴 아키텍처 크림 — 탄력 케어의 끝판왕',
--     '옵티미스트 가습기 — 겨울 필수템',
--     '리플렉서 1699 — 종일 서서 일하는 사람 필수',
--     'SA8 프리워시 스프레이 — 얼룩 진짜 잘 빠짐',
--     '디쉬드랍스 바이오퀘스트 — 손이 안 거칠어져요',
--     '글리스터 프로액션 — 입냄새 확실히 줄어요',
--     'g&h 너리쉬 바디로션 — 향이 너무 좋음'
--   );
