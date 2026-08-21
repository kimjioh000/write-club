// 다크모드 토글. 달(어둡게)·해(밝게) 버튼을 누르면 전환되고,
// 선택은 이 기기에 기억된다(localStorage). 첫 화면 깜빡임을 막으려고
// 실제 적용은 각 페이지 <head>의 인라인 스크립트가 먼저 해둔다.
(function () {
  const KEY = 'writeclub:theme';
  const root = document.documentElement;

  const 다크 = () => root.dataset.theme === 'dark';

  function 아이콘갱신() {
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.textContent = 다크() ? '☀' : '☾';
      btn.setAttribute('aria-label', 다크() ? '밝게' : '어둡게');
    });
  }

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const 켜기 = !다크();
      if (켜기) root.dataset.theme = 'dark';
      else delete root.dataset.theme;
      try { localStorage.setItem(KEY, 켜기 ? 'dark' : 'light'); } catch (e) {}
      아이콘갱신();
    });
  });

  아이콘갱신();
})();
