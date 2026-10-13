#!/usr/bin/env python3
"""教案邏輯檢核：總綱→領綱→學習表現→學習內容→目標→活動→評量。
用法：python 工具/validate_lesson.py 教案/某教案.json
錯誤(ERROR)必須修正；警告(WARN)請老師判斷。"""
import json, sys, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
KB = ROOT / "知識庫"
cur = json.load(open(KB / "curriculum.json", encoding="utf8"))
rules = json.load(open(KB / "素養對應規則.json", encoding="utf8"))
prior = json.load(open(KB / "prior_english.json", encoding="utf8"))

def validate(L):
    err, warn = [], []
    E = err.append; W = warn.append
    perf = set(L.get("學習表現", [])); cont = set(L.get("學習內容", []))
    # 1 代碼存在且屬第二學習階段
    for c in perf:
        if c not in cur["學習表現"]: E(f"學習表現 {c} 不在第二學習階段課綱內")
    for c in cont:
        if c not in cur["學習內容"]: E(f"學習內容 {c} 不在第二學習階段課綱內")
    if not perf: E("未列學習表現")
    if not cont: E("未列學習內容")
    # 2 領綱存在、總綱一致、有學習表現支持
    for c in L.get("領綱核心素養", []):
        if c not in cur["領綱核心素養"]: E(f"領綱 {c} 不存在"); continue
        sup = set(rules.get(c, []))
        if not (perf & sup):
            if c == "健體-E-B1" and L.get("英語學習表現"): continue
            E(f"領綱 {c} 沒有任何學習表現支持（可支持者：{sorted(sup)}）")
    zong = set(L.get("總綱核心素養", []))
    need = {rules["總綱對應"][c] for c in L.get("領綱核心素養", []) if c in rules["總綱對應"]}
    if zong != need: E(f"總綱 {sorted(zong)} 與領綱推得的 {sorted(need)} 不一致")
    n = len(L.get("領綱核心素養", []))
    if not 2 <= n <= 3: W(f"領綱素養 {n} 條（建議 2–3 條）")
    # 3 目標回溯
    obj_ids = set()
    used_perf, used_cont = set(), set()
    for o in L.get("內容目標", []):
        obj_ids.add(o["id"])
        if not set(o.get("對應學習表現", [])) <= perf: E(f"目標 {o['id']} 引用未宣告的學習表現")
        if not set(o.get("對應學習內容", [])) <= cont: E(f"目標 {o['id']} 引用未宣告的學習內容")
        if not o.get("對應學習表現") or not o.get("對應學習內容"): E(f"目標 {o['id']} 缺學習表現或學習內容對應")
        used_perf |= set(o.get("對應學習表現", [])); used_cont |= set(o.get("對應學習內容", []))
    for c in perf - used_perf: E(f"學習表現 {c} 沒有任何目標承接")
    for c in cont - used_cont: E(f"學習內容 {c} 沒有任何目標承接")
    # 4 活動承接 / 節時間
    act_perf, act_cont, act_obj = set(), set(), set()
    sessions = L.get("節次", [])
    if not 6 <= len(sessions) <= 8: W(f"本單元 {len(sessions)} 節（老師範圍 6–8 節＝3–4 週）")
    for s in sessions:
        tot = sum(p.get("分鐘", 0) for p in s.get("活動", []))
        tot += s.get("暖身分鐘", 0) + s.get("總結分鐘", 0)
        if tot != 40: E(f"第{s['節']}節時間合計 {tot} 分鐘（應為 40）")
        parts = list(s.get("活動", []))
        wu = s.get("暖身")
        if isinstance(wu, dict) and wu.get("對應學習內容"):
            parts.insert(0, {**wu, "名稱": "暖身"})
        for p in parts:
            for k, store, name in (("對應學習表現", act_perf, "學習表現"), ("對應學習內容", act_cont, "學習內容")):
                for c in p.get(k, []):
                    store.add(c)
                    if c not in (perf if name == "學習表現" else cont): E(f"第{s['節']}節 {p.get('名稱')} 引用未宣告的{name} {c}")
            for oid in p.get("對應目標", []):
                act_obj.add(oid)
                if oid not in obj_ids: E(f"第{s['節']}節 {p.get('名稱')} 引用不存在的目標 {oid}")
            if not p.get("對應學習表現") and not p.get("課綱外"):
                E(f"第{s['節']}節 {p.get('名稱')} 沒有對應學習表現（若確為課綱外請標『課綱外』並刪改）")
            if p.get("課綱外"): E(f"第{s['節']}節 {p.get('名稱')} 標示為課綱外，須刪除或調整")
            if not p.get("教師語句"): W(f"第{s['節']}節 {p.get('名稱')} 缺『教師語句』")
            if not p.get("TPR流程"): W(f"第{s['節']}節 {p.get('名稱')} 缺 TPR 流程（聽→做→說）")
            if not p.get("CLIL4C"): W(f"第{s['節']}節 {p.get('名稱')} 缺 CLIL 4C 標示")
    for c in perf - act_perf: E(f"學習表現 {c} 沒有任何活動承接")
    for c in cont - act_cont: E(f"學習內容 {c} 沒有任何活動承接")
    for o in obj_ids - act_obj: E(f"目標 {o} 沒有任何活動承接")
    # 5 評量
    assessed = set()
    for a in L.get("評量規準", []):
        assessed |= set(a.get("對應學習表現", []))
        if not all(k in a.get("等第", {}) for k in ("優異", "達成", "努力中")):
            E(f"評量 {a.get('項目')} 缺三等第（優異／達成／努力中）")
    for c in perf - assessed: E(f"學習表現 {c} 沒有評量規準")
    for a in L.get("評量規準", []):
        if not a.get("學生自評"): W(f"評量 {a.get('項目')} 沒有學生自評題")
        if not a.get("同儕觀察"): W(f"評量 {a.get('項目')} 沒有同儕觀察指標")
    sess_nos = {s["節"] for s in sessions}
    for s in sessions:
        for k in ("自評", "同儕"):
            for ref in s.get("學生評量", {}).get(k, []):
                if ref not in {a.get("項目") for a in L.get("評量規準", [])}:
                    E(f"第{s['節']}節 學生評量{k} 引用不存在的評量項目 {ref}")
    # 6 英語：新詞量控制
    lang = L.get("語言目標", {})
    known = {w.lower() for w in prior["字詞"]}
    new_words = [w for w in lang.get("新字詞", []) if w.lower() not in known]
    new_pats = [s for s in lang.get("新句型", []) if s not in prior["句型"]]
    if len(new_words) > 6: W(f"新字詞 {len(new_words)} 個（建議每單元 3–5 個）")
    if len(new_pats) > 2: W(f"新句型 {len(new_pats)} 個（建議每單元 1–2 個）")
    if not lang.get("of") or not lang.get("for") or not lang.get("through"):
        E("語言目標須含 of / for / through 三層")
    # 7 螺旋複習：第2節起必須有複習來源
    for s in sessions[1:]:
        if not s.get("複習") : W(f"第{s['節']}節 未標示複習（螺旋）內容")
    return err, warn, new_words, new_pats

if __name__ == "__main__":
    f = pathlib.Path(sys.argv[1])
    L = json.load(open(f, encoding="utf8"))
    err, warn, nw, np_ = validate(L)
    print(f"檢核：{f.name}")
    for e in err: print("ERROR", e)
    for w in warn: print("WARN ", w)
    print(f"新字詞：{nw}  新句型：{np_}")
    print("通過" if not err else f"未通過（{len(err)} 項錯誤）")
    sys.exit(1 if err else 0)
