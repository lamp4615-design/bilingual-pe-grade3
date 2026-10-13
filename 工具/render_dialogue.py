#!/usr/bin/env python3
"""把備課對話 JSON 轉成 Markdown。用法：python 工具/render_dialogue.py 對話練習/接力賽_對話.json"""
import json, sys, pathlib
f = pathlib.Path(sys.argv[1]); D = json.load(open(f, encoding="utf8"))
o = [f"# {D['單元']}｜備課對話練習\n", "## 模擬學生角色\n", "| 角色 | 程度 | 特徵 | 常見回應 | 常見狀況 |\n|---|---|---|---|---|"]
for p in D["學生角色"]:
    o.append(f"| {p['id']}（{p['名']}） | {p['程度']} | {p['特徵']} | {' / '.join(p['常見回應'])} | {'、'.join(p['常見狀況'])} |")
for s in D["節次"]:
    o.append(f"\n---\n\n## 第 {s['節']} 節　{s['主題']}\n\n**生活情境**：{s['生活情境']}\n")
    for sc in s["場景"]:
        o.append(f"### {sc['名稱']}\n\n{sc['說明']}\n\n| 誰 | English | 中文 | 提示 |\n|---|---|---|---|")
        for l in sc["對話"]:
            o.append(f"| {l['說話者']} | {l['英文']} | {l['中文']} | {l['提示']} |")
        o.append("")
    o.append("**教師重點**\n" + "\n".join(f"- {x}" for x in s["教師重點"]))
    o.append("\n**突發狀況（回合 4 練習）**\n" + "\n".join(f"- {x}" for x in s["突發狀況"]))
    o.append("\n**預期較不熟悉（先練）**：" + "；".join(s["預期不熟悉"]))
out = f.with_suffix(".md"); out.write_text("\n".join(o), encoding="utf8"); print("已輸出", out.name)
