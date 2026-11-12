#!/usr/bin/env python3
"""Provenance check: every prompt in public/data/skills.json must equal a text box of the original guide
(apart from the {{DISCIPLINE}} token that stands for the "Workshop output discipline" paragraph).

Usage: python3 -I tools/verify-skills.py "<folder with the guides>" public/data/skills.json
"""
import sys, json, glob, os, re
from docx import Document

def boxes(path):
    d = Document(path)
    out = []
    for t in d.tables:
        if len(t.rows) == 1 and len(t.rows[0].cells) == 1:
            out.append("\n".join(p.text for p in t.rows[0].cells[0].paragraphs).strip())
    return out

folder, jpath = sys.argv[1], sys.argv[2]
data = json.load(open(jpath))["modules"]
bad = 0
total = 0
for k, m in data.items():
    if m.get("reconstructed"):
        continue
    f = glob.glob(os.path.join(folder, "%s_Participant_Guide*.docx" % k))[0]
    bx = boxes(f)
    for p in m["prompts"]:
        total += 1
        rebuilt = p["text"].replace("{{DISCIPLINE}}", p.get("discipline", ""))
        rebuilt = re.sub(r"\n{3,}", "\n\n", rebuilt).strip()
        ok = any(re.sub(r"\n{3,}", "\n\n", b).strip() == rebuilt for b in bx)
        if not ok:
            bad += 1
            print("MISMATCH", k, p["id"])
print("checked", total, "prompts;", "all identical to the guides" if not bad else "%d mismatches" % bad)
sys.exit(1 if bad else 0)
