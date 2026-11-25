/* 學生 iPad 評量頁：#/eval/{單元}/{節}?code=班級代碼
   流程：選組（單元有分組時用 A/B/C 組，否則用名單的隊）→ 選座號 → 自評（表情）／觀察夥伴（星星＋英文鼓勵）。資料送到 Apps Script；斷線時先存在裝置，連線後補送。 */
const Eval = {
  queueKey: 'eval_queue',
  async flush() {
    const q = store.get(this.queueKey, []); if (!q.length || !API.enabled()) return;
    const rest = [];
    for (const it of q) { try { await API.student('submitAssessment', it); } catch (e) { rest.push(it); } }
    store.set(this.queueKey, rest);
  },
  async send(rec) {
    try { if (!API.enabled()) throw new Error('demo'); await API.student('submitAssessment', rec); return true; }
    catch (e) {
      if (API.enabled()) { const q = store.get(this.queueKey, []); q.push(rec); store.set(this.queueKey, q); }
      return false;
    }
  }
};
const FACES = [[3, '😀', '我很棒', 'Great!'], [2, '🙂', '還不錯', 'OK'], [1, '💪', '我還要練習', 'Try again']];
const STARS = [[3, '⭐⭐⭐'], [2, '⭐⭐'], [1, '⭐']];

