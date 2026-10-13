/* 各頁面：每個函式回傳 HTML 字串，並可回傳 {html, after()} 綁定事件 */
const Pages = {};

/* ---------- 首頁 ---------- */
Pages.home = async function () {
  const units = await DATA.units();
  let cards = '';
  for (const u of units) {
    const { lesson } = await DATA.unit(u.id);
    const lg = lesson['語言目標'];
    cards += `<a class="card" href="#/u/${esc(u.id)}" style="text-decoration:none;color:inherit;display:block">
      <div class="row"><span class="chip">${esc(lesson['實施年級'])}</span><span class="chip">${lesson['節次'].length} 節 · ${esc(lesson['單元週數'])} 週</span>
      ${lesson['狀態'] ? `<span class="chip new">${esc(lesson['狀態'])}</span>` : ''}</div>
      <h3 style="margin-top:8px">${esc(lesson['單元名稱'])}</h3>
      <div class="small muted">新字詞　${chips(lg['新字詞'], 'new')}</div>
      <div class="small muted" style="margin-top:6px">${esc(lesson['領綱核心素養'].join('、'))}</div></a>`;
  }
  return {
    html: `<section class="hero"><h1>陪我共學、共創、記錄的備課夥伴</h1>
      <p>每份教案都從總綱、領綱、學習表現、學習內容出發；教完的內容會被記下來，下一個單元再螺旋複習。</p></section>
      <div class="grid">${cards}
        <a class="card" href="#/practice" style="text-decoration:none;color:inherit"><h3>備課教練</h3><p class="muted small">在 Claude 專案裡和模擬學生用雙語演練，不熟悉的內容會記下來。</p></a>
        <a class="card" href="#/weak" style="text-decoration:none;color:inherit"><h3>不熟悉清單</h3><p class="muted small">匯入教練整理的清單，追蹤哪些句子還要多練。</p></a>
      </div>
      <div id="progress"></div>`,
    after: async () => {
      if (!API.enabled() || !API.pin()) { $('#progress').innerHTML = `<p class="muted small">連線後端並輸入老師密碼，這裡會顯示已教進度。（<a href="#/settings">設定</a>）</p>`; return; }
      try {
        const rows = await API.teacher('getProgress');
        $('#progress').innerHTML = `<h2>已教進度</h2><div class="card">${rows.length ? rows.slice(-8).reverse().map((r) =>
          `<div>${esc(String(r['日期']).slice(0, 10))}　${esc(r['單元'])} 第 ${esc(r['節'])} 節　<span class="chip">${esc(r['狀態'])}</span></div>`).join('') : '<span class="muted">還沒有紀錄。</span>'}</div>`;
      } catch (e) { $('#progress').innerHTML = `<p class="muted small">進度讀取失敗：${esc(e.message)}</p>`; }
    }
  };
};

/* ---------- 單元共用：分頁列 ---------- */
function unitTabs(id, cur, extra) {
  const t = [['', '概覽'], ['map', '課綱對照'], ['s', '八節進程'], ['assess', '評量']];
  return `<div class="tabs">${t.map(([k, n]) => `<a class="${cur === k ? 'on' : ''}" href="#/u/${id}${k ? '/' + k : ''}">${n}</a>`).join('')}${extra || ''}</div>`;
}
function unitHead(L) {
  return `<h1>${esc(L['單元名稱'])}</h1><div class="row small muted">
    <span>${esc(L['學校'])}</span><span>·</span><span>設計者：${esc(L['教案設計者'])}</span><span>·</span><span>${esc(L['實施年級'])} ${esc(L['班級人數'])} 人</span><span>·</span><span>${esc((L['場地'] || []).join('、'))}</span></div>`;
}

