// 단어 페이지: 그 주제에 올라온 글들의 첫 문장이 흩어져 떠다니고,
// 문장을 누르면 전체 글과 닉네임이 나온다.

const field = document.getElementById('field');
const fieldMessage = document.getElementById('fieldMessage');
const topicNameEl = document.getElementById('topicName');
const writersEl = document.getElementById('writers');

const writeDialog = document.getElementById('writeDialog');
const writeForm = document.getElementById('writeForm');
const bodyInput = document.getElementById('bodyInput');
const titleInput = document.getElementById('titleInput');
const whoAmIName = document.getElementById('whoAmIName');
const charCount = document.getElementById('charCount');
const writeError = document.getElementById('writeError');
const writeSubmit = document.getElementById('writeSubmit');

const readDialog = document.getElementById('readDialog');
const readTitle = document.getElementById('readTitle');
const readBody = document.getElementById('readBody');
const readNickname = document.getElementById('readNickname');
const deleteError = document.getElementById('deleteError');
const deleteStart = document.getElementById('deleteStart');

const commentList = document.getElementById('commentList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentSecret = document.getElementById('commentSecret');
const commentSignin = document.getElementById('commentSignin');

const meBox = document.getElementById('me');
const meName = document.getElementById('meName');
const signInButton = document.getElementById('signInButton');

const authDialog = document.getElementById('authDialog');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authName = document.getElementById('authName');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');

// 지금 열려 있는 글. 삭제할 때 어느 글인지 알아야 해서 들고 있는다.
let openPost = null;

// 주소 끝의 ?id=3 에서 3을 꺼낸다
const topicId = Number(new URLSearchParams(location.search).get('id'));

// 지금 로그인한 사람. 로그인/로그아웃할 때마다 갱신한다.
let 나 = null;

// ===== 흩뿌리기 =====

// topics.js와 같은 방식. id만 있으면 언제나 같은 자리에 놓이므로,
// 새로고침해도 글들이 춤추듯 자리를 바꾸지 않는다.
function noise(seed, salt) {
  let h = Math.imul(seed, 374761393) + Math.imul(salt, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function between(seed, salt, min, max) {
  return min + noise(seed, salt) * (max - min);
}

// 글 하나가 차지하는 세로 칸의 높이(px).
// 칸보다 큰 폭으로 흔들어서, 이웃한 덩어리끼리 모서리가 살짝 겹치게 만든다.
const 좁은화면 = window.matchMedia('(max-width: 700px)').matches;

// 한 가로줄에 몇 개를 놓을지.
// 폰에서도 두 개씩 놓아야 글이 가로로 퍼진다. 하나씩 놓으면 세로로만 끝없이 길어져서
// 레퍼런스 포스터 같은 밀도가 안 나온다. 대신 제목을 작게 줄여 자리를 만든다.
const PER_ROW = 2;

// 가로줄 하나의 높이(px)
const ROW_HEIGHT = 좁은화면 ? 190 : 270;

// 무늬로 쓸 본문의 최대 길이. 본문이 이보다 짧으면 짧은 대로 쓴다.
const PATTERN_LENGTH = 260;

// 제목이 짧을수록 크게 박힌다.
// 레퍼런스에서 '십'은 화면을 뚫을 듯이 큰데 '비둘기공원광장과'는 그보다 작은 것과 같은 원리.
function titleSize(seed, title) {
  // 폰에서는 한 열이 190px 남짓이라, 큰 제목 하나가 화면 폭을 통째로 먹어버린다.
  // 글씨를 줄여야 옆자리가 생기고 가로로 퍼질 수 있다.
  const base = 좁은화면 ? between(seed, 3, 1.1, 2.3) : between(seed, 3, 1.9, 4.1);
  const scale = 2 / Math.sqrt(Math.max(title.length, 1));
  const 최대 = 좁은화면 ? 3.4 : 8;
  return Math.min(Math.max(base * scale, 좁은화면 ? 0.85 : 1.3), 최대);
}

function place(element, post, index) {
  const seed = post.id;

  // 한 가로줄에 PER_ROW개씩 나란히 놓는다.
  const row = Math.floor(index / PER_ROW);
  const column = index % PER_ROW;

  // 줄 안에서 위아래로 크게 흔들어야 반듯한 표처럼 보이지 않는다.
  // 흔드는 폭이 줄 높이의 3분의 1을 넘으면 위아래 줄의 경계가 흐려져서
  // 격자로 놓았다는 티가 나지 않는다.
  const 흔들폭 = 좁은화면 ? 55 : 95;
  const top = row * ROW_HEIGHT + between(seed, 1, -흔들폭, 흔들폭);

  // 각자 자기 열 안에서 좌우로 흔들린다. 열 폭을 넘기면 옆 덩어리와 부딪힌다.
  // 덩어리는 왼쪽 위를 기준으로 놓이므로, 오른쪽 열은 자기 폭만큼 여유를 남겨야
  // 화면 밖으로 삐져나가지 않는다.
  const columnWidth = 100 / PER_ROW;
  const 여지 = 좁은화면 ? columnWidth * 0.16 : columnWidth * 0.5;
  const left = column * columnWidth + between(seed, 2, 0, 여지);

  // 원래 놓고 싶었던 자리. 아래 밀어내기에서 이 값을 출발점으로 다시 계산한다.
  element.dataset.baseTop = top.toFixed(0);
  element.style.top = `${top.toFixed(0)}px`;
  element.style.left = `${left.toFixed(2)}%`;
  element.style.setProperty('--title-size', titleSize(seed, post.title).toFixed(2));
  element.style.setProperty('--pattern-size', between(seed, 8, 좁은화면 ? 0.34 : 0.42, 좁은화면 ? 0.46 : 0.6).toFixed(2));
  // 무늬 덩어리의 폭. 좁을수록 세로로 길쭉한 블록이 된다.
  element.style.setProperty('--pattern-width', between(seed, 9, 좁은화면 ? 3 : 5, 좁은화면 ? 6.5 : 12).toFixed(1));
  // 숨 쉬는 속도와 시작 시점을 저마다 다르게 줘야 다 같이 출렁이지 않는다.
  // 주기가 너무 길면 초당 1px도 안 움직여서 멈춰 있는 것처럼 보인다.
  element.style.setProperty('--float-time', between(seed, 6, 4.5, 8).toFixed(1));
  element.style.setProperty('--float-delay', between(seed, 7, 0, 8).toFixed(1));
}

// ===== 겹치면 밀어내기 =====

// 격자에 놓고 흔드는 것만으로는 겹침을 막을 수 없다.
// 덩어리마다 크기가 제각각이라(세로쓰기 무늬는 특히 길다) 흔들다 보면 이웃과 부딪힌다.
// 그래서 다 그린 뒤에 실제 크기를 재서, 부딪히는 것만 아래로 내린다.
// 위에서부터 순서대로 자리를 확정하므로 결과는 항상 같다.
const 덩어리간여백 = 26;

function 겹침밀어내기() {
  const 덩어리들 = [...field.querySelectorAll('.cluster')];
  const 놓인것 = [];

  덩어리들.forEach((el) => {
    // 애니메이션으로 떠 있는 상태가 섞이지 않도록, 화면 좌표가 아니라
    // 레이아웃 좌표(offset*)로 잰다.
    const 왼쪽 = el.offsetLeft;
    const 오른쪽 = 왼쪽 + el.offsetWidth;
    const 높이 = el.offsetHeight;
    let 위 = Number(el.dataset.baseTop);

    // 이미 자리를 잡은 것들과 부딪히는 동안 계속 아래로 내린다
    let 충돌;
    do {
      충돌 = 놓인것.find((p) =>
        왼쪽 < p.right && p.left < 오른쪽 &&
        위 < p.bottom + 덩어리간여백 && p.top < 위 + 높이 + 덩어리간여백
      );
      if (충돌) 위 = 충돌.bottom + 덩어리간여백;
    } while (충돌);

    el.style.top = `${위}px`;
    놓인것.push({ left: 왼쪽, right: 오른쪽, top: 위, bottom: 위 + 높이 });
  });

  // 밀어낸 만큼 판도 길어져야 마지막 글이 잘리지 않는다
  const 맨아래 = 놓인것.reduce((m, p) => Math.max(m, p.bottom), 0);
  field.style.height = `${맨아래 + 180}px`;
}

// ===== 화면에 그리기 =====

function render(posts) {
  field.innerHTML = '';
  이페이지글들 = posts;

  if (posts.length === 0) {
    fieldMessage.hidden = false;
    fieldMessage.textContent = 'No posts yet';
    field.style.height = '0px';
    return;
  }

  fieldMessage.hidden = true;
  // 가로줄 수만큼 페이지가 아래로 길어진다
  const rows = Math.ceil(posts.length / PER_ROW);
  field.style.height = `${rows * ROW_HEIGHT + 220}px`;

  const fragment = document.createDocumentFragment();

  // 덩어리마다 제목과 무늬가 붙는 방향을 달리해서 그리드를 깬다
  const LAYOUTS = ['is-below', 'is-right', 'is-left', 'is-above'];

  posts.forEach((post, index) => {
    const seed = post.id;

    const cluster = document.createElement('button');
    cluster.type = 'button';
    cluster.className = `cluster ${LAYOUTS[seed % LAYOUTS.length]}`;
    // 닉네임 클릭으로 이 글 덩어리를 찾아갈 수 있게 표식을 남긴다
    cluster.dataset.id = post.id;
    // 세로쓰기와 명조는 뽑지 않고 돌려쓴다.
    // 무작위로 뽑으면 어떤 페이지는 명조가 하나도 안 나오고 어떤 페이지는 몰린다.
    // 나머지를 쓰면 세 글 중 하나는 반드시 명조가 된다.
    if (seed % 5 === 1 || seed % 5 === 3) cluster.classList.add('is-vertical');
    if (seed % 3 === 0) cluster.classList.add('is-serif');

    const title = document.createElement('span');
    title.className = 'cluster__title';
    // textContent를 쓰면 제목에 어떤 글자가 들어와도 안전하다
    title.textContent = post.title;

    const pattern = document.createElement('span');
    pattern.className = 'cluster__pattern';
    // 본문 앞부분을 잘라 무늬로 쓴다. 띄어쓰기와 줄바꿈을 빼야
    // 레퍼런스처럼 빈틈없는 덩어리가 된다. 읽으라고 있는 게 아니라 질감이다.
    pattern.textContent = post.body.replace(/\s+/g, '').slice(0, PATTERN_LENGTH);
    pattern.setAttribute('aria-hidden', 'true');

    cluster.append(title, pattern);
    cluster.addEventListener('click', () => open(post));
    place(cluster, post, index);
    fragment.appendChild(cluster);
  });

  field.appendChild(fragment);
  겹침밀어내기();

  // 웹폰트가 늦게 도착하면 글자 크기가 달라져 방금 잰 값이 틀어진다.
  // 폰트가 다 온 뒤에 한 번 더 잰다. 출발점(baseTop)이 그대로라 결과는 흔들리지 않는다.
  document.fonts.ready.then(겹침밀어내기);
}

// 화면 폭이 바뀌면 열 수와 크기가 달라지므로 다시 재야 한다
let 리사이즈타이머;
window.addEventListener('resize', () => {
  clearTimeout(리사이즈타이머);
  리사이즈타이머 = setTimeout(겹침밀어내기, 200);
});

// 이 단어에 글을 올린 사람들을 먼저 올린 순서대로 세운다.
// 같은 사람이 여러 번 올렸어도 이름은 한 번만 나온다. 참여자 명단이기 때문이다.
function renderWriters(posts) {
  const 본이름 = new Set();
  writersEl.innerHTML = '';

  posts.forEach((post) => {
    if (본이름.has(post.nickname)) return;
    본이름.add(post.nickname);

    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'writers__name';
    button.textContent = post.nickname;
    // 이름을 누르면 그 사람이 이 페이지에 쓴 글을 연다.
    // 여러 편이면 누를 때마다 다음 글로 넘어간다.
    button.addEventListener('click', () => 사람글열기(post.nickname));
    item.appendChild(button);
    writersEl.appendChild(item);
  });
}

// 지금 이 페이지에 그려진 글들. 닉네임을 눌러 같은 사람의 다음 글로 넘어갈 때 쓴다.
let 이페이지글들 = [];

// 왼쪽 명단에서 이름을 누르면, 그 사람이 이 페이지에 쓴 글을 팝업으로 연다.
// 여러 편이면 누를 때마다 다음 글로 순환한다.
function 사람글열기(nickname) {
  const 그사람글 = 이페이지글들.filter((p) => p.nickname === nickname);
  if (그사람글.length === 0) return;

  // 이미 그 사람 글을 보고 있으면 다음 글로, 아니면 첫 글로
  let 다음 = 그사람글[0];
  if (openPost && openPost.nickname === nickname && readDialog.open) {
    const 지금 = 그사람글.findIndex((p) => p.id === openPost.id);
    다음 = 그사람글[(지금 + 1) % 그사람글.length];
  }

  // 배경에서 그 글 덩어리를 화면 가운데로 슝 스크롤한 뒤 팝업을 연다
  const el = field.querySelector(`.cluster[data-id="${다음.id}"]`);
  readDialog.close();
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => open(다음), 420);
}

// 전문 창에서 닉네임을 누르면, 같은 사람이 이 페이지에 쓴 (다음) 글로 슉 넘어간다.
readNickname.addEventListener('click', () => {
  if (!openPost) return;
  const 같은사람 = 이페이지글들.filter((p) => p.nickname === openPost.nickname);
  if (같은사람.length < 2) return; // 글이 하나뿐이면 옮겨갈 데가 없다

  // 지금 글 다음 차례로. 마지막이면 처음으로 돌아온다(순환)
  const 지금 = 같은사람.findIndex((p) => p.id === openPost.id);
  const 다음 = 같은사람[(지금 + 1) % 같은사람.length];

  // 배경에서 그 글 덩어리를 화면 가운데로 스크롤한 뒤 전문 창을 연다
  const el = field.querySelector(`.cluster[data-id="${다음.id}"]`);
  readDialog.close();
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => open(다음), 420);
});

function open(post) {
  openPost = post;
  readTitle.textContent = post.title;
  readBody.textContent = post.body;
  readNickname.textContent = post.nickname;
  // 같은 사람 글이 이 페이지에 둘 이상이면 닉네임이 눌러서 넘어갈 수 있다는 표시를 준다
  const 여러편 = 이페이지글들.filter((p) => p.nickname === post.nickname).length > 1;
  readNickname.classList.toggle('is-linked', 여러편);
  deleteError.hidden = true;
  // 창을 다시 열 때 지난번 삭제 확인 줄이 남아있지 않게 되돌린다
  document.getElementById('deleteConfirm').hidden = true;
  document.getElementById('readButtons').hidden = false;
  // 내가 쓴 글일 때만 고치기/지우기 버튼이 나온다.
  // 버튼을 숨기는 건 눈에 보이는 정리일 뿐이고, 실제로 못 건드리게 막는 건 서버다.
  const 내글 = !!(나 && post.user_id === 나.id);
  deleteStart.hidden = !내글;
  document.getElementById('editStart').hidden = !내글;

  // 댓글 영역: 로그인했으면 입력칸, 아니면 안내문
  commentForm.hidden = !나;
  commentSignin.hidden = !!나;
  commentInput.value = '';
  댓글불러오기(post.id);

  readDialog.showModal();
  // 팝업은 항상 글의 맨 위(제목)부터 보이게 한다
  readDialog.scrollTop = 0;
  readTitle.focus({ preventScroll: true });
}

// ===== 댓글 =====

function 댓글그리기(comments) {
  commentList.innerHTML = '';
  comments.forEach((c) => {
    const item = document.createElement('li');
    item.className = 'comments__item';

    const who = document.createElement('span');
    who.className = 'comments__who';
    // 비밀 댓글은 자물쇠를 붙인다. 여기 보이는 사람은 작성자나 글쓴이뿐이다.
    who.textContent = (c.is_secret ? '🔒 ' : '') + c.nickname;

    const text = document.createElement('span');
    text.className = 'comments__text';
    text.textContent = c.body;

    item.append(who, text);

    // 내 댓글에는 지우기(×) — 소프트 삭제라 되살릴 수 있다
    if (나 && c.user_id === 나.id) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'comments__del';
      del.textContent = '×';
      del.title = '지우기';
      del.addEventListener('click', async () => {
        del.disabled = true;
        await db.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', c.id);
        댓글불러오기(c.post_id);
      });
      item.appendChild(del);
    }
    commentList.appendChild(item);
  });
}

