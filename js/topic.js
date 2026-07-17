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
    item.className = 'writers__name';
    item.textContent = post.nickname;
    writersEl.appendChild(item);
  });
}

function open(post) {
  openPost = post;
  readTitle.textContent = post.title;
  readBody.textContent = post.body;
  readNickname.textContent = post.nickname;
  deleteError.hidden = true;
  // 내가 쓴 글일 때만 지우기 버튼이 나온다.
  // 버튼을 숨기는 건 눈에 보이는 정리일 뿐이고, 실제로 못 지우게 막는 건 서버다.
  deleteStart.hidden = !(나 && post.user_id === 나.id);
  readDialog.showModal();
}

// ===== 불러오기 =====

async function load() {
  if (!Number.isInteger(topicId) || topicId < 1) {
    fieldMessage.textContent = 'Invalid address';
    return;
  }

  const [topicResult, postsResult] = await Promise.all([
    db.from('topics').select('name').eq('id', topicId).maybeSingle(),
    db.from('posts').select('id, title, nickname, body, user_id').eq('topic_id', topicId).order('id'),
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

// ===== 글 쓰기 =====

function 글쓰기창열기() {
  writeError.hidden = true;
  로그인상태그리기();
  writeDialog.showModal();
  titleInput.focus();
}

document.getElementById('writeButton').addEventListener('click', () => {
  // 로그인하지 않았으면 글쓰기 대신 로그인부터
  if (!나) {
    로그인창열기();
    return;
  }
  글쓰기창열기();
});

document.getElementById('writeCancel').addEventListener('click', () => writeDialog.close());
document.getElementById('readClose').addEventListener('click', () => readDialog.close());

// ===== 글 지우기 =====

deleteStart.addEventListener('click', async () => {
  if (!openPost || !나) return;

  deleteStart.disabled = true;
  deleteStart.textContent = 'Deleting…';
  deleteError.hidden = true;

  // 남의 글을 지우려 해도 서버가 막는다. 비밀번호를 물어볼 필요가 없어졌다.
  const { error } = await db.from('posts').delete().eq('id', openPost.id);

  deleteStart.disabled = false;
  deleteStart.textContent = 'Delete';

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

  // 두 번 눌러서 같은 글이 두 번 올라가는 것을 막는다
  writeSubmit.disabled = true;
  writeSubmit.textContent = 'Posting…';
  writeError.hidden = true;

  // user_id를 같이 넣어야 "내 글"로 인정된다.
  // 남의 id를 적어 보내도 서버가 로그인 증표와 대조해서 거절한다.
  const { error } = await db
    .from('posts')
    .insert({ topic_id: topicId, title, nickname, body, user_id: 나.id });

  writeSubmit.disabled = false;
  writeSubmit.textContent = 'Post';

  if (error) {
    console.error('[topic] 글 올리기 실패:', error);
    writeError.hidden = false;
    writeError.textContent = 'Failed to post';
    return;
  }

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
