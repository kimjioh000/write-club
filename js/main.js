// 메인 페이지: 봉투를 누르면 초대장이 커지는 동안 주제 목록으로 넘어간다.

const envelope = document.querySelector('.envelope');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 초대장 화면으로 넘어간다. 로그인한 사람은 그대로 통과하고,
// 아직인 사람은 초대장 위에서 로그인할 때까지 여기 머문다.
// 폰에는 마우스를 올리는 과정이 없다. 데스크탑에서는 봉투가 이미 열린 채로 누르지만,
// 폰에서는 누르는 순간 열리기 시작한다. 그래서 같은 속도로 넘기면
// 봉투가 열리는 걸 볼 새도 없이 초대장이 덮쳐 급해 보인다.
// 폰에서만 봉투가 다 열릴 때까지 기다렸다가 넘어간다.
const 터치기기 = window.matchMedia('(hover: none)').matches || window.matchMedia('(max-width: 700px)').matches;
const 초대장까지 = 터치기기 ? 1000 : 260;

function 초대장열기() {
  // 터치 기기에는 마우스 오버가 없으니, 누른 순간 봉투를 열어서 보여준다
  envelope.classList.add('is-open');
  setTimeout(() => document.body.classList.add('is-leaving'), 초대장까지);
  if (나) setTimeout(들어가기, 초대장까지 + 840);
}

function 들어가기() {
  window.location.href = envelope.href;
}

envelope.addEventListener('click', (event) => {
  // 새 탭으로 열려는 클릭(⌘/Ctrl+클릭)은 건드리지 않는다
  if (event.metaKey || event.ctrlKey || event.shiftKey) return;

  event.preventDefault();

  // 애니메이션을 끄고 쓰는 사람에게도 로그인은 거쳐야 하므로,
  // 움직임 없이 초대장 화면만 띄운다.
  if (reduceMotion) {
    document.body.classList.add('is-leaving');
    if (나) 들어가기();
    return;
  }

  초대장열기();
});

// ===== 초대장 위에서 로그인 =====

const authForm = document.getElementById('authForm');
const mainMe = document.getElementById('mainMe');
const mainMeName = document.getElementById('mainMeName');
const authName = document.getElementById('authName');
const authPassword = document.getElementById('authPassword');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');

let 나 = null;
let 가입모드 = false;

function 로그인상태그리기() {
  // 이미 로그인한 사람에게는 이름만 보여준다
  authForm.hidden = !!나;
  mainMe.hidden = !나;
  mainMeName.textContent = 사람의닉네임(나);
}

authToggle.addEventListener('click', () => {
  가입모드 = !가입모드;
  authError.hidden = true;
  authSubmit.textContent = 가입모드 ? 'sign up' : 'sign in';
  authToggle.textContent = 가입모드 ? 'sign in' : 'sign up';
  authName.focus();
});

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
  // 이름을 적었으니 들여보낸다
  setTimeout(들어가기, 700);
});

document.getElementById('mainSignOut').addEventListener('click', async () => {
  await 로그아웃();
  나 = null;
  로그인상태그리기();
});

(async () => {
  나 = await 지금로그인한사람();
  로그인상태그리기();
})();
