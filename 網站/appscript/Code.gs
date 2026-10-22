/**
 * 雙語體育共學站 — 後端（Google Apps Script）
 * 綁定在一份 Google 試算表上使用。部署步驟見 README.md。
 *
 * 兩種使用者、兩個部署（同一份程式）：
 *  - 學生（iPad）：部署成「所有人」。網站用「班級代碼 CLASS_CODE」呼叫 roster、submitAssessment。
 *  - 老師：部署成「只有我自己」。直接開這個網址就是「教師後台」（Console.html），
 *    身分由 Google 登入判斷，不需要另外設密碼。
 * 祕密設定只有 CLASS_CODE，放在「指令碼屬性」，不要寫進程式或 GitHub。
 */

const SHEET = {
  roster: '學生名單', assess: '學生評量', weak: '不熟悉清單',
  taught: '教學進度', reflect: '教學省思', review: '複習排程', scores: '體育成績', groups: '分組紀錄'
};
const CLASSES = ['甲班', '乙班'];
const HEADERS = {
  '學生名單': ['座號', '隊', '暱稱', '班級', '性別'],
  '學生評量': ['時間', '單元', '節', '類型', '評量者座號', '評量者隊', '被評者座號', '項目', '等第', '鼓勵語', '班級'],
  '不熟悉清單': ['id', '類型', '內容', '來源', '次數', '狀態', '最近練習', '備註'],
  '教學進度': ['日期', '單元', '節', '狀態', '備註'],
  '教學省思': ['日期', '單元', '節', '做得好', '要調整', '下次複習'],
  '複習排程': ['單元', '節', '項目', '下次複習日', '次數'],
  '體育成績': ['日期', '班級', '項目', '座號', '次別', '成績', '單位', '備註', '登錄時間'],
  '分組紀錄': ['分組ID', '建立時間', '名稱', '日期', '策略', '參數', '備註', '組別', '班級', '座號', '棒次', '成績']
};

/** 第一次使用：在 Apps Script 編輯器執行一次 setup()，會建立所有工作表與表頭。 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    } else {                                  // 舊版工作表：補上新增的欄位（例如「班級」）
      const have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      HEADERS[name].forEach(function (h) {
        if (have.indexOf(h) < 0) { sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold'); have.push(h); }
      });
    }
  });
  // 舊資料沒有班級的，一律視為甲班
  [SHEET.roster, SHEET.assess].forEach(function (name) {
    const sh = sheet_(name), col = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf('班級') + 1;
    if (sh.getLastRow() > 1) {
      const r = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = r.getValues();
      r.setValues(v.map(function (x) { return [x[0] || CLASSES[0]]; }));
    }
  });
  ss.getSheetByName(SHEET.groups).getRange('B:B').setNumberFormat('@');
  ss.getSheetByName(SHEET.groups).getRange('D:D').setNumberFormat('@');
  const roster = ss.getSheetByName(SHEET.roster);
  if (roster.getLastRow() === 1) {          // 預設每班 18 人、6 隊、每隊 3 人；之後用網站「設定」頁匯入真正的座號名單
    const rows = [];
    CLASSES.forEach(function (c) { for (let i = 1; i <= 18; i++) rows.push([i, Math.ceil(i / 3), '', c, '']); });
    roster.getRange(2, 1, rows.length, 5).setValues(rows);
  }
  ['Sheet1', '工作表1'].forEach(function (n) {
    const d = ss.getSheetByName(n);
    if (d && ss.getSheets().length > 1 && d.getLastRow() === 0) ss.deleteSheet(d);
  });
  Logger.log('完成。請到「專案設定 → 指令碼屬性」新增 CLASS_CODE（學生用的班級代碼）。');
}

/** 只有試算表擁有者（部署時「只有我自己」開啟）才會看到教師後台；其他人只看到服務狀態。 */
function isOwner_() {
  const me = Session.getActiveUser().getEmail();
  return !!me && me === Session.getEffectiveUser().getEmail();
}
function assertOwner_() { if (!isOwner_()) throw new Error('只有試算表擁有者可以使用教師後台'); }

