#!/usr/bin/env python3
"""檢查備課對話是否涵蓋教案中每一節的教師語句與學生回應。
用法：python 工具/check_dialogue.py 教案/接力賽.json 對話練習/接力賽_對話.json"""
import json, re, sys
def norm(s): return re.sub(r"[^a-z0-9' ]+", " ", s.lower().replace("’", "'").replace("“", "").replace("”", "")).split()
def run(lesson_f, dlg_f):
    L = json.load(open(lesson_f, encoding="utf8")); D = json.load(open(dlg_f, encoding="utf8"))
    miss = 0
    for s in L["節次"]:
        d = next((x for x in D["節次"] if x["節"] == s["節"]), None)
        if not d: print(f"第{s['節']}節 沒有對話"); miss += 1; continue
        text = " ".join(l["英文"] for sc in d["場景"] for l in sc["對話"])
        words = " ".join(norm(text))
        need = list(s["暖身"]["教師語句"])
        for p in s["活動"]: need += p["教師語句"] + [x for x in p["學生回應"] if not x.startswith("（")]
        for ph in need:
            if " ".join(norm(ph)) and " ".join(norm(ph)) not in words:
                print(f"第{s['節']}節 對話缺少：{ph}"); miss += 1
        if len(d["場景"]) < 2 or not d["生活情境"]: print(f"第{s['節']}節 缺生活情境場景"); miss += 1
    print("通過" if not miss else f"未通過（{miss} 項）"); return miss
if __name__ == "__main__": sys.exit(1 if run(sys.argv[1], sys.argv[2]) else 0)
