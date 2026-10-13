#!/usr/bin/env python3
"""把網站與資料組成可上線的 _site/（GitHub Pages 也用這支）。
用法：python 工具/build_site.py            只建置
      python 工具/build_site.py --serve    建置並在 http://localhost:8000 預覽"""
import json, shutil, sys, pathlib, http.server, socketserver, functools
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
if OUT.exists(): shutil.rmtree(OUT)
(OUT / "data" / "coach").mkdir(parents=True)
for f in ("index.html", "style.css", "config.js"): shutil.copy(ROOT / "網站" / f, OUT / f)
shutil.copytree(ROOT / "網站" / "js", OUT / "js")
for f in ("curriculum.json", "素養對應規則.json", "prior_english.json"): shutil.copy(ROOT / "知識庫" / f, OUT / "data" / f)
sys.path.insert(0, str(ROOT / "工具"))
import build_learning_map
units = []
for lf in sorted((ROOT / "教案").glob("*.json")):
    if lf.name.startswith("_"): continue
    L = json.load(open(lf, encoding="utf8")); uid = L.get("代號")
    if not uid: print("略過（缺『代號』）：", lf.name); continue
    shutil.copy(lf, OUT / "data" / f"{uid}.json")
    entry = {"id": uid, "title": L["課程名稱"], "lesson": f"data/{uid}.json", "dialogue": None}
    df = ROOT / "對話練習" / f"{lf.stem}_對話.json"
    if df.exists(): shutil.copy(df, OUT / "data" / f"{uid}_dialogue.json"); entry["dialogue"] = f"data/{uid}_dialogue.json"
    lp, lo = build_learning_map.build(lf.stem)
    shutil.copy(lp, OUT / "data" / f"{uid}_learning.json"); entry["learning"] = f"data/{uid}_learning.json"
    units.append(entry)
json.dump(units, open(OUT / "data" / "units.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
for f in (ROOT / "備課教練專案").glob("*.md"): shutil.copy(f, OUT / "data" / "coach" / f.name)
(OUT / ".nojekyll").write_text("")
print("已建置", OUT, "單元：", [u["id"] for u in units])
if "--serve" in sys.argv:
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
    with socketserver.TCPServer(("", 8000), h) as s:
        print("預覽：http://localhost:8000  （Ctrl+C 結束）"); s.serve_forever()
