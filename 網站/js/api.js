/* Apps Script 後端連線。網址可在「設定」頁覆寫（存在這台裝置）。 */
const API = {
  url() { return store.get('api_url', '') || (window.APP_CONFIG && window.APP_CONFIG.APPS_SCRIPT_URL) || ''; },
  pin() { return store.get('pin', '') || store.sget('pin', '') || ''; }, // 記在這台裝置；舊版存在本次瀏覽的也讀得到
  code() { return store.get('class_code', ''); },
  enabled() { return !!this.url(); },
  async call(action, payload, role) {
    if (!this.enabled()) throw new Error('尚未連線後端（請到「設定」貼上 Apps Script 網址）');
    const body = { action, payload: payload || {} };
    if (role === 'student') body.classCode = this.code(); else body.pin = this.pin();
    const r = await fetch(this.url(), { method: 'POST', body: JSON.stringify(body) }); // 不加 header，避免預檢請求
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '後端錯誤');
    return j.data;
  },
  teacher(action, payload) { return this.call(action, payload, 'teacher'); },
  student(action, payload) { return this.call(action, payload, 'student'); }
};
