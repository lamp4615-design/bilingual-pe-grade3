#!/usr/bin/env python3
"""產生「備課教練」Claude 專案的單元知識檔（上傳到專案知識庫）。
用法：python 工具/build_coach_pack.py 接力賽
讀：教案/{單元}.json、對話練習/{單元}_對話.json、知識庫/prior_english.json
寫：備課教練專案/知識_{單元}.md"""
import json, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
unit = sys.argv[1]
L = json.load(open(ROOT / "教案" / f"{unit}.json", encoding="utf8"))
D = json.load(open(ROOT / "對話練習" / f"{unit}_對話.json", encoding="utf8"))
P = json.load(open(ROOT / "知識庫" / "prior_english.json", encoding="utf8"))
lg = L["語言目標"]
o = []; a = o.append
a(f"# 備課教練知識檔：{L['單元名稱']}（{len(L['節次'])} 節）\n")
a("> 本檔給「雙語備課教練」專案使用。老師說「開始第 N 節」時，請依下方第 N 節的資料扮演學生與教練。\n")
a("## 一、單元概況\n")
a(f"- 對象：{L['實施年級']}，{L['班級人數']} 人；場地：{'、'.join(L['場地'])}；每節 {L['每節分鐘']} 分鐘")
a("- 教學法：CLIL（4Cs）＋TPR（聽→做→說）")
a(f"- **新字詞**：{'、'.join(lg['新字詞'])}")
a(f"- **新句型**：{'；'.join(lg['新句型'])}")
a(f"- **接受性指令（學生只需聽懂並做動作）**：{'、'.join(lg.get('接受性指令', []))}")
a(f"- Language of learning：{'；'.join(lg['of'])}")
a(f"- Language for learning：{'；'.join(lg['for'])}")
a(f"- Language through learning：{'；'.join(lg['through'])}")
a("\n### 中英文使用時機")
for who in ("教師", "學生"):
    t = L["中英文使用時機"][who]; a(f"- {who}｜英文：{t['英文']}｜中文：{t['中文']}")
a("\n### 學生已學英語（Super Fun 1 全冊，學生英語上限）")
a("- 字詞：" + "、".join(P["字詞"])); a("- 句型：" + "；".join(P["句型"]))
a("\n## 二、模擬學生角色卡\n")
a("| 角色 | 程度 | 特徵 | 常見回應 | 常見狀況 |\n|---|---|---|---|---|")
for p in D["學生角色"]:
    a(f"| {p['id']}（{p['名']}） | {p['程度']} | {p['特徵']} | {' / '.join(p['常見回應'])} | {'、'.join(p['常見狀況'])} |")
for s, d in zip(L["節次"], D["節次"]):
    a(f"\n---\n\n## 第 {s['節']} 節：{s['主題']}\n")
    a(f"- 場地：{s.get('場地','')}；器材：{'、'.join(s.get('器材', []))}")
    a(f"- 複習：{'；'.join(s['複習'])}")
    a(f"- 生活情境：{d['生活情境']}\n")
    w = s["暖身"]
    a(f"### 教案要說的話\n\n**暖身（{s['暖身分鐘']} 分）**：{w['說明']}\n- 教師語句：{' / '.join(w['教師語句'])}")
    for p in s["活動"]:
        t = p["TPR流程"]
        a(f"\n**{p['名稱']}（{p['分鐘']} 分）**：{p['流程']}")
        a(f"- 教師語句：{' / '.join(p['教師語句'])}")
        a(f"- 學生回應：{' / '.join(p['學生回應'])}")
        a(f"- TPR：聽（{t['聽']}）→做（{t['做']}）→說（{t['說']}）")
        a(f"- 提醒：{p['提醒']}")
    a(f"\n**總結（{s['總結分鐘']} 分）**：{'；'.join(s['總結']['提問'])}｜Exit：{s['總結']['Exit']}")
    a("\n### 情境對話腳本\n")
    for sc in d["場景"]:
        a(f"**場景：{sc['名稱']}**（{sc['說明']}）\n")
        for l in sc["對話"]:
            tip = f"　〔{l['提示']}〕" if l["提示"] else ""
            zh = f"（{l['中文']}）" if l["中文"] else ""
            a(f"- {l['說話者']}：{l['英文']} {zh}{tip}")
        a("")
    a("### 教練重點\n" + "\n".join(f"- {x}" for x in d["教師重點"]))
    a("\n### 突發狀況（回合 4 隨機使用）\n" + "\n".join(f"- {x}" for x in d["突發狀況"]))
    a("\n### 預期較不熟悉（回合 0 先練）\n" + "\n".join(f"- {x}" for x in d["預期不熟悉"]))
out = ROOT / "備課教練專案" / f"知識_{unit}.md"
out.parent.mkdir(exist_ok=True); out.write_text("\n".join(o), encoding="utf8"); print("已輸出", out.name, len("\n".join(o)), "字元")
