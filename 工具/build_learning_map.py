#!/usr/bin/env python3
"""由教案產生「學習項目庫」：每個單元有哪些動作／策略目標與英語用語，首次在第幾節出現、之後哪幾節複習。
網站「學習歷程」用它判斷「已學會什麼」與「該複習什麼」（螺旋複習的資料基礎）。
用法：python 工具/build_learning_map.py 接力賽   → 學習紀錄/接力賽_學習項目.json"""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def norm(s): return " ".join(re.sub(r"[^a-z0-9' ]+", " ", s.lower().replace("’", "'")).split())

def build(unit):
    L = json.load(open(ROOT / "教案" / f"{unit}.json", encoding="utf8"))
    prior = json.load(open(ROOT / "知識庫" / "prior_english.json", encoding="utf8"))
    prior_n = {norm(x) for x in prior["句型"]} | {norm(x) for x in prior["字詞"]}
    lg = L["語言目標"]
    new_n = {norm(x) for x in lg["新字詞"]}
    new_pat = {norm(part) for x in lg["新句型"] for part in re.split(r"\s+[–-]\s+", x)}
    items = []
    # 1 內容目標（動作技能、策略、規則、合作、英語互動、暖身）
    for g in L["內容目標"]:
        secs = [s["節"] for s in L["節次"] if any(g["id"] in p.get("對應目標", []) for p in ([s["暖身"]] if s["暖身"].get("對應目標") else []) + s["活動"])]
        items.append({"id": f"goal-{g['id']}", "類型": "目標", "內容": g["文字"], "首次節": secs[0] if secs else None, "出現節": secs, "先備": False,
                      "課綱": g["對應學習表現"] + g["對應學習內容"]})
    # 2 英語用語：教師語句與學生回應（拆成單句）
    seen = {}
    for s in L["節次"]:
        phrases = list(s["暖身"]["教師語句"])
        for p in s["活動"]: phrases += p["教師語句"] + [x for x in p["學生回應"] if not x.startswith("（")]
        for ph in phrases:
            for part in re.split(r"(?<=[.!?])\s+", ph):
                key = norm(part)
                if not key: continue
                d = seen.setdefault(key, {"內容": part.strip(), "出現節": []})
                if s["節"] not in d["出現節"]: d["出現節"].append(s["節"])
    for i, (key, d) in enumerate(seen.items(), 1):
        is_new = any(w in key.split() for w in new_n) or key in new_pat
        items.append({"id": f"lang-{i:02d}", "類型": "英語用語", "內容": d["內容"], "首次節": d["出現節"][0], "出現節": d["出現節"],
                      "先備": key in prior_n, "新": is_new})
    # 3 新字詞（單獨列，方便複習）
    for w in lg["新字詞"]:
        secs = sorted({n for d in seen.values() if w.lower() in norm(d["內容"]).split() for n in d["出現節"]})
        items.append({"id": f"word-{w}", "類型": "新字詞", "內容": w, "首次節": secs[0] if secs else None, "出現節": secs, "先備": False, "新": True})
    out = {"單元": L["課程名稱"], "代號": L.get("代號"), "共幾節": len(L["節次"]), "項目": items}
    path = ROOT / "學習紀錄" / f"{unit}_學習項目.json"
    path.parent.mkdir(exist_ok=True)
    json.dump(out, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    return path, out

if __name__ == "__main__":
    p, o = build(sys.argv[1])
    from collections import Counter
    print("已輸出", p.name, dict(Counter(i["類型"] for i in o["項目"])))
