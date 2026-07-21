// 관리자 대시보드.
// 화면을 가리는 것만으로는 안전하지 않다. 실제 권한은 서버(RLS)가 is_admin()으로 막는다.
// 여기 버튼들은 관리자가 아니면 서버에서 조용히 거절당한다.

const gate = document.getElementById('gate');
const adminMain = document.getElementById('adminMain');
const meBox = document.getElementById('me');
const meName = document.getElementById('meName');

const statsEl = document.getElementById('stats');
const writerStatsEl = document.getElementById('writerStats');
const topicListEl = document.getElementById('topicList');
const postListEl = document.getElementById('postList');
const deletedCommentsEl = document.getElementById('deletedComments');

let 나 = null;

// ===== 진입: 관리자만 통과 =====

(async () => {
  나 = await 지금로그인한사람();

  if (!나) {
    gate.hidden = false;
    gate.textContent = '로그인이 필요해요. 먼저 로그인해 주세요.';
    return;
  }

  meBox.hidden = false;
  meName.textContent = 사람의닉네임(나);

  const { data: 관리자, error } = await db.rpc('is_admin');
  if (error || !관리자) {
    gate.hidden = false;
    gate.textContent = '관리자만 볼 수 있는 페이지예요.';
    return;
  }

  adminMain.hidden = false;
  await 전체그리기();
})();

document.getElementById('logoutButton').addEventListener('click', async () => {
  await 로그아웃();
  location.href = 'index.html';
});

async function 전체그리기() {
  await Promise.all([현황그리기(), 주제그리기(), 글그리기(), 지워진댓글그리기()]);
}

// ===== 현황 =====

async function 현황그리기() {
  const [{ data: topics }, { data: posts }] = await Promise.all([
    db.from('topics').select('id, name, deleted_at'),
    db.from('posts').select('id, topic_id, nickname, deleted_at'),
  ]);

  const 살아있는주제 = topics.filter((t) => !t.deleted_at);
  const 살아있는글 = posts.filter((p) => !p.deleted_at);
  const 참여자 = new Map();
  살아있는글.forEach((p) => 참여자.set(p.nickname, (참여자.get(p.nickname) || 0) + 1));

  statsEl.innerHTML = '';
  const 통계 = [
    ['주제', 살아있는주제.length],
    ['글', 살아있는글.length],
    ['참여자', 참여자.size],
    ['지워진 글', posts.length - 살아있는글.length],
  ];
  통계.forEach(([label, n]) => {
    const box = document.createElement('div');
    box.className = 'admin__stat';
    box.innerHTML = `<span class="admin__stat-n">${n}</span><span class="admin__stat-l">${label}</span>`;
    statsEl.appendChild(box);
  });

  // 참여자별 글 수 (많이 쓴 순)
  const 정렬 = [...참여자.entries()].sort((a, b) => b[1] - a[1]);
  writerStatsEl.innerHTML = '<div class="admin__writers-title">참여자별 글 수</div>';
  정렬.forEach(([name, n]) => {
    const row = document.createElement('div');
    row.className = 'admin__writer';
    row.innerHTML = `<span>${escapeHtml(name)}</span><span>${n}</span>`;
    writerStatsEl.appendChild(row);
  });
  if (정렬.length === 0) writerStatsEl.innerHTML += '<div class="admin__empty">아직 글이 없어요.</div>';
}

// ===== 주제 관리 =====

async function 주제그리기() {
  const [{ data: topics }, { data: posts }] = await Promise.all([
    db.from('topics').select('id, name, sort, deleted_at').order('sort', { nullsFirst: false }).order('id'),
    db.from('posts').select('topic_id, deleted_at'),
  ]);

  const 글수 = {};
  posts.filter((p) => !p.deleted_at).forEach((p) => (글수[p.topic_id] = (글수[p.topic_id] || 0) + 1));

  // 순서 바꾸기는 살아있는 주제끼리만 의미가 있다
  const 살아있는 = topics.filter((t) => !t.deleted_at);

  topicListEl.innerHTML = '';
  topics.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'admin__topic' + (t.deleted_at ? ' is-hidden' : '');

    const name = document.createElement('input');
    name.className = 'admin__topic-name';
    name.value = t.name;
    name.title = '고치고 Enter';
    name.disabled = !!t.deleted_at;
    name.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const 새이름 = name.value.trim();
      if (!새이름 || 새이름 === t.name) return;
      const { error } = await db.from('topics').update({ name: 새이름 }).eq('id', t.id);
      if (error) { alert('수정 실패'); return; }
      name.blur();
      주제그리기();
    });

    const count = document.createElement('span');
    count.className = 'admin__topic-count';
    count.textContent = `${글수[t.id] || 0}편`;

    // 순서 버튼: 살아있는 주제 안에서의 위치로 위/아래 판단
    const idx = 살아있는.findIndex((x) => x.id === t.id);
    const up = 순서버튼('↑', t.deleted_at || idx <= 0, () => 순서바꾸기(살아있는, idx, idx - 1));
    const down = 순서버튼('↓', t.deleted_at || idx === 살아있는.length - 1, () => 순서바꾸기(살아있는, idx, idx + 1));

    // 숨기기 / 되살리기
    const toggle = document.createElement('button');
    toggle.className = 'admin__toggle';
    toggle.textContent = t.deleted_at ? '되살리기' : '숨기기';
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      const { error } = await db.from('topics')
        .update({ deleted_at: t.deleted_at ? null : new Date().toISOString() })
        .eq('id', t.id);
      if (error) { alert('실패'); toggle.disabled = false; return; }
      주제그리기();
      현황그리기();
    });

    li.append(up, down, name, count, toggle);
    topicListEl.appendChild(li);
  });
}

