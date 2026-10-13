/**
 * 雙語體育共學站 — 後端（Google Apps Script）
 * 綁定在一份 Google 試算表上使用。部署步驟見 README.md。
 *
 * 角色：
 *  - 學生（iPad）：用「班級代碼 CLASS_CODE」呼叫 roster、submitAssessment
 *  - 老師：用「老師密碼 TEACHER_PIN」呼叫其餘所有功能
 * 祕密設定放在「指令碼屬性」，不要寫進程式或 GitHub：
 *  CLASS_CODE、TEACHER_PIN、ANTHROPIC_API_KEY、（選填）MODEL
 */

const SHEET = {
  roster: '學生名單', assess: '學生評量', practice: '練習紀錄', weak: '不熟悉清單',
  taught: '教學進度', reflect: '教學省思', review: '複習排程'
};
const HEADERS = {
  '學生名單': ['座號', '隊', '暱稱'],
  '學生評量': ['時間', '單元', '節', '類型', '評量者座號', '評量者隊', '被評者座號', '項目', '等第', '鼓勵語'],
  '練習紀錄': ['時間', '單元', '節', '回合', '老師說', '教練與學生回應'],
  '不熟悉清單': ['id', '類型', '內容', '來源', '次數', '狀態', '最近練習', '備註'],
  '教學進度': ['日期', '單元', '節', '狀態', '備註'],
  '教學省思': ['日期', '單元', '節', '做得好', '要調整', '下次複習'],
  '複習排程': ['單元', '節', '項目', '下次複習日', '次數']
};
const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** 第一次使用：在 Apps Script 編輯器執行一次 setup()，會建立所有工作表與表頭。 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  const roster = ss.getSheetByName(SHEET.roster);
  if (roster.getLastRow() === 1) {          // 預設 18 人、6 隊、每隊 3 人（可自行改）
    const rows = [];
    for (let i = 1; i <= 18; i++) rows.push([i, Math.ceil(i / 3), '']);
    roster.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  ['Sheet1', '工作表1'].forEach(function (n) {
    const d = ss.getSheetByName(n);
    if (d && ss.getSheets().length > 1 && d.getLastRow() === 0) ss.deleteSheet(d);
  });
  Logger.log('完成。請到「專案設定 → 指令碼屬性」新增 CLASS_CODE、TEACHER_PIN、ANTHROPIC_API_KEY。');
}

function doGet() { return out({ ok: true, service: 'bilingual-pe-api', time: new Date().toISOString() }); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const p = req.payload || {};
    const props = PropertiesService.getScriptProperties();
    const studentOK = !!req.classCode && req.classCode === props.getProperty('CLASS_CODE');
    const teacherOK = !!req.pin && req.pin === props.getProperty('TEACHER_PIN');
    const studentActions = { roster: roster_, submitAssessment: submitAssessment_ };
    const teacherActions = {
      assessSummary: assessSummary_, coach: coach_, saveWeak: saveWeak_, getWeak: getWeak_,
      markTaught: markTaught_, getProgress: getProgress_, saveReflection: saveReflection_,
      getReflections: getReflections_, saveRoster: saveRoster_, getPractice: getPractice_
    };
    if (req.action === 'ping') return out({ ok: true, role: teacherOK ? 'teacher' : studentOK ? 'student' : 'none' });
    if (studentActions[req.action] && (studentOK || teacherOK)) return out({ ok: true, data: studentActions[req.action](p) });
    if (teacherActions[req.action] && teacherOK) return out({ ok: true, data: teacherActions[req.action](p) });
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
function roster_() { return rows_(SHEET.roster); }

function submitAssessment_(p) {
  const grade = Number(p.等第);
  if ([1, 2, 3].indexOf(grade) < 0) throw new Error('等第必須是 1、2、3');
  if (['自評', '同儕'].indexOf(p.類型) < 0) throw new Error('類型必須是 自評 或 同儕');
  append_(SHEET.assess, {
    時間: now_(), 單元: p.單元, 節: Number(p.節), 類型: p.類型, 評量者座號: Number(p.評量者座號), 評量者隊: Number(p.評量者隊),
    被評者座號: p.被評者座號 ? Number(p.被評者座號) : '', 項目: p.項目, 等第: grade, 鼓勵語: String(p.鼓勵語 || '').slice(0, 60)
  });
  return { saved: true };
}

/* ---------- 老師：評量 ---------- */
function assessSummary_(p) {
  const rows = rows_(SHEET.assess).filter(function (r) {
    return (!p.單元 || r.單元 === p.單元) && (!p.節 || Number(r.節) === Number(p.節));
  });
  const byItem = {}, byStudent = {};
  rows.forEach(function (r) {
    const k = r.類型 + '｜' + r.項目;
    byItem[k] = byItem[k] || { 1: 0, 2: 0, 3: 0 };
    byItem[k][r.等第]++;
    const sid = r.類型 === '自評' ? r.評量者座號 : r.被評者座號;
    if (sid) {
      const key = sid + '｜' + r.類型 + '｜' + r.項目;
      byStudent[key] = byStudent[key] || { sum: 0, n: 0 };
      byStudent[key].sum += Number(r.等第);
      byStudent[key].n++;
    }
  });
  return { total: rows.length, byItem: byItem, byStudent: byStudent, recent: rows.slice(-30) };
}

/* ---------- 老師：AI 備課教練 ---------- */
function coach_(p) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('尚未設定 ANTHROPIC_API_KEY');
  const model = props.getProperty('MODEL') || DEFAULT_MODEL;
  const messages = (p.messages || []).slice(-24).map(function (m) {
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) };
  });
  if (!messages.length) throw new Error('沒有對話內容');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: model, max_tokens: Math.min(Number(p.maxTokens) || 700, 1200),
      system: String(p.system || '').slice(0, 20000), messages: messages
    })
  });
  const body = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error('AI 服務錯誤：' + ((body.error && body.error.message) || res.getResponseCode()));
  const text = body.content.map(function (c) { return c.text || ''; }).join('');
  const last = messages[messages.length - 1];
  append_(SHEET.practice, {
    時間: now_(), 單元: p.單元, 節: p.節, 回合: p.回合,
    老師說: last.content.slice(0, 2000), 教練與學生回應: text.slice(0, 4000)
  });
  return { reply: text };
}
function getPractice_(p) {
  return rows_(SHEET.practice).filter(function (r) { return !p.節 || Number(r.節) === Number(p.節); }).slice(-100);
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
        sh.getRange(idx + 1, h.indexOf('次數') + 1).setValue(Number(data[idx][h.indexOf('次數')] || 0) + 1);
        sh.getRange(idx + 1, h.indexOf('最近練習') + 1).setValue(today_());
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
function saveRoster_(p) {
  const sh = sheet_(SHEET.roster);
  sh.clearContents();
  sh.getRange(1, 1, 1, 3).setValues([HEADERS[SHEET.roster]]).setFontWeight('bold');
  const rows = (p.roster || []).map(function (r) { return [Number(r.座號), Number(r.隊), String(r.暱稱 || '')]; });
  if (rows.length) sh.getRange(2, 1, rows.length, 3).setValues(rows);
  return roster_();
}