async function 댓글불러오기(postId) {
  const { data, error } = await db
    .from('comments')
    .select('id, post_id, nickname, body, user_id, is_secret')
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('id'); // 먼저 단 댓글부터 위에

  if (error) {
    console.error('[topic] 댓글 불러오기 실패:', error);
    return;
  }
  댓글그리기(data);
}

commentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!나 || !openPost) return;

  const body = commentInput.value.trim();
  if (!body) return;

  const send = commentForm.querySelector('.comments__send');
  send.disabled = true;

  const { error } = await db.from('comments').insert({
    post_id: openPost.id,
    user_id: 나.id,
    nickname: 사람의닉네임(나),
    body,
    is_secret: commentSecret.checked,
  });

  send.disabled = false;

  if (error) {
    console.error('[topic] 댓글 달기 실패:', error);
    return;
  }

  commentInput.value = '';
  commentSecret.checked = false;
  댓글불러오기(openPost.id);
});

// ===== 불러오기 =====

async function load() {
  if (!Number.isInteger(topicId) || topicId < 1) {
    fieldMessage.textContent = 'Invalid address';
    return;
  }

  const [topicResult, postsResult] = await Promise.all([
    db.from('topics').select('name').eq('id', topicId).maybeSingle(),
    db.from('posts').select('id, title, nickname, body, user_id').eq('topic_id', topicId).is('deleted_at', null).order('id'),
  ]);

  if (topicResult.error || postsResult.error) {
    console.error('[topic] 불러오기 실패:', topicResult.error ?? postsResult.error);
    fieldMessage.textContent = 'Failed to load';
    return;
  }

  if (!topicResult.data) {
    fieldMessage.textContent = 'Topic not found';
    return;
  }

  topicNameEl.textContent = topicResult.data.name;
  document.title = `${topicResult.data.name} — Writing Club`;
  renderWriters(postsResult.data);
  render(postsResult.data);
}