function doGet() {
  if (isOwner_()) {
    return HtmlService.createHtmlOutputFromFile('Console').setTitle('教師後台')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return out({ ok: true, service: 'bilingual-pe-api', time: new Date().toISOString() });
}

/** 學生端 API：只開放取名單與送出自評／互評。老師功能全在教師後台（google.script.run），不經過這裡。 */
function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const p = req.payload || {};
    const studentOK = !!req.classCode && req.classCode === PropertiesService.getScriptProperties().getProperty('CLASS_CODE');
    const studentActions = { roster: roster_, submitAssessment: submitAssessment_ };
    if (req.action === 'ping') return out({ ok: true, data: { role: studentOK ? 'student' : 'none' } });
    if (studentActions[req.action] && studentOK) return out({ ok: true, data: studentActions[req.action](p) });
    return out({ ok: false, error: '沒有權限或未知的動作：' + req.action });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/* ---------- 工具 ---------- */
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function rows_(name) {
  const v = sheet_(name).getDataRange().getValues(), h = v.shift();
  return v.map(function (r) { const o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
}
function append_(name, obj) {
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { sheet_(name).appendRow(HEADERS[name].map(function (k) { return obj[k] === undefined ? '' : obj[k]; })); }
  finally { lock.releaseLock(); }
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'); }

/* ---------- 學生（iPad） ---------- */
function roster_() { return rows_(SHEET.roster).map(function (r) { r['班級'] = r['班級'] || CLASSES[0]; return r; }); }

function submitAssessment_(p) {
  const grade = Number(p.等第);
  if ([1, 2, 3].indexOf(grade) < 0) throw new Error('等第必須是 1、2、3');
  if (['自評', '同儕'].indexOf(p.類型) < 0) throw new Error('類型必須是 自評 或 同儕');
  append_(SHEET.assess, {
    班級: p.班級 || CLASSES[0], 時間: now_(), 單元: p.單元, 節: Number(p.節), 類型: p.類型, 評量者座號: Number(p.評量者座號), 評量者隊: Number(p.評量者隊),
    被評者座號: p.被評者座號 ? Number(p.被評者座號) : '', 項目: p.項目, 等第: grade, 鼓勵語: String(p.鼓勵語 || '').slice(0, 60)
  });
  return { saved: true };
}

/* 以下「老師：…」的函式是舊版（需密碼）網站用的資料層；網站已不再呼叫，待移到教師後台（Console.html）時再接上 tc_ 函式。 */
/* ---------- 老師：評量 ---------- */
function assessSummary_(p) {
  const rows = rows_(SHEET.assess).filter(function (r) {
    return (!p.單元 || r.單元 === p.單元) && (!p.節 || Number(r.節) === Number(p.節)) && (!p.班級 || (r.班級 || CLASSES[0]) === p.班級);
  });
  const byItem = {}, byStudent = {};
  rows.forEach(function (r) {
    const k = r.類型 + '｜' + r.項目;
    byItem[k] = byItem[k] || { 1: 0, 2: 0, 3: 0 };
    byItem[k][r.等第]++;
    const sid = r.類型 === '自評' ? r.評量者座號 : r.被評者座號;
    if (sid) {
      const key = (r.班級 || CLASSES[0]) + '｜' + sid + '｜' + r.類型 + '｜' + r.項目;
      byStudent[key] = byStudent[key] || { sum: 0, n: 0 };
      byStudent[key].sum += Number(r.等第);
      byStudent[key].n++;
    }
  });
  return { total: rows.length, byItem: byItem, byStudent: byStudent, recent: rows.slice(-30) };
}

/* ---------- 老師：不熟悉清單 ---------- */
function getWeak_() { return rows_(SHEET.weak); }
function saveWeak_(p) {
  const sh = sheet_(SHEET.weak), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = sh.getDataRange().getValues(), h = data[0];
    (p.items || []).forEach(function (it) {
      let idx = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][h.indexOf('內容')] === it.內容 && data[i][h.indexOf('來源')] === it.來源) { idx = i; break; }
      }
      if (idx > 0) {
        if (!it.只更新狀態) {
          sh.getRange(idx + 1, h.indexOf('次數') + 1).setValue(Number(data[idx][h.indexOf('次數')] || 0) + 1);
          sh.getRange(idx + 1, h.indexOf('最近練習') + 1).setValue(today_());
        }
        sh.getRange(idx + 1, h.indexOf('狀態') + 1).setValue(it.狀態 || data[idx][h.indexOf('狀態')]);
        if (it.備註) sh.getRange(idx + 1, h.indexOf('備註') + 1).setValue(it.備註);
      } else {
        const id = 'W' + ('000' + sh.getLastRow()).slice(-3);
        sh.appendRow([id, it.類型 || '', it.內容, it.來源 || '', 1, it.狀態 || '新', today_(), it.備註 || '']);
        data.push([id, it.類型 || '', it.內容, it.來源 || '', 1, it.狀態 || '新', today_(), it.備註 || '']);
      }
    });
  } finally { lock.releaseLock(); }
  return getWeak_();
}

