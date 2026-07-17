// 주제 목록 페이지: 단어들을 세로로 늘어놓는다.
// 목록은 Supabase에서 받아오므로, 주제를 추가하면 이 파일을 고치지 않아도 바로 나타난다.

const list = document.getElementById('topicList');

// ===== 흐트러뜨리기 =====
// 단어마다 좌우 위치와 아래 여백을 조금씩 다르게 준다.
// 값은 단어의 id에서 계산하므로, 같은 단어는 몇 번을 새로고침해도 늘 같은 자리에 놓인다.
// 나중에 주제를 추가하면 그 단어도 자동으로 제 자리를 받는다.

// id와 salt를 넣으면 0~1 사이 값이 나온다. 같은 입력이면 언제나 같은 값이 나온다.
// 1~7처럼 작고 연속된 숫자를 넣어도 값이 골고루 흩어지는 방식이어야 한다.
// (sin으로 만드는 흔한 방법은 이런 작은 숫자에서 결과가 한쪽으로 뭉친다)
function noise(seed, salt) {
  let h = Math.imul(seed, 374761393) + Math.imul(salt, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

// 0~1 값을 원하는 범위로 늘린다
function between(seed, salt, min, max) {
  return min + noise(seed, salt) * (max - min);
}

function scatter(element, topic, index) {
  const seed = topic.id;

  // 좌우로 밀어내되, 홀짝을 번갈아 반대편으로 보내 어긋나게 한다
  const side = index % 2 === 0 ? -1 : 1;
  const shift = side * between(seed, 2, 0.5, 6);

  element.style.setProperty('--shift', shift.toFixed(2));
  // 단어 아래 여백
  element.style.setProperty('--gap', between(seed, 5, 11.7, 25.2).toFixed(2));
}

function render(topics) {
  list.innerHTML = '';
  const fragment = document.createDocumentFragment();

  topics.forEach((topic, index) => {
    const item = document.createElement('li');
    item.className = 'topics__item';
    // 아래에서 위로 하나씩 순서대로 떠오르게 하려고 순번을 넘긴다
    item.style.setProperty('--i', index);
    scatter(item, topic, index);

    const link = document.createElement('a');
    link.className = 'topic-link';
    link.href = `topic.html?id=${topic.id}`;
    // textContent를 쓰면 주제 이름에 어떤 글자가 들어와도 안전하다
    link.textContent = topic.name;

    item.appendChild(link);
    fragment.appendChild(item);
  });

  list.appendChild(fragment);
}

function showMessage(text) {
  list.innerHTML = '';
  const item = document.createElement('li');
  item.className = 'topics__loading';
  item.textContent = text;
  list.appendChild(item);
}

async function load() {
  // id 순서대로 받아온다. 나중에 추가한 주제일수록 아래에 붙는다.
  const { data, error } = await db
    .from('topics')
    .select('id, name')
    .order('id');

  if (error) {
    console.error('[topics] 주제를 불러오지 못했습니다:', error);
    showMessage('Failed to load');
    return;
  }

  if (data.length === 0) {
    showMessage('No topics yet');
    return;
  }

  render(data);
}

// ===== 로그인 상태 =====
// 이 페이지에서는 로그인을 하지는 않고, 지금 누구인지 보여주고 나갈 수만 있게 한다.

const meBox = document.getElementById('me');
const meName = document.getElementById('meName');

document.getElementById('logoutButton').addEventListener('click', async () => {
  await 로그아웃();
  meBox.hidden = true;
});

(async () => {
  const 나 = await 지금로그인한사람();
  meBox.hidden = !나;
  meName.textContent = 사람의닉네임(나);
})();

load();
