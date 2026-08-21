// 작가 페이지: 한 사람이 모든 주제에 걸쳐 쓴 글을 한데 모아 보여준다.
// 닉네임은 주소 끝의 ?nick=... 에서 받는다. 글을 누르면 그 글이 있는
// 주제 페이지로 가서 전문(과 댓글)이 열린다.

const 목록 = document.getElementById('authorPosts');
const 이름칸 = document.getElementById('authorName');
const 부제칸 = document.getElementById('authorSub');
const 안내 = document.getElementById('authorMessage');

const nickname = new URLSearchParams(location.search).get('nick');

// 본문에서 서식 태그를 걷어낸 순수 글자. 미리보기 문장에 쓴다.
function 글자만(html) {
  const 그릇 = document.createElement('div');
  그릇.innerHTML = html;
  return 그릇.textContent || '';
}

function render(posts, 주제이름) {
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    const link = document.createElement('a');
    link.className = 'author-post';
    link.href = `topic.html?id=${post.topic_id}&post=${post.id}`;

    const 주제 = document.createElement('span');
    주제.className = 'author-post__topic';
    // textContent를 쓰면 주제 이름에 어떤 글자가 들어와도 안전하다
    주제.textContent = 주제이름.get(post.topic_id) || '';

    const 제목 = document.createElement('span');
    제목.className = 'author-post__title';
    제목.textContent = post.title;

    const 미리 = document.createElement('span');
    미리.className = 'author-post__preview';
    // 본문 앞부분을 잘라 미리보기로. 서식을 빼고 공백을 한 칸으로 정리한다.
    미리.textContent = 글자만(post.body).replace(/\s+/g, ' ').trim().slice(0, 90);

    link.append(주제, 제목, 미리);
    fragment.appendChild(link);
  });

  목록.appendChild(fragment);
}

async function load() {
  if (!nickname) {
    안내.textContent = 'No author';
    return;
  }

  이름칸.textContent = nickname;
  document.title = `${nickname} — Writing Club`;

  // 그 사람 글 전부(주제 상관없이) + 주제 이름표를 함께 받는다
  const [postsResult, topicsResult] = await Promise.all([
    db.from('posts')
      .select('id, title, body, topic_id')
      .eq('nickname', nickname)
      .is('deleted_at', null)
      .order('id', { ascending: false }),   // 최신 글이 맨 위로
    db.from('topics').select('id, name'),
  ]);

  if (postsResult.error || topicsResult.error) {
    console.error('[author] 불러오기 실패:', postsResult.error ?? topicsResult.error);
    안내.textContent = 'Failed to load';
    return;
  }

  const posts = postsResult.data;
  if (posts.length === 0) {
    안내.textContent = 'No posts yet';
    return;
  }

  const 주제이름 = new Map(topicsResult.data.map((t) => [t.id, t.name]));
  부제칸.textContent = `${posts.length}편`;
  안내.hidden = true;
  render(posts, 주제이름);
}

load();