/* ---------- 老師：教學進度與省思 ---------- */
function markTaught_(p) {
  append_(SHEET.taught, { 日期: p.日期 || today_(), 單元: p.單元, 節: Number(p.節), 狀態: p.狀態 || '已教', 備註: p.備註 || '' });
  return getProgress_();
}
function getProgress_() { return rows_(SHEET.taught); }
function saveReflection_(p) {
  append_(SHEET.reflect, {
    日期: p.日期 || today_(), 單元: p.單元, 節: Number(p.節),
    做得好: p.做得好 || '', 要調整: p.要調整 || '', 下次複習: p.下次複習 || ''
  });
  return getReflections_({});
}
function getReflections_(p) { return rows_(SHEET.reflect).filter(function (r) { return !p.單元 || r.單元 === p.單元; }); }

/* ---------- 老師：學生名單 ---------- */
/* 只取代 p.班級 這一班的名單，另一班不動。p.roster = [{座號, 隊, 暱稱, 性別}] */
function saveRoster_(p) {
  if (CLASSES.indexOf(p.班級) < 0) throw new Error('班級必須是 ' + CLASSES.join(' 或 '));
  const mine = (p.roster || []).map(function (r) { return { 座號: Number(r.座號), 隊: Number(r.隊), 暱稱: String(r.暱稱 || ''), 班級: p.班級, 性別: String(r.性別 || '') }; });
  const seen = {};
  mine.forEach(function (r) {
    if (!(r.座號 > 0) || !(r.隊 > 0)) throw new Error('座號與隊必須是正整數（座號 ' + r.座號 + '）');
    if (seen[r.座號]) throw new Error('座號重複：' + r.座號);
    if (['', '男', '女'].indexOf(r.性別) < 0) throw new Error('性別只能是 男 或 女（座號 ' + r.座號 + '）');
    seen[r.座號] = true;
  });
  const others = roster_().filter(function (r) { return r.班級 !== p.班級; });
  const all = others.concat(mine);
  const sh = sheet_(SHEET.roster), h = HEADERS[SHEET.roster];
  sh.clearContents();
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
  if (all.length) sh.getRange(2, 1, all.length, h.length).setValues(all.map(function (r) { return h.map(function (k) { return r[k]; }); }));
  return roster_();
}

