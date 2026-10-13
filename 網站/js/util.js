/* 共用小工具 */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 私密瀏覽等情況 */ } },
  sget(k, d) { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || '已複製'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg || '已複製'); } catch (e2) { toast('複製失敗，請手動選取'); }
    ta.remove();
  }
}
const chips = (arr, cls) => (arr || []).map((x) => `<span class="chip ${cls || ''}">${esc(x)}</span>`).join('');
function parseQuery(h) { const q = {}; (h.split('?')[1] || '').split('&').forEach((p) => { if (p) { const [k, v] = p.split('='); q[k] = decodeURIComponent(v || ''); } }); return q; }
const gradeLabel = { 3: '優異', 2: '達成', 1: '努力中' };
