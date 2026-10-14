/* 簡易路由：hash 路由，所有頁面由 Pages.* 產生 */
async function route() {
  const app = $('#app');
  const full = location.hash || '#/';
  const path = full.replace(/^#\//, '').split('?')[0];
  const q = parseQuery(full);
  const seg = path.split('/').filter(Boolean);
  const key = seg[0] || 'home';
  $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === (key === 'eval' ? 'u' : key)));
  const isEval = key === 'eval';
  document.querySelector('.top').style.display = isEval ? 'none' : '';
  document.querySelector('.foot').style.display = isEval ? 'none' : '';
  try {
    let page;
    if (key === 'home') page = await Pages.home();
    else if (key === 'u') {
      const id = seg[1] || 'relay';
      if (seg[2] === 'map') page = await Pages.map(id);
      else if (seg[2] === 's' && seg[3]) page = await Pages.session(id, seg[3]);
      else if (seg[2] === 's') page = await Pages.sessions(id);
      else if (seg[2] === 'assess') page = await Pages.assess(id);
      else page = await Pages.unit(id);
    } else if (key === 'eval') page = await Pages.eval(seg[1] || 'relay', seg[2] || '1', q);
    else if (Pages[key]) page = await Pages[key](seg[1], seg[2], q);
    else page = { html: '<h1>找不到頁面</h1><p><a href="#/">回首頁</a></p>' };
    app.innerHTML = page.html;
    document.title = (window.APP_CONFIG && window.APP_CONFIG.SITE_TITLE) || '雙語體育共學站';
    if (page.after) await page.after();
    if (!isEval) window.scrollTo(0, 0);
  } catch (e) {
    app.innerHTML = `<div class="notice warn"><b>讀取失敗</b><br>${esc(e.message)}<br><span class="small">若是在電腦本機直接開啟檔案，請改用 <code>python 工具/build_site.py --serve</code>。</span></div>`;
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('online', () => Eval.flush());
route();

// 有設定教師後台網址時，導覽列多一個連結（另開分頁；登入的是 Google 帳號，不是網站密碼）
(() => { const u = API.consoleUrl(); if (!u) return; const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '教師後台'; $('#nav').appendChild(a); })();
