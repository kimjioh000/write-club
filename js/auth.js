// 닉네임 + 비밀번호 로그인.
//
// Supabase의 인증 기능은 이메일을 요구하지만, 우리는 이메일을 묻고 싶지 않다.
// 그래서 닉네임을 이메일처럼 생긴 문자열로 바꿔서 넘긴다.
// 사용자는 닉네임만 알면 되고, 메일은 오가지 않는다.
//
// 왜 이렇게까지 하냐면, 닉네임과 비밀번호를 우리 테이블에 직접 저장하고
// "맞으면 로그인"으로 만들면 브라우저에서 로그인한 척 위조할 수 있기 때문이다.
// 이 방식은 서버가 발급한 증표로만 신원을 확인하므로 위조가 불가능하다.

const 가짜도메인 = 'write-club.local';

// 닉네임을 이메일 주소로 바꾼다.
// 한글이나 공백은 이메일에 못 들어가므로 해시로 바꿔 영문+숫자만 남긴다.
// 같은 닉네임이면 언제나 같은 주소가 나오므로 로그인할 때 다시 찾아갈 수 있다.
async function 닉네임을주소로(nickname) {
  const 바이트 = new TextEncoder().encode(nickname.trim());
  const 해시 = await crypto.subtle.digest('SHA-256', 바이트);
  const hex = [...new Uint8Array(해시)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `u${hex}@${가짜도메인}`;
}

// 지금 로그인한 사람. 없으면 null
async function 지금로그인한사람() {
  const { data } = await db.auth.getUser();
  return data.user ?? null;
}

// 로그인한 사람의 닉네임
function 사람의닉네임(user) {
  return user?.user_metadata?.nickname ?? '';
}

async function 로그인(nickname, password) {
  const email = await 닉네임을주소로(nickname);
  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    // 어떤 경우든 Supabase는 같은 메시지를 준다. 닉네임이 틀렸는지
    // 비밀번호가 틀렸는지 알려주지 않는 것이 안전하다.
    return { ok: false, message: '닉네임이나 비밀번호가 달라요' };
  }
  return { ok: true, user: data.user };
}

async function 가입(nickname, password) {
  const email = await 닉네임을주소로(nickname);
  const { data, error } = await db.auth.signUp({
    email,
    password,
    // 닉네임은 여기 담아둔다. 이메일 주소는 해시라서 되돌릴 수 없기 때문이다.
    options: { data: { nickname: nickname.trim() } },
  });

  if (error) {
    if (/already/i.test(error.message)) {
      return { ok: false, message: '이미 있는 닉네임이에요' };
    }
    if (/at least|password/i.test(error.message)) {
      return { ok: false, message: '비밀번호는 4자 이상이어야 해요' };
    }
    console.error('[auth] 가입 실패:', error);
    return { ok: false, message: '가입하지 못했어요' };
  }

  // 이메일 확인 설정이 켜져 있으면 세션 없이 돌아온다. 그러면 로그인이 안 된다.
  if (!data.session) {
    return { ok: false, message: '가입은 됐지만 로그인이 막혀 있어요. 관리자에게 알려주세요.' };
  }

  return { ok: true, user: data.user };
}

async function 로그아웃() {
  await db.auth.signOut();
}