/* ---------- 老師：體育成績（例如 100 公尺跑秒數） ---------- */
/* 同一天、同班級、同項目、同座號、同次別只留一筆（重送＝更正）。日期以純文字存，避免試算表自動轉成日期。 */
function dateStr_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd') : String(v).slice(0, 10); }
function scoreRows_() {
  return rows_(SHEET.scores).map(function (r) {            // Date 物件無法傳給 google.script.run，統一轉成文字
    Object.keys(r).forEach(function (k) { r[k] = plain_(r[k]); });
    r['日期'] = dateStr_(r['日期']);
    return r;
  });
}
function getScores_(p) { return scoreRows_().filter(function (r) { return (!p.項目 || r['項目'] === p.項目) && (!p.班級 || r['班級'] === p.班級); }); }
function saveScores_(p) {
  const items = p.items || [], h = HEADERS[SHEET.scores];
  items.forEach(function (it) {
    const v = Number(it.成績);
    if (!(v > 0 && v < 1000)) throw new Error('座號 ' + it.座號 + ' 的成績必須是大於 0 的數字');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(it.日期))) throw new Error('日期格式必須是 YYYY-MM-DD');
    if (!it.項目) throw new Error('缺少項目');
    if (CLASSES.indexOf(it.班級) < 0) throw new Error('班級必須是 ' + CLASSES.join(' 或 '));
  });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(SHEET.scores), index = {};
    const key = function (d, c, i, s, t) { return [d, c, i, Number(s), Number(t)].join('|'); };
    scoreRows_().forEach(function (r, i) { index[key(r['日期'], r['班級'], r['項目'], r['座號'], r['次別'])] = i + 2; });
    items.forEach(function (it) {
      const k = key(it.日期, it.班級, it.項目, it.座號, it.次別 || 1);
      const row = [it.日期, it.班級, it.項目, Number(it.座號), Number(it.次別 || 1), Number(it.成績), it.單位 || '', String(it.備註 || '').slice(0, 60), now_()];
      const at = index[k] || sh.getLastRow() + 1;
      sh.getRange(at, 1).setNumberFormat('@');
      sh.getRange(at, 1, 1, h.length).setValues([row]);
      index[k] = at;
    });
  } finally { lock.releaseLock(); }
  return getScores_({ '項目': items.length ? items[0].項目 : '', '班級': items.length ? items[0].班級 : '' });
}

/* ---------- 教師後台（Console.html 以 google.script.run 呼叫；每個都先確認是擁有者） ---------- */
function tc_init() { assertOwner_(); return { roster: roster_(), classes: CLASSES }; }
function tc_getScores(item) { assertOwner_(); return getScores_({ '項目': item }); }
function tc_saveScores(items) { assertOwner_(); return saveScores_({ items: items }); }
function tc_saveRoster(cls, roster) { assertOwner_(); return saveRoster_({ '班級': cls, roster: roster }); }
function tc_assessSummary(cls) { assertOwner_(); const r = assessSummary_({ '班級': cls }); delete r.recent; return r; }

/* 分組紀錄：一次分組存成多列（每位學生一列），用「分組ID」串起來，下一堂課可以直接叫出來沿用。 */
function plain_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss') : v; }
function tc_getGroupings() {
  assertOwner_();
  const by = {}, order = [];
  rows_(SHEET.groups).forEach(function (r) {
    const id = r['分組ID'];
    if (!by[id]) {
      by[id] = { id: id, 建立時間: String(plain_(r['建立時間'])), 名稱: r['名稱'], 日期: String(plain_(r['日期'])).slice(0, 10),
        策略: r['策略'], 參數: r['參數'], 備註: r['備註'], members: [] };
      order.push(id);
    }
    by[id].members.push({ 組別: Number(r['組別']), 班級: r['班級'], 座號: Number(r['座號']), 棒次: r['棒次'] === '' ? '' : Number(r['棒次']), 成績: r['成績'] === '' ? '' : Number(r['成績']) });
  });
  return order.reverse().slice(0, 30).map(function (id) { return by[id]; });
}
function tc_saveGrouping(g) {
  assertOwner_();
  if (!g || !g.members || !g.members.length) throw new Error('沒有任何分組可以儲存');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(SHEET.groups), h = HEADERS[SHEET.groups];
    const id = 'G' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMddHHmmss');
    const rows = g.members.map(function (m) {
      return [id, now_(), String(g.名稱 || '').slice(0, 40), String(g.日期 || today_()), String(g.策略 || ''), String(g.參數 || ''), String(g.備註 || '').slice(0, 100),
        Number(m.組別), String(m.班級), Number(m.座號), m.棒次 === '' || m.棒次 == null ? '' : Number(m.棒次), m.成績 === '' || m.成績 == null ? '' : Number(m.成績)];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, h.length).setValues(rows);
  } finally { lock.releaseLock(); }
  return tc_getGroupings();
}
function tc_deleteGrouping(id) {
  assertOwner_();
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(SHEET.groups), v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (v[i][0] === id) sh.deleteRow(i + 1);
  } finally { lock.releaseLock(); }
  return tc_getGroupings();
}
