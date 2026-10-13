/* 讀取教案、對話、課綱資料（由 build_site.py 放到 data/） */
const DATA = {
  _c: {},
  async json(path) {
    if (this._c[path]) return this._c[path];
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error('讀取失敗：' + path);
    return (this._c[path] = await r.json());
  },
  units() { return this.json('data/units.json'); },
  async unit(id) {
    const us = await this.units();
    const u = us.find((x) => x.id === id);
    if (!u) throw new Error('找不到單元：' + id);
    const [lesson, dialogue] = await Promise.all([this.json(u.lesson), u.dialogue ? this.json(u.dialogue) : null]);
    return { id, lesson, dialogue };
  },
  curriculum() { return this.json('data/curriculum.json'); },
  rules() { return this.json('data/素養對應規則.json'); },
  prior() { return this.json('data/prior_english.json'); }
};

/* 一節裡所有「活動」（含暖身）的對應條文 */
function sessionParts(s) {
  const parts = (s['活動'] || []).slice();
  if (s['暖身'] && s['暖身']['對應學習內容']) parts.unshift(Object.assign({ '名稱': '暖身' }, s['暖身']));
  return parts;
}
function coveredBy(lesson, kind, code) {
  return lesson['節次'].filter((s) => sessionParts(s).some((p) => (p[kind] || []).includes(code))).map((s) => s['節']);
}