// ===== 글 올리기 =====

bodyInput.addEventListener('input', () => {
  const count = bodyInput.value.trim().length;
  charCount.textContent = count;
  // 500자를 넘겨도 막지는 않는다. 넘었다는 것만 눈에 보이게 한다.
  charCount.parentElement.classList.toggle('is-over', count > 500);
});

// ===== 로그인 =====

let 가입모드 = false;

function 로그인상태그리기() {
  const 이름 = 사람의닉네임(나);
  meBox.hidden = !나;
  // 로그인 전에는 그 자리에 Sign in이 대신 선다
  signInButton.hidden = !!나;
  meName.textContent = 이름;
  whoAmIName.textContent = 이름;
}

signInButton.addEventListener('click', 로그인창열기);

function 로그인창열기() {
  가입모드 = false;
  authForm.reset();
  authError.hidden = true;
  authTitle.textContent = 'Sign in';
  authSubmit.textContent = 'Sign in';
  authToggle.textContent = 'Sign up';
  authDialog.showModal();
  authName.focus();
}

authToggle.addEventListener('click', () => {
  // 로그인 ↔ 가입을 한 폼에서 오간다
  가입모드 = !가입모드;
  authError.hidden = true;
  authTitle.textContent = 가입모드 ? 'Sign up' : 'Sign in';
  authSubmit.textContent = 가입모드 ? 'Sign up' : 'Sign in';
  authToggle.textContent = 가입모드 ? 'Sign in' : 'Sign up';
  authName.focus();
});

