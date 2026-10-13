#!/usr/bin/env python3
"""把教案 JSON 轉成閱讀用 Markdown。用法：python 工具/render_markdown.py 教案/接力賽.json"""
import json, sys, pathlib
KB = pathlib.Path(__file__).resolve().parent.parent / "知識庫"
cur = json.load(open(KB / "curriculum.json", encoding="utf8"))
f = pathlib.Path(sys.argv[1]); L = json.load(open(f, encoding="utf8"))
def lst(xs): return "\n".join(f"- {x}" for x in xs)
def code(kind, c): return f"- **{c}**　{cur[kind].get(c, '')}"
o = []
a = o.append
a(f"# 雙語課程教案設計 The Design of Bilingual Lesson Plan\n\n> 狀態：{L.get('狀態','')}\n")
a("| 欄位 | 內容 |\n|---|---|")
for k in ("學校","課程名稱","單元名稱","學科領域","教材來源","教案設計者","實施年級"):
    a(f"| {k} | {L[k]} |")
a(f"| 班級／場地 | {L['班級人數']} 人／{'、'.join(L['場地'])} |")
a(f"| 節數 | 本單元共 {len(L['節次'])} 節（每週 {L.get('每週堂數',2)} 堂 × {L['每節分鐘']} 分鐘，約 {L.get('單元週數','')} 週） |")
a(f"\n## 教學設計理念\n\n{L['教學設計理念']}\n")
a("## 核心素養對應\n")
a("**總綱**：" + "、".join(L["總綱核心素養"]))
a("\n**領綱**：" + "、".join(L["領綱核心素養"] + L.get("英語領綱核心素養", [])))
a("\n## 學習重點\n\n### 學習表現（健體）")
a("\n".join(code("學習表現", c) for c in L["學習表現"]))
a("\n### 學習內容（健體）")
a("\n".join(code("學習內容", c) for c in L["學習內容"]))
a("\n### 英語領域對照\n- 表現：" + "、".join(L["英語學習表現"]) + "\n- 內容：" + "、".join(L["英語學習內容"]))
a("\n## 學生準備度\n\n**學科**\n" + lst(L["學生準備度"]["學科"]) + "\n\n**英語**\n" + lst(L["學生準備度"]["英語"]))
a("\n## 單元學習目標\n\n### Content")
for g in L["內容目標"]:
    a(f"- **{g['id']}** {g['文字']}　（表現 {'、'.join(g['對應學習表現'])}；內容 {'、'.join(g['對應學習內容'])}）")
lg = L["語言目標"]
a("\n### Language\n\n- **Language of learning**：" + "；".join(lg["of"]))
a("- **Language for learning**：" + "；".join(lg["for"]))
a("- **Language through learning**：" + "；".join(lg["through"]))
a("\n*新字詞：* " + "、".join(lg["新字詞"]) + "　*新句型：* " + "；".join(lg["新句型"]))
a("\n## 中／英文使用時機\n\n| | 英文 | 中文 |\n|---|---|---|")
for who in ("教師","學生"):
    a(f"| {who} | {L['中英文使用時機'][who]['英文']} | {L['中英文使用時機'][who]['中文']} |")
a("\n## 教學方法、策略、資源\n\n- 方法：" + "、".join(L["教學方法"]) + "\n- 策略：" + "、".join(L["教學策略"]) + "\n- 資源：" + "、".join(L["教學資源"]))
a("\n## 評量規準（三等第）\n")
a("| 項目（對應學習表現） | 優異 | 達成 | 努力中 |\n|---|---|---|---|")
for r in L["評量規準"]:
    e = r["等第"]; a(f"| {r['項目']}（{'、'.join(r['對應學習表現'])}） | {e['優異']} | {e['達成']} | {e['努力中']} |")
a("\n**評量方式**\n" + lst(L["評量方式"]))
d = L.get("學生評量設計")
if d:
    a("\n### 學生 iPad 評量設計\n\n" + "\n".join(f"- **{k}**：{v}" for k, v in d.items()))
    a("\n| 評量項目 | 學生自評（中／英） | 同儕觀察（中／英） |\n|---|---|---|")
    for r in L["評量規準"]:
        s, p = r["學生自評"], r["同儕觀察"]
        a(f"| {r['項目']} | {s['中文']}／{s['英文']} | {p['中文']}／{p['英文']} |")
a("\n## 教學流程 Teaching Procedures\n")
for s in L["節次"]:
    a(f"\n### 第 {s['節']} 節　{s['主題']}\n")
    a(f"場地：{s.get('場地','')}　器材：{'、'.join(s.get('器材',[]))}")
    a("\n**複習（螺旋）**：" + "；".join(s["複習"]))
    w = s["暖身"]
    a(f"\n**準備階段 Preparation（{s['暖身分鐘']} 分）暖身 Warm up**\n\n{w['說明']}\n\n教師語句：" + " / ".join(w["教師語句"]) + f"\n\n對應：{'、'.join(w['對應學習表現'])}｜{'、'.join(w['對應學習內容'])}｜{'、'.join(w['對應目標'])}")
    for p in s["活動"]:
        a(f"\n**發展階段 Development（{p['分鐘']} 分）{p['名稱']}**\n\n{p['流程']}\n")
        a("教師語句運用：" + " / ".join(p["教師語句"]) + "　學生回應：" + " / ".join(p["學生回應"]))
        t, c = p["TPR流程"], p["CLIL4C"]
        a(f"\n- TPR：聽 {t['聽']}　→　做 {t['做']}　→　說 {t['說']}")
        a(f"- CLIL 4C：內容 {c['內容']}；溝通 {c['溝通']}；認知 {c['認知']}；文化 {c['文化']}")
        a(f"- 對應：{'、'.join(p['對應學習表現'])}｜{'、'.join(p['對應學習內容'])}｜{'、'.join(p['對應目標'])}")
        a(f"- {p['提醒']}")
    t = s["總結"]
    a(f"\n**總結階段 Summary（{s['總結分鐘']} 分）**\n\n提問：" + "；".join(t["提問"]) + f"\n\n預告：{t['預告']}　Exit：{t['Exit']}")
    ev = s.get("學生評量", {})
    a(f"\n**學生評量**：自評 {'、'.join(ev.get('自評', [])) or '—'}｜同儕觀察 {'、'.join(ev.get('同儕', [])) or '—'}")
    a(f"\n第 {s['節']} 節結束 End of session {s['節']}")
a("\n## 參考資料\n" + lst(L["參考資料"]))
a("\n## 教學歷程與省思\n\n（上課後填寫；由『學習紀錄』匯入）")
out = f.with_suffix(".md"); out.write_text("\n".join(o), encoding="utf8"); print("已輸出", out.name)