function 순서버튼(글자, 비활성, onClick) {
  const b = document.createElement('button');
  b.className = 'admin__order';
  b.textContent = 글자;
  b.disabled = 비활성;
  b.addEventListener('click', onClick);
  return b;
}

// 두 주제의 sort 값을 맞바꿔 자리를 바꾼다
async function 순서바꾸기(topics, i, j) {
  const a = topics[i], b = topics[j];
  const sa = a.sort ?? a.id, sb = b.sort ?? b.id;
  await Promise.all([
    db.from('topics').update({ sort: sb }).eq('id', a.id),
    db.from('topics').update({ sort: sa }).eq('id', b.id),
  ]);
  주제그리기();
}

document.getElementById('addTopicForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newTopic');
  const name = input.value.trim();
  if (!name) return;

  // 새 주제는 맨 뒤로. 지금 가장 큰 sort 다음 값을 준다.
  const { data: 마지막 } = await db.from('topics').select('sort, id').order('sort', { nullsFirst: false }).order('id');
  const 최대 = 마지막.reduce((m, t) => Math.max(m, t.sort ?? t.id), 0);

  const { error } = await db.from('topics').insert({ name, sort: 최대 + 1 });
  if (error) { alert('추가 실패: ' + error.message); return; }
  input.value = '';
  주제그리기();
  현황그리기();
});

// ===== 글 관리 (숨기기 / 되살리기) =====

async function 글그리기() {
  const [{ data: topics }, { data: posts }] = await Promise.all([
    db.from('topics').select('id, name, sort').order('sort', { nullsFirst: false }).order('id'),
    db.from('posts').select('id, topic_id, title, nickname, deleted_at').order('id'),
  ]);

  postListEl.innerHTML = '';
  topics.forEach((t) => {
    const 이주제글 = posts.filter((p) => p.topic_id === t.id);
    if (이주제글.length === 0) return;

    const group = document.createElement('div');
    group.className = 'admin__post-group';
    group.innerHTML = `<div class="admin__post-topic">${escapeHtml(t.name)}</div>`;

    이주제글.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'admin__post' + (p.deleted_at ? ' is-hidden' : '');
      row.innerHTML = `
        <span class="admin__post-title">${escapeHtml(p.title)}</span>
        <span class="admin__post-who">${escapeHtml(p.nickname)}</span>`;

      const btn = document.createElement('button');
      btn.className = 'admin__toggle';
      btn.textContent = p.deleted_at ? '되살리기' : '숨기기';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await db.from('posts')
          .update({ deleted_at: p.deleted_at ? null : new Date().toISOString() })
          .eq('id', p.id);
        if (error) { alert('실패'); btn.disabled = false; return; }
        글그리기();
        현황그리기();
      });
      row.appendChild(btn);
      group.appendChild(row);
    });
    postListEl.appendChild(group);
  });
}

// ===== 지워진 댓글 되살리기 =====

async function 지워진댓글그리기() {
  // 관리자가 볼 수 있는 범위의 지워진 댓글(비밀 댓글은 정책상 안 보일 수 있다)
  const { data } = await db.from('comments')
    .select('id, nickname, body, is_secret')
    .not('deleted_at', 'is', null)
    .order('id');

  deletedCommentsEl.innerHTML = '';
  if (!data || data.length === 0) {
    deletedCommentsEl.innerHTML = '<li class="admin__empty">지워진 댓글이 없어요.</li>';
    return;
  }
  data.forEach((c) => {
    const li = document.createElement('li');
    li.className = 'admin__comment';
    li.innerHTML = `
      <span class="admin__comment-who">${c.is_secret ? '🔒 ' : ''}${escapeHtml(c.nickname)}</span>
      <span class="admin__comment-body">${escapeHtml(c.body)}</span>`;
    const btn = document.createElement('button');
    btn.className = 'admin__toggle';
    btn.textContent = '되살리기';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { error } = await db.from('comments').update({ deleted_at: null }).eq('id', c.id);
      if (error) { alert('실패'); btn.disabled = false; return; }
      지워진댓글그리기();
    });
    li.appendChild(btn);
    deletedCommentsEl.appendChild(li);
  });
}

// 사용자 입력을 화면에 넣을 때 태그로 해석되지 않게 막는다
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