document.getElementById('authCancel').addEventListener('click', () => authDialog.close());

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const 이름 = authName.value.trim();
  const 비번 = authPassword.value;
  if (!이름 || !비번) return;

  authSubmit.disabled = true;
  authError.hidden = true;

  const 결과 = 가입모드 ? await 가입(이름, 비번) : await 로그인(이름, 비번);

  authSubmit.disabled = false;

  if (!결과.ok) {
    authError.hidden = false;
    authError.textContent = 결과.message;
    return;
  }

  나 = 결과.user;
  로그인상태그리기();
  authDialog.close();
  // 로그인하자마자 글을 쓸 수 있게 바로 글쓰기 창을 연다
  글쓰기창열기();
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  await 로그아웃();
  나 = null;
  로그인상태그리기();
  load();
});

// ===== 글 쓰기 / 고치기 =====

// 지금 고치는 중인 글. null이면 새 글을 쓰는 것이다.
let 편집중 = null;

const writeTitle = document.getElementById('writeTitle');

function 글쓰기창열기() {
  편집중 = null;
  writeTitle.textContent = 'Write';
  writeSubmit.textContent = 'Post';
  writeForm.reset();
  charCount.textContent = '0';
  charCount.parentElement.classList.remove('is-over');
  writeError.hidden = true;
  로그인상태그리기();
  writeDialog.showModal();
  titleInput.focus();
}