Pages.eval = async function (id, no, q) {
  const { lesson: L } = await DATA.unit(id);
  const s = L['節次'].find((x) => x['節'] === Number(no));
  if (!s) throw new Error('沒有第 ' + no + ' 節');
  if (q.code) store.set('class_code', q.code);
  const ev = s['學生評量'] || { '自評': [], '同儕': [] };
  const rub = Object.fromEntries(L['評量規準'].map((r) => [r['項目'], r]));
  let roster, demo = false;
  try { roster = await API.student('roster'); } catch (e) { demo = true; roster = Array.from({ length: 18 }, (_, i) => ({ '班級': '甲班', '座號': i + 1, '隊': Math.floor(i / 3) + 1, '暱稱': '' })); }
  // 這個單元在教師後台設好的分組（例如樂樂棒球 A/B/C 組）；沒設定或舊版後端時用名單的「隊」
  let groups = [];
  if (!demo) { try { groups = (await API.student('unitGroups', { '單元': L['課程名稱'] })) || []; } catch (e) { groups = []; } }
  Eval.flush();
  const classes = [...new Set(roster.map((r) => r['班級'] || '甲班'))].sort();
  const st = { step: classes.length > 1 ? 'cls' : 'team', cls: classes[0], team: null, me: null, mode: null, idx: 0, target: null, tteam: null, grades: [], count: 0 };
  const mine = () => roster.filter((r) => (r['班級'] || '甲班') === st.cls);
  const grpOf = () => groups.filter((g) => (g['班級'] || '甲班') === st.cls);
  const byGroup = () => grpOf().length > 0;
  const OTHER = '?';                                     // 分組裡找不到自己的同學
  const unassigned = () => mine().filter((r) => !grpOf().some((g) => Number(g['座號']) === Number(r['座號'])));
  const teamsOf = () => {
    if (!byGroup()) return [...new Set(mine().map((r) => String(r['隊'])))].sort((a, b) => Number(a) - Number(b));
    const t = [...new Set(grpOf().map((g) => String(g['組別'])))].sort();
    return unassigned().length ? t.concat(OTHER) : t;
  };
  const person = (no) => mine().find((r) => Number(r['座號']) === Number(no)) || { '座號': no, '暱稱': '' };
  const membersOf = (t) => {
    if (!byGroup()) return mine().filter((r) => String(r['隊']) === t);
    if (t === OTHER) return unassigned();
    return grpOf().filter((g) => String(g['組別']) === t).sort((a, b) => a['組內編號'] - b['組內編號'])
      .map((g) => Object.assign({}, person(g['座號']), { '組內編號': g['組內編號'] }));
  };
  const tcls = (t) => 'team-' + (/^\d+$/.test(t) ? t : (teamsOf().indexOf(t) % 6) + 1);
  const tname = (t) => (t === OTHER ? '其他<br><small>Others</small>' : byGroup() ? esc(t) + ' 組' : esc(t));
  const askTeam = () => (byGroup() ? '你是哪一組？ Which group?' : '你是第幾隊？ Which team?');
  const label = (r) => `${r['座號']}${r['暱稱'] ? ' ' + r['暱稱'] : ''}`;
  const mbtn = (r, t, attr) => `<button class="${tcls(t)}" ${attr}="${r['座號']}">${esc(label(r))}${r['組內編號'] ? `<br><small>組內 ${r['組內編號']} 號</small>` : ''}</button>`;
  const back = (to) => `<p style="text-align:center"><button class="btn ghost" data-go="${to}">← 回上一步</button></p>`;

  function view() {
    const head = `<div class="eval"><h1>第 ${s['節']} 節　${esc(s['主題'])}</h1>
      ${demo ? '<p class="notice warn" style="text-align:center">示範模式：尚未連線，送出的資料不會儲存。</p>' : ''}`;
    if (st.step === 'cls') return head + `<p class="lead">你是哪一班？ Which class?</p><div class="big">${classes.map((c) => `<button data-cls="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
    if (st.step === 'team') return head + `<p class="lead">${esc(st.cls)}：${askTeam()}</p><div class="big">${teamsOf().map((t) => `<button class="${tcls(t)}" data-team="${esc(t)}">${tname(t)}</button>`).join('')}</div>${classes.length > 1 ? back('cls') : ''}</div>`;
    if (st.step === 'me') return head + `<p class="lead">你是幾號？ Who are you?</p><div class="big">${membersOf(st.team).map((r) => mbtn(r, st.team, 'data-me')).join('')}</div>${back('team')}</div>`;
    if (st.step === 'menu') return head + `<p class="lead">${esc(label(person(st.me)))} 號，你好！ Hello!</p>
      <div class="big">${ev['自評'].length ? '<button data-mode="self">😀 我的自評<br><small>My Self-Check</small></button>' : ''}
      ${ev['同儕'].length ? '<button data-mode="peer">⭐ 觀察夥伴<br><small>Watch a Teammate</small></button>' : ''}</div>
      ${st.count ? `<p class="lead">已送出 ${st.count} 筆，謝謝你！</p>` : ''}${back('me')}</div>`;
    if (st.step === 'self') {
      const r = rub[ev['自評'][st.idx]];
      return head + `<p class="q">${esc(r['學生自評']['中文'])}</p><p class="q-en">${esc(r['學生自評']['英文'])}</p>
        <div class="big faces">${FACES.map(([g, f, zh, en]) => `<button data-g="${g}">${f}<small>${zh}<br>${en}</small></button>`).join('')}</div>
        <p class="lead">${st.idx + 1} / ${ev['自評'].length}</p></div>`;
    }
    if (st.step === 'ptarget') return head + `<p class="lead">${byGroup() ? '你要觀察哪一組？ Which group?' : '你要觀察哪一隊？ Which team?'}</p><div class="big">${teamsOf().map((t) => `<button class="${tcls(t)}" data-tteam="${esc(t)}">${tname(t)}</button>`).join('')}</div>${back('menu')}</div>`;
    if (st.step === 'ptarget2') return head + `<p class="lead">觀察誰？ Who?</p><div class="big">${membersOf(st.tteam).filter((r) => Number(r['座號']) !== st.me).map((r) => mbtn(r, st.tteam, 'data-target')).join('')}</div>${back('ptarget')}</div>`;
    if (st.step === 'peer') {
      const r = rub[ev['同儕'][st.idx]];
      return head + `<p class="lead">觀察 ${st.target} 號</p><p class="q">${esc(r['同儕觀察']['中文'])}</p><p class="q-en">${esc(r['同儕觀察']['英文'])}</p>
        <div class="big stars">${STARS.map(([g, t]) => `<button data-g="${g}">${t}</button>`).join('')}</div><p class="lead">${st.idx + 1} / ${ev['同儕'].length}</p></div>`;
    }
    if (st.step === 'cheer') {
      const opts = [...new Set(['Good job!', 'Great teamwork!', 'Nice pass!', ...ev['同儕'].flatMap((n) => rub[n]['同儕觀察']['英文'].split('/').map((x) => x.trim()))])];
      return head + `<p class="q">送他一句鼓勵！</p><p class="q-en">Say something nice!</p><div class="chips-big">${opts.map((o) => `<button data-cheer="${esc(o)}" class="${st.cheer === o ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>
        <p style="text-align:center"><button class="btn" id="sendpeer" style="font-size:1.3rem;padding:12px 32px" ${st.cheer ? '' : 'disabled'}>送出 Send</button></p></div>`;
    }
    if (st.step === 'thanks') return head + `<p class="q" style="font-size:2.4rem">🎉</p><p class="q">謝謝你！</p><p class="q-en">Thank you!</p>
      <div class="big"><button data-go="menu">再做一個</button></div></div>`;
    return '';
  }
  function base(item, type) {
    return { '班級': st.cls, '單元': L['課程名稱'], '節': s['節'], '類型': type, '評量者座號': st.me, '評量者隊': st.team === OTHER ? '' : st.team, '項目': item };
  }
  function bind(root) {
    root.onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.cls) { st.cls = d.cls; st.step = 'team'; }
      else if (d.team) { st.team = d.team; st.step = 'me'; }
      else if (d.me) { st.me = +d.me; st.step = 'menu'; }
      else if (d.mode) { st.mode = d.mode; st.idx = 0; st.grades = []; st.step = d.mode === 'self' ? 'self' : 'ptarget'; }
      else if (d.tteam) { st.tteam = d.tteam; st.step = 'ptarget2'; }
      else if (d.target) { st.target = +d.target; st.step = 'peer'; st.idx = 0; st.grades = []; }
      else if (d.go) { st.step = d.go; }
      else if (d.cheer) { st.cheer = d.cheer; }
      else if (d.g) {
        const g = +d.g;
        if (st.step === 'self') {
          const item = ev['自評'][st.idx];
          await Eval.send(Object.assign(base(item, '自評'), { '等第': g })); st.count++;
          st.idx++; if (st.idx >= ev['自評'].length) st.step = 'thanks';
        } else { st.grades.push(g); st.idx++; if (st.idx >= ev['同儕'].length) { st.step = 'cheer'; st.cheer = null; } }
      } else if (b.id === 'sendpeer') {
        for (let i = 0; i < ev['同儕'].length; i++) await Eval.send(Object.assign(base(ev['同儕'][i], '同儕'), { '被評者座號': st.target, '等第': st.grades[i], '鼓勵語': st.cheer })); st.count += ev['同儕'].length; st.step = 'thanks';
      } else return;
      draw();
    };
  }
  function draw() { const el = $('#evalroot'); el.innerHTML = view(); }
  return { html: `<div id="evalroot"></div>`, after: () => { draw(); bind($('#evalroot')); window.scrollTo(0, 0); } };
};