/* ---------- 單元概覽 ---------- */
Pages.unit = async function (id) {
  const { lesson: L } = await DATA.unit(id);
  const cur = await DATA.curriculum();
  const lg = L['語言目標'], tm = L['中英文使用時機'];
  const row = (c, kind) => `<tr><td><span class="chip code">${esc(c)}</span></td><td>${esc(cur[kind][c] || '')}</td></tr>`;
  return {
    html: `${unitHead(L)}${unitTabs(id, '', `<a href="javascript:window.print()" class="noprint" style="margin-left:auto">列印</a>`)}
    <div class="card"><h3>教學設計理念</h3><p>${esc(L['教學設計理念'])}</p></div>
    <div class="card"><h3>核心素養</h3>
      <div><b class="small muted">總綱</b> ${chips(L['總綱核心素養'])}</div>
      <div><b class="small muted">領綱</b> ${chips(L['領綱核心素養'].concat(L['英語領綱核心素養'] || []))}</div></div>
    <div class="card"><h3>學習重點</h3>
      <div class="scroll"><table><thead><tr><th colspan="2">學習表現</th></tr></thead><tbody>${L['學習表現'].map((c) => row(c, '學習表現')).join('')}</tbody>
      <thead><tr><th colspan="2">學習內容</th></tr></thead><tbody>${L['學習內容'].map((c) => row(c, '學習內容')).join('')}</tbody></table></div>
      <p class="small muted">英語對照　表現：${chips(L['英語學習表現'], 'code')}　內容：${chips(L['英語學習內容'], 'code')}</p></div>
    <div class="card"><h3>單元學習目標</h3><ul>${L['內容目標'].map((g) => `<li><b>${esc(g.id)}</b> ${esc(g['文字'])}　<span class="small muted">${esc(g['對應學習表現'].join('、'))}｜${esc(g['對應學習內容'].join('、'))}</span></li>`).join('')}</ul>
      <h3>Language</h3>
      <p><b>of learning</b> ${chips(lg.of, 'say')}</p><p><b>for learning</b> ${chips(lg['for'], 'say')}</p><p><b>through learning</b> ${chips(lg.through, 'say')}</p>
      <p class="small muted">★ 新字詞：${chips(lg['新字詞'], 'new')}　新句型：${chips(lg['新句型'], 'new')}</p></div>
    <div class="card"><h3>中／英文使用時機</h3><div class="scroll"><table><thead><tr><th></th><th>英文</th><th>中文</th></tr></thead>
      <tbody>${['教師', '學生'].map((w) => `<tr><td><b>${w}</b></td><td>${esc(tm[w]['英文'])}</td><td>${esc(tm[w]['中文'])}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>教學資源</h3>${chips(L['教學資源'], 'say')}</div>`
  };
};

/* ---------- 課綱對照矩陣 ---------- */
Pages.map = async function (id) {
  const { lesson: L } = await DATA.unit(id);
  const [cur, rules] = await Promise.all([DATA.curriculum(), DATA.rules()]);
  const n = L['節次'].length;
  const head = `<tr><th>條文</th>${L['節次'].map((s) => `<th>${s['節']}</th>`).join('')}</tr>`;
  const rows = (codes, kind, pk) => codes.map((c) => {
    const cov = coveredBy(L, pk, c);
    return `<tr><td><span class="chip code">${esc(c)}</span> <span class="small">${esc(cur[kind][c] || '')}</span></td>${L['節次'].map((s) => `<td>${cov.includes(s['節']) ? '<span class="dot"></span>' : ''}</td>`).join('')}</tr>`;
  }).join('');
  const support = L['領綱核心素養'].map((c) => {
    const ok = (rules[c] || []).filter((p) => L['學習表現'].includes(p));
    return `<tr><td>${esc(c)}<div class="small muted">${esc(cur['領綱核心素養'][c] || '')}</div></td><td>${chips(ok, 'code')}</td></tr>`;
  }).join('');
  return {
    html: `${unitHead(L)}${unitTabs(id, 'map')}
    <div class="notice">課綱邏輯鏈：<b>總綱</b> → <b>領綱</b> → <b>學習表現</b> → <b>學習內容</b> → 單元目標 → 每節活動 → 評量。下表的圓點表示「該節有活動承接這一條」。</div>
    <div class="card"><h3>領綱素養 ← 由哪些學習表現支持</h3><div class="scroll"><table><thead><tr><th>領綱核心素養</th><th>支持它的學習表現</th></tr></thead><tbody>${support}</tbody></table></div></div>
    <div class="card"><h3>學習表現 × 節次</h3><div class="scroll"><table class="matrix"><thead>${head}</thead><tbody>${rows(L['學習表現'], '學習表現', '對應學習表現')}</tbody></table></div></div>
    <div class="card"><h3>學習內容 × 節次</h3><div class="scroll"><table class="matrix"><thead>${head}</thead><tbody>${rows(L['學習內容'], '學習內容', '對應學習內容')}</tbody></table></div></div>
    <p class="small muted">這份對照由教案資料自動產生；教案存檔前已通過邏輯檢核（每條條文皆有目標、活動、評量承接）。共 ${n} 節。</p>`
  };
};

/* ---------- 節次列表 ---------- */
Pages.sessions = async function (id) {
  const { lesson: L } = await DATA.unit(id);
  let taught = [];
  if (API.enabled() && API.pin()) { try { taught = await API.teacher('getProgress'); } catch (e) { /* 忽略 */ } }
  const done = new Set(taught.filter((r) => r['單元'] === L['課程名稱']).map((r) => Number(r['節'])));
  return {
    html: `${unitHead(L)}${unitTabs(id, 's')}<div class="grid">${L['節次'].map((s) => `
      <a class="card sess ${done.has(s['節']) ? 'done' : ''}" href="#/u/${id}/s/${s['節']}"><div class="no">${s['節']}</div>
        <div><b>${esc(s['主題'])}</b><div class="small muted">${esc(s['場地'] || '')}</div>
        <div class="small" style="margin-top:6px">${esc((s['複習'] || [])[0] || '')}</div></div></a>`).join('')}</div>`
  };
};

/* ---------- 單節 ---------- */
const spk = (w) => `<span class="who w-${esc(w)}">${esc({ T: '老師', Ss: '全班' }[w] || w)}</span>`;
Pages.session = async function (id, no) {
  const { lesson: L, dialogue: D } = await DATA.unit(id);
  const s = L['節次'].find((x) => x['節'] === Number(no));
  if (!s) throw new Error('沒有第 ' + no + ' 節');
  const d = D && D['節次'].find((x) => x['節'] === s['節']);
  const prev = L['節次'].find((x) => x['節'] === s['節'] - 1), next = L['節次'].find((x) => x['節'] === s['節'] + 1);
  const part = (p) => `<div class="part"><h4>${esc(p['名稱'])}<span class="min">${esc(p['分鐘'] || '')}${p['分鐘'] ? ' 分' : ''}</span></h4>
    <p>${esc(p['流程'] || p['說明'] || '')}</p>
    <div><b class="small muted">教師語句</b> ${chips(p['教師語句'], 'say')}</div>
    ${p['學生回應'] ? `<div><b class="small muted">學生回應</b> ${chips(p['學生回應'], 'say')}</div>` : ''}
    ${p['TPR流程'] ? `<div class="steps"><div><b>聽 LISTEN</b>${esc(p['TPR流程']['聽'])}</div><div><b>做 DO</b>${esc(p['TPR流程']['做'])}</div><div><b>說 SAY</b>${esc(p['TPR流程']['說'])}</div></div>` : ''}
    ${p['CLIL4C'] ? `<div class="small muted">4C｜內容：${esc(p['CLIL4C']['內容'])}；溝通：${esc(p['CLIL4C']['溝通'])}；認知：${esc(p['CLIL4C']['認知'])}；文化：${esc(p['CLIL4C']['文化'])}</div>` : ''}
    ${p['提醒'] ? `<div class="tip">${esc(p['提醒'])}</div>` : ''}
    <div class="small" style="margin-top:6px">${chips(p['對應學習表現'], 'code')}${chips(p['對應學習內容'], 'code')}${chips(p['對應目標'])}</div></div>`;
  const w = Object.assign({ '名稱': `暖身（${s['暖身分鐘']} 分）` }, s['暖身']); w['分鐘'] = '';
  const t = s['總結'];
  const ev = s['學生評量'] || { '自評': [], '同儕': [] };
  const dlg = d ? d['場景'].map((sc) => `<details><summary>${esc(sc['名稱'])}</summary><p class="small muted">${esc(sc['說明'])}</p>${sc['對話'].map((l) =>
    `<div class="dlg">${spk(l['說話者'])}<div>${esc(l['英文'])}${l['中文'] ? `<div class="zh">${esc(l['中文'])}</div>` : ''}${l['提示'] ? `<div class="hint">${esc(l['提示'])}</div>` : ''}</div></div>`).join('')}</details>`).join('') : '';
  return {
    html: `<div class="small"><a href="#/u/${id}/s">← 八節進程</a></div><h1>第 ${s['節']} 節　${esc(s['主題'])}</h1>
    <div class="row small muted"><span>${esc(s['場地'] || '')}</span><span>·</span><span>器材：${esc((s['器材'] || []).join('、'))}</span></div>
    <div class="card"><b>複習（螺旋）</b><ul style="margin:6px 0 0">${(s['複習'] || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>準備 · 發展 · 總結</h3>${part(w)}${s['活動'].map(part).join('')}
      <div class="part"><h4>總結<span class="min">${s['總結分鐘']} 分</span></h4><p>${esc(t['提問'].join('；'))}</p><p class="small muted">預告：${esc(t['預告'])}　Exit：${esc(t['Exit'])}</p></div></div>
    ${d ? `<div class="card"><h3>生活情境對話腳本</h3><p class="muted small">情境：${esc(d['生活情境'])}</p>${dlg}
      <h4>突發狀況</h4><ul>${d['突發狀況'].map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h4>預期較不熟悉</h4><ul>${d['預期不熟悉'].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    <div class="card"><h3>學生評量（iPad）</h3><p>自評：${esc(ev['自評'].join('、') || '—')}　同儕觀察：${esc(ev['同儕'].join('、') || '—')}</p>
      <div class="row"><input id="code" placeholder="班級代碼（選填，加進連結）" size="16" value="${esc(API.code())}"><button class="btn sm" id="copylink">複製學生評量連結</button>
      <a class="btn sm ghost" href="#/eval/${id}/${s['節']}">預覽學生頁</a></div></div>
    <div class="card"><h3>備課練習</h3><p class="muted small">到 Claude「雙語備課教練」專案貼上這句話就能開始：</p>
      <div class="row"><code class="chip say code">開始第 ${s['節']} 節</code><button class="btn sm ghost" id="copycmd">複製</button><a class="btn sm ghost" href="#/practice">怎麼用</a></div></div>
    <div class="row noprint" style="justify-content:space-between">${prev ? `<a class="btn ghost" href="#/u/${id}/s/${prev['節']}">← 第 ${prev['節']} 節</a>` : '<span></span>'}
      <button class="btn ghost" id="taught">標記「已教」</button>${next ? `<a class="btn ghost" href="#/u/${id}/s/${next['節']}">第 ${next['節']} 節 →</a>` : '<span></span>'}</div>`,
    after: () => {
      $('#copylink').onclick = () => {
        const code = $('#code').value.trim(); if (code) store.set('class_code', code);
        const base = location.href.split('#')[0];
        copyText(`${base}#/eval/${id}/${s['節']}${code ? '?code=' + encodeURIComponent(code) : ''}`, '已複製連結，貼到 iPad 或做成 QR code');
      };
      $('#copycmd').onclick = () => copyText(`開始第 ${s['節']} 節`);
      $('#taught').onclick = async () => {
        if (!API.enabled() || !API.pin()) { toast('請先在「設定」連線並輸入老師密碼'); return; }
        try { await API.teacher('markTaught', { '單元': L['課程名稱'], '節': s['節'] }); toast('已記錄'); } catch (e) { toast(e.message); }
      };
    }
  };
};

/* ---------- 評量說明 ---------- */
Pages.assess = async function (id) {
  const { lesson: L } = await DATA.unit(id);
  const d = L['學生評量設計'] || {};
  return {
    html: `${unitHead(L)}${unitTabs(id, 'assess')}
    <div class="card"><h3>評量規準（三等第）</h3><div class="scroll"><table><thead><tr><th>項目</th><th>優異</th><th>達成</th><th>努力中</th></tr></thead><tbody>
      ${L['評量規準'].map((r) => `<tr><td><b>${esc(r['項目'])}</b><div>${chips(r['對應學習表現'], 'code')}</div></td><td>${esc(r['等第']['優異'])}</td><td>${esc(r['等第']['達成'])}</td><td>${esc(r['等第']['努力中'])}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>學生版（iPad）</h3><div class="scroll"><table><thead><tr><th>項目</th><th>自評題</th><th>同儕觀察</th></tr></thead><tbody>
      ${L['評量規準'].map((r) => `<tr><td>${esc(r['項目'])}</td><td>${esc(r['學生自評']['中文'])}<div class="muted small">${esc(r['學生自評']['英文'])}</div></td><td>${esc(r['同儕觀察']['中文'])}<div class="muted small">${esc(r['同儕觀察']['英文'])}</div></td></tr>`).join('')}</tbody></table></div>
      ${Object.entries(d).map(([k, v]) => `<p class="small"><b>${esc(k)}</b>：${esc(v)}</p>`).join('')}</div>
    <div class="card"><h3>評量方式</h3><ul>${L['評量方式'].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
  };
};

/* ---------- 備課教練 ---------- */
Pages.practice = async function () {
  const units = await DATA.units();
  const url = store.get('claude_url', '') || (window.APP_CONFIG && window.APP_CONFIG.CLAUDE_PROJECT_URL) || '';
  const rows = [];
  for (const u of units) { const { lesson: L } = await DATA.unit(u.id); rows.push(`<div class="card"><b>${esc(L['單元名稱'])}</b><div class="row" style="margin-top:8px">${L['節次'].map((s) => `<button class="btn sm ghost cmd" data-c="開始第 ${s['節']} 節">第 ${s['節']} 節</button>`).join('')}</div></div>`); }
  return {
    html: `<h1>備課教練</h1><p class="muted">在 Claude 專案裡，和模擬學生（Amy、Ben、Chris、Dora）用雙語演練上課。你會說老師的話，教練扮演學生，並記下你不熟悉的內容。</p>
    <div class="row">${url ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">開啟備課教練專案</a>` : `<span class="notice warn">尚未設定專案網址，請到<a href="#/settings">設定</a>貼上。</span>`}</div>
    <h2>一次練習怎麼進行</h2>
    <div class="card"><ol><li>開新對話，貼上下面的開始指令（例如「開始第 3 節」）。</li>
      <li>依序進行 6 個回合：熱身 → 跟讀 → 情境對話 → 課堂模擬 → 突發狀況 → 回報。</li>
      <li>回報時教練會輸出一段 JSON，複製後到<a href="#/weak">不熟悉清單</a>按「匯入」。</li>
      <li>下次練習前，到不熟悉清單按「複製給教練」，貼在對話開頭，教練會先帶複習。</li></ol></div>
    <h2>開始指令</h2>${rows.join('')}
    <h2>專案設定檔</h2><div class="card"><p class="small muted">第一次使用：新增 Claude 專案，把「專案指示」貼進指示欄，並上傳單元知識檔。</p>
      <div class="row"><a class="btn sm ghost" href="data/coach/專案指示.md" target="_blank">專案指示</a>${units.map((u) => `<a class="btn sm ghost" href="data/coach/知識_${esc(u.title)}.md" download>知識檔：${esc(u.title)}</a>`).join('')}</div></div>`,
    after: () => $$('.cmd').forEach((b) => (b.onclick = () => copyText(b.dataset.c, '已複製：' + b.dataset.c)))
  };
};

/* ---------- 不熟悉清單 ---------- */
const WEAK_TYPES = ['發音', '語調', '句型', '口令', '中英切換', 'TPR動作搭配', '應對突發'];
function extractJsonArray(text) {
  const m = text.match(/\[[\s\S]*\]/); if (!m) throw new Error('找不到 JSON 陣列（應以 [ 開頭、] 結尾）');
  const arr = JSON.parse(m[0]); if (!Array.isArray(arr)) throw new Error('格式不是陣列');
  return arr.filter((x) => x && x['內容']);
}
Pages.weak = async function () {
  const online = API.enabled() && !!API.pin();
  let items;
  try { items = online ? await API.teacher('getWeak') : store.get('weak_local', []); } catch (e) { items = store.get('weak_local', []); }
  const body = (list) => list.length ? `<div class="scroll"><table><thead><tr><th>類型</th><th>內容</th><th>來源</th><th>次數</th><th>狀態</th><th>最近練習</th><th>備註</th></tr></thead><tbody>${list.map((w, i) => `
    <tr><td><span class="chip">${esc(w['類型'])}</span></td><td>${esc(w['內容'])}</td><td class="small">${esc(w['來源'])}</td><td>${esc(w['次數'])}</td>
    <td><select data-i="${i}" class="st">${['新', '練習中', '已熟'].map((s) => `<option ${w['狀態'] === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td class="small">${esc(String(w['最近練習'] || '').slice(0, 10))}</td><td class="small">${esc(w['備註'])}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">還沒有項目。練習完把教練的 JSON 貼到下方匯入。</p>';
  return {
    html: `<h1>不熟悉清單</h1>
    ${online ? '' : `<div class="notice warn">目前是<b>本機模式</b>（只存在這台裝置）。連線後端並輸入老師密碼後會同步到試算表。<a href="#/settings">前往設定</a></div>`}
    <div class="card" id="list">${body(items)}</div>
    <div class="row noprint"><button class="btn ghost" id="copy">複製給教練（未熟項目）</button></div>
    <h2>匯入教練的 JSON</h2><div class="card"><textarea id="imp" placeholder='把教練輸出的 [ { "類型":"口令", "內容":"…", "來源":"接力賽-第1節", "備註":"…" } ] 貼在這裡'></textarea>
      <div class="row" style="margin-top:8px"><button class="btn" id="go">匯入</button><span id="msg" class="small muted"></span></div></div>
    <h2>手動新增</h2><div class="card"><div class="row"><select id="t">${WEAK_TYPES.map((t) => `<option>${t}</option>`).join('')}</select>
      <input id="c" placeholder="內容，例如：baton 的重音" size="30"><input id="s" placeholder="來源，例如：接力賽-第2節" size="22"><button class="btn" id="add">新增</button></div></div>`,
    after: () => {
      const save = async (arr) => {
        if (online) { items = await API.teacher('saveWeak', { items: arr }); }
        else {
          arr.forEach((it) => { const f = items.find((x) => x['內容'] === it['內容'] && x['來源'] === it['來源']);
            if (f) { if (!it['只更新狀態']) { f['次數'] = Number(f['次數'] || 0) + 1; f['最近練習'] = new Date().toISOString().slice(0, 10); } f['狀態'] = it['狀態'] || f['狀態']; if (it['備註']) f['備註'] = it['備註']; }
            else items.push({ id: 'L' + (items.length + 1), '類型': it['類型'] || '', '內容': it['內容'], '來源': it['來源'] || '', '次數': 1, '狀態': it['狀態'] || '新', '最近練習': new Date().toISOString().slice(0, 10), '備註': it['備註'] || '' }); });
          store.set('weak_local', items);
        }
        $('#list').innerHTML = body(items); bindSt();
      };
      const bindSt = () => $$('.st').forEach((sel) => (sel.onchange = async () => { const w = items[+sel.dataset.i]; try { await save([{ '內容': w['內容'], '來源': w['來源'], '狀態': sel.value, '只更新狀態': true }]); toast('已更新'); } catch (e) { toast(e.message); } }));
      bindSt();
      $('#go').onclick = async () => { try { const arr = extractJsonArray($('#imp').value); await save(arr); $('#imp').value = ''; $('#msg').textContent = `已匯入 ${arr.length} 項`; } catch (e) { $('#msg').textContent = '匯入失敗：' + e.message; } };
      $('#add').onclick = async () => { const c = $('#c').value.trim(); if (!c) return; try { await save([{ '類型': $('#t').value, '內容': c, '來源': $('#s').value.trim() }]); $('#c').value = ''; toast('已新增'); } catch (e) { toast(e.message); } };
      $('#copy').onclick = () => { const l = items.filter((w) => w['狀態'] !== '已熟'); copyText(l.length ? '【先前不熟悉清單，請在回合 0 先帶 1–2 項複習】\n' + l.map((w) => `- ${w['內容']}（${w['類型']}，${w['來源']}，已練 ${w['次數']} 次）`).join('\n') : '（目前沒有未熟項目）', '已複製，貼到教練對話開頭'); };
    }
  };
};

/* ---------- 學習紀錄（老師） ---------- */
Pages.records = async function (_, __, q) {
  if (!API.enabled() || !API.pin()) return { html: `<h1>學習紀錄</h1><div class="notice warn">需要先連線後端並輸入老師密碼。<a href="#/settings">前往設定</a></div>` };
  const units = await DATA.units(); const first = await DATA.unit(units[0].id); const L = first.lesson;
  return {
    html: `<h1>學習紀錄</h1>
    <div class="row"><label style="margin:0">節次</label><select id="sn"><option value="">全部</option>${L['節次'].map((s) => `<option value="${s['節']}">第 ${s['節']} 節</option>`).join('')}</select><button class="btn sm" id="load">載入評量</button></div>
    <div id="sum" class="card muted">按「載入評量」查看 iPad 自評與同儕觀察。</div>
    <h2>課後省思</h2><div class="card">
      <div class="row"><select id="rn">${L['節次'].map((s) => `<option value="${s['節']}">第 ${s['節']} 節</option>`).join('')}</select></div>
      <label>做得好的</label><input id="r1" style="width:100%"><label>要調整的</label><input id="r2" style="width:100%"><label>下次要複習</label><input id="r3" style="width:100%">
      <div style="margin-top:10px"><button class="btn" id="rs">儲存省思</button></div></div>
    <div id="refl"></div>`,
    after: async () => {
      const unit = L['課程名稱'];
      const showRefl = (rows) => { $('#refl').innerHTML = rows.length ? `<div class="card">${rows.slice().reverse().map((r) => `<div style="margin-bottom:10px"><b>第 ${esc(r['節'])} 節</b> <span class="small muted">${esc(String(r['日期']).slice(0, 10))}</span><div class="small">👍 ${esc(r['做得好'])}</div><div class="small">🔧 ${esc(r['要調整'])}</div><div class="small">🔁 ${esc(r['下次複習'])}</div></div>`).join('')}</div>` : ''; };
      try { showRefl(await API.teacher('getReflections', { '單元': unit })); } catch (e) { /* 忽略 */ }
      $('#load').onclick = async () => {
        $('#sum').textContent = '載入中…';
        try {
          const r = await API.teacher('assessSummary', { '單元': unit, '節': $('#sn').value || undefined });
          const items = Object.entries(r.byItem);
          $('#sum').innerHTML = items.length ? `<div class="small muted">共 ${r.total} 筆</div>` + items.map(([k, g]) => { const t = (g[1] || 0) + (g[2] || 0) + (g[3] || 0) || 1;
            return `<div style="margin:10px 0"><b>${esc(k.replace('｜', ' · '))}</b><div class="bar"><i class="g3" style="width:${g[3] / t * 100}%"></i><i class="g2" style="width:${g[2] / t * 100}%"></i><i class="g1" style="width:${g[1] / t * 100}%"></i></div>
            <div class="small muted">優異 ${g[3] || 0}　達成 ${g[2] || 0}　努力中 ${g[1] || 0}</div></div>`; }).join('') : '還沒有評量資料。';
        } catch (e) { $('#sum').textContent = '讀取失敗：' + e.message; }
      };
      $('#rs').onclick = async () => { try { showRefl(await API.teacher('saveReflection', { '單元': unit, '節': $('#rn').value, '做得好': $('#r1').value, '要調整': $('#r2').value, '下次複習': $('#r3').value })); ['#r1', '#r2', '#r3'].forEach((s) => ($(s).value = '')); toast('已儲存'); } catch (e) { toast(e.message); } };
    }
  };
};

/* ---------- 設定 ---------- */
Pages.settings = async function () {
  return {
    html: `<h1>設定</h1><p class="muted">這些設定只存在這台裝置的瀏覽器。</p>
    <div class="card"><label>Apps Script 網頁應用程式網址</label><input id="u" style="width:100%" value="${esc(store.get('api_url', ''))}" placeholder="${esc((window.APP_CONFIG && window.APP_CONFIG.APPS_SCRIPT_URL) || 'https://script.google.com/macros/s/…/exec')}">
      <label>老師密碼（只在本次瀏覽暫存）</label><input id="p" type="password" value="${esc(API.pin())}">
      <label>班級代碼（學生評量連結用）</label><input id="cc" value="${esc(API.code())}">
      <label>Claude 備課教練專案網址</label><input id="cl" style="width:100%" value="${esc(store.get('claude_url', ''))}" placeholder="https://claude.ai/project/…">
      <div class="row" style="margin-top:12px"><button class="btn" id="save">儲存</button><button class="btn ghost" id="test">測試連線</button><span id="r" class="small muted"></span></div></div>
    <p class="small muted">後端建置步驟見專案內 <code>網站/appscript/README.md</code>。</p>`,
    after: () => {
      const save = () => { store.set('api_url', $('#u').value.trim()); store.sset('pin', $('#p').value); store.set('class_code', $('#cc').value.trim()); store.set('claude_url', $('#cl').value.trim()); };
      $('#save').onclick = () => { save(); toast('已儲存'); };
      $('#test').onclick = async () => { save(); $('#r').textContent = '測試中…';
        try { const d = await API.call('ping', {}, API.pin() ? 'teacher' : 'student'); $('#r').textContent = '連線成功，身分：' + ({ teacher: '老師', student: '學生', none: '未通過驗證（密碼或代碼不對）' }[d.role] || d.role); }
        catch (e) { $('#r').textContent = '失敗：' + e.message; } };
    }
  };
};
