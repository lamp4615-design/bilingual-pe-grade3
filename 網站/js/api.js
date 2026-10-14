/* Apps Script 後端連線（學生端）。網址可在「設定」頁覆寫（存在這台裝置）。
   老師功能不經過網站：在 Apps Script 的「教師後台」，由 Google 登入判斷身分。 */
const API = {
  url() { return store.get('api_url', '') || (window.APP_CONFIG && window.APP_CONFIG.APPS_SCRIPT_URL) || ''; },
  code() { return store.get('class_code', ''); },
  enabled() { return !!this.url(); },
  consoleUrl() { return store.get('console_url', '') || (window.APP_CONFIG && window.APP_CONFIG.TEACHER_CONSOLE_URL) || ''; },
  async call(action, payload) {
    if (!this.enabled()) throw new Error('尚未連線後端（請到「設定」貼上 Apps Script 網址）');
    const body = { action, payload: payload || {}, classCode: this.code() };
    const r = await fetch(this.url(), { method: 'POST', body: JSON.stringify(body) }); // 不加 header，避免預檢請求
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '後端錯誤');
    return j.data;
  },
  student(action, payload) { return this.call(action, payload); }
};