// 전문 창에서 Edit을 누르면 그 글 내용을 채운 채로 글쓰기 창을 연다
document.getElementById('editStart').addEventListener('click', () => {
  if (!openPost || !나) return;
  편집중 = openPost;
  writeTitle.textContent = 'Edit';
  writeSubmit.textContent = 'Save';
  titleInput.value = openPost.title;
  bodyInput.value = openPost.body;
  bodyInput.dispatchEvent(new Event('input', { bubbles: true })); // 글자수 갱신
  writeError.hidden = true;
  로그인상태그리기();
  readDialog.close();
  writeDialog.showModal();
  titleInput.focus();
});

document.getElementById('writeButton').addEventListener('click', () => {
  // 로그인하지 않았으면 글쓰기 대신 로그인부터
  if (!나) {
    로그인창열기();
    return;
  }
  글쓰기창열기();
});

document.getElementById('writeCancel').addEventListener('click', () => {
  편집중 = null;
  writeDialog.close();
});
document.getElementById('readClose').addEventListener('click', () => readDialog.close());

// ===== 글 지우기 =====

const deleteConfirm = document.getElementById('deleteConfirm');
const readButtons = document.getElementById('readButtons');

// Delete를 누르면 바로 지우지 않고 확인 줄을 먼저 보여준다
deleteStart.addEventListener('click', () => {
  deleteError.hidden = true;
  readButtons.hidden = true;
  deleteConfirm.hidden = false;
});

