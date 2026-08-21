// 작가 목록 페이지: 글을 올린 사람들을 '많이 쓴 순'으로 세운다.
// 이름을 누르면 그 사람이 모든 주제에 쓴 글을 모아 보는 작가 페이지로 간다.

const 목록 = document.getElementById('writerList');
const 안내 = document.getElementById('writersMessage');

async function load() {
  // 닉네임만 전부 받아서 이 페이지에서 직접 센다. (글 수가 적어 이게 가장 단순하다)
  const { data, error } = await db
    .from('posts')
    .select('nickname')
    .is('deleted_at', null);

  if (error) {
    console.error('[writers] 불러오기 실패:', error);
    안내.textContent = 'Failed to load';
    return;
  }

  if (data.length === 0) {
    안내.textContent = 'No writers yet';
    return;
  }

  // 닉네임별 글 수를 센다
  const 수 = new Map();
  data.forEach((p) => 수.set(p.nickname, (수.get(p.nickname) || 0) + 1));

  // 많이 쓴 순으로, 같으면 이름순(한글)으로
  const 작가들 = [...수.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')
  );

  const fragment = document.createDocumentFragment();
  작가들.forEach(([nickname, count]) => {
    const li = document.createElement('li');

    const link = document.createElement('a');
    link.className = 'writer-link';
    link.href = 'author.html?nick=' + encodeURIComponent(nickname);

    const name = document.createElement('span');
    name.className = 'writer-link__name';
    // textContent를 쓰면 닉네임에 어떤 글자가 들어와도 안전하다
    name.textContent = nickname;

    const c = document.createElement('span');
    c.className = 'writer-link__count';
    c.textContent = `${count}편`;

    link.append(name, c);
    li.appendChild(link);
    fragment.appendChild(li);
  });

  안내.hidden = true;
  목록.appendChild(fragment);
}

load();
