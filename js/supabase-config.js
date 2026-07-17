// Supabase 접속 정보.
// 이 키는 브라우저에 공개되는 것이 정상이다. 실제 보호는 Supabase 쪽에 걸어둔
// 보안 규칙(RLS)이 한다 — 누구나 글을 읽고 올릴 수 있지만, 아무도 지울 수 없다.
// 절대 여기에 secret key(sb_secret_...)를 넣지 말 것.
const SUPABASE_URL = 'https://wiozpsmbqohgtelgowyp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XbiYNBdxy9opBMqT8o_vUQ__eEFjwIa';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