// Cancel을 누르면 원래 버튼으로 돌아간다
document.getElementById('deleteNo').addEventListener('click', () => {
  deleteConfirm.hidden = true;
  readButtons.hidden = false;
});

const deleteYes = document.getElementById('deleteYes');
deleteYes.addEventListener('click', async () => {
  if (!openPost || !나) return;

  deleteYes.disabled = true;
  deleteYes.textContent = 'Deleting…';
  deleteError.hidden = true;

  // 진짜로 지우지 않고 '지워짐' 표시만 남긴다(소프트 삭제).
  // 화면에서는 사라지지만 데이터는 남아, 실수로 지워도 되살릴 수 있다.
  // 남의 글을 지우려 해도 서버가 막는다.
  const { error } = await db
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', openPost.id);

  deleteYes.disabled = false;
  deleteYes.textContent = 'Yes, delete';

  if (error) {
    console.error('[topic] 글 지우기 실패:', error);
    deleteError.hidden = false;
    deleteError.textContent = 'Failed to delete';
    return;
  }

  readDialog.close();
  load();
});

writeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!나) {
    writeDialog.close();
    로그인창열기();
    return;
  }

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const nickname = 사람의닉네임(나);
  if (!title || !body) return;

  const 고치는중 = 편집중 !== null;

  // 두 번 눌러서 같은 글이 두 번 올라가는 것을 막는다
  writeSubmit.disabled = true;
  writeSubmit.textContent = 고치는중 ? 'Saving…' : 'Posting…';
  writeError.hidden = true;

  let error;
  if (고치는중) {
    // 내 글만 고칠 수 있다. 남의 글 id를 넣어도 서버가 막는다.
    ({ error } = await db
      .from('posts')
      .update({ title, body })
      .eq('id', 편집중.id));
  } else {
    // user_id를 같이 넣어야 "내 글"로 인정된다.
    // 남의 id를 적어 보내도 서버가 로그인 증표와 대조해서 거절한다.
    ({ error } = await db
      .from('posts')
      .insert({ topic_id: topicId, title, nickname, body, user_id: 나.id }));
  }

  writeSubmit.disabled = false;
  writeSubmit.textContent = 고치는중 ? 'Save' : 'Post';

  if (error) {
    console.error('[topic] 글 저장 실패:', error);
    writeError.hidden = false;
    writeError.textContent = 고치는중 ? 'Failed to save' : 'Failed to post';
    return;
  }

  편집중 = null;

  writeDialog.close();
  writeForm.reset();
  charCount.textContent = '0';
  charCount.parentElement.classList.remove('is-over');
  // 방금 올린 글이 바로 보이도록 다시 불러온다
  load();
});

// 페이지를 열면 먼저 로그인 상태부터 확인한다.
// 로그인은 브라우저에 남아 있으므로 새로고침해도 풀리지 않는다.
(async () => {
  나 = await 지금로그인한사람();
  로그인상태그리기();
  load();
})();
