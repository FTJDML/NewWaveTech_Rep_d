#!/usr/bin/env python3
"""Extract the framework (Workflow Skills, gates, module cards) from the CGI AI-Native DCS Academy
participant guides (docx) into public/data/skills.json.

Usage:  python3 -I tools/build-skills.py "<folder with the M*_Participant_Guide*.docx files>" public/data/skills.json

The text of every prompt is copied verbatim. The only transformation: the paragraph that starts with
"Workshop output discipline —" is moved out of the prompt body into a separate `discipline` field and a
{{DISCIPLINE}} token is left in its place (so the app can switch it on/off).
"""
import sys, re, json, glob, os
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

def iter_block(doc):
    for ch in doc.element.body.iterchildren():
        if ch.tag.endswith('}p'):
            yield Paragraph(ch, doc)
        elif ch.tag.endswith('}tbl'):
            yield Table(ch, doc)

def cell_text(cell):
    return "\n".join(p.text for p in cell.paragraphs).strip()

def blocks(path):
    doc = Document(path)
    out = []
    for b in iter_block(doc):
        if isinstance(b, Paragraph):
            t = b.text.strip()
            if t:
                out.append(("P", t))
        else:
            rows = b.rows
            if len(rows) == 1 and len(rows[0].cells) == 1:
                out.append(("BOX", cell_text(rows[0].cells[0])))
            else:
                tbl = []
                for r in rows:
                    seen, cells = [], []
                    for c in r.cells:
                        if c._tc in seen:
                            continue
                        seen.append(c._tc)
                        cells.append(cell_text(c))
                    tbl.append(cells)
                out.append(("TABLE", tbl))
    return out

DISC = re.compile(r"^Workshop output discipline —.*$", re.M)

def split_discipline(text):
    m = DISC.search(text)
    if not m:
        return text, ""
    disc = m.group(0).strip()
    body = text[:m.start()] + "{{DISCIPLINE}}" + text[m.end():]
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip(), disc

def parse_guide(path):
    bl = blocks(path)
    mod = {}
    # header
    first = bl[0][1]
    m = re.match(r"MODULE (\d+) · (\w+) · (\d+) MINUTES", first)
    mod["num"] = int(m.group(1)); mod["stageName"] = m.group(2).title(); mod["minutes"] = int(m.group(3))
    mod["title"] = bl[1][1]
    # find index of Appendix A / B
    idxA = next(i for i, (k, v) in enumerate(bl) if k == "P" and v.startswith("Appendix A"))
    idxB = next(i for i, (k, v) in enumerate(bl) if k == "P" and v.startswith("Appendix B"))
    # ---- card part
    i = 2
    # stage strip table
    if bl[i][0] == "TABLE": i += 1
    aur = bl[i][1]; i += 1
    mq = re.match(r"Aurelia, the demo: (.*?) · \"(.*)\"$", aur)
    mod["moment"] = mq.group(1) if mq else ""
    mod["question"] = mq.group(2) if mq else aur
    mod["intro"] = bl[i][1]; i += 1
    assert bl[i][1].startswith("Do it"), bl[i]
    i += 1
    steps = []
    for r in bl[i][1][1:]:
        steps.append({"n": r[0], "min": r[1], "do": r[2], "paste": r[3] if len(r) > 3 else ""})
    mod["steps"] = steps
    i += 1
    # Before the gate line
    if bl[i][0] == "P" and bl[i][1].startswith("Before the gate"):
        mod["beforeGate"] = bl[i][1]; i += 1
    good, stuck, cur = [], [], None
    notTender = ""; leave = ""
    page2 = {}
    j = i
    while j < idxA:
        k, v = bl[j]
        if k == "P" and v == "Good looks like": cur = good
        elif k == "P" and v == "Stuck?": cur = stuck
        elif k == "BOX" and v.startswith("NOT A TENDER"):
            notTender = v.split("\n", 1)[1].strip() if "\n" in v else ""; cur = None
        elif k == "P" and v.startswith("You leave with:"):
            leave = v[len("You leave with:"):].strip(); cur = None
        elif k == "P" and v.startswith("MY PAGE"):
            cur = None; page2["start"] = j
        elif k == "P" and v.startswith("Workflow moment"):
            page2["momentHeading"] = v
            page2["momentQuestion"] = bl[j + 1][1]
            tb = bl[j + 2][1]
            page2["momentRows"] = [r[0] for r in tb[1:]]
            page2["momentCols"] = tb[0][1:] if len(tb[0]) > 1 else []
        elif k == "P" and v.startswith("Use this one, or write your own"):
            page2["firstStepSuggestion"] = v[len("Use this one, or write your own:"):].strip().lstrip("☐ ").strip()
        elif k == "P" and v.startswith("My guess, then the blind score"):
            page2["guessTable"] = True
        elif cur is not None and k == "P" and not v.startswith("More help"):
            cur.append(v)
        j += 1
    mod["good"] = good; mod["stuck"] = stuck; mod["notATender"] = notTender; mod["leaveWith"] = leave
    mod["page2"] = {k: v for k, v in page2.items() if k != "start"}
    # ---- Appendix A
    prompts = []
    j = idxA + 1
    pending = None
    intro_lines = []
    while j < idxB:
        k, v = bl[j]
        if k == "P":
            mh = re.match(r"^(P\d) · (.*)$", v)
            if mh:
                pending = {"id": mh.group(1), "title": mh.group(2), "how": []}
                prompts.append(pending)
            elif v.startswith("The gate — closes every module"):
                pending = {"id": "GATE", "title": "The gate — closes every module", "how": []}
                prompts.append(pending)
            elif pending is not None:
                pending["how"].append(v)
            else:
                intro_lines.append(v)
        elif k == "BOX":
            if pending is None:
                intro_lines.append(v)
            else:
                body, disc = split_discipline(v)
                pending["text"] = body
                pending["discipline"] = disc
        j += 1
    mod["appendixAIntro"] = intro_lines
    mod["prompts"] = [p for p in prompts if "text" in p]
    # ---- Appendix B: collect boxes + tables
    helpB = []
    j = idxB + 1
    while j < len(bl):
        k, v = bl[j]
        if k == "BOX":
            title, _, body = v.partition("\n")
            helpB.append({"title": title.strip(), "body": body.strip()})
        elif k == "TABLE":
            helpB.append({"table": v})
        elif k == "P":
            helpB.append({"heading": v})
        j += 1
    mod["appendixB"] = helpB
    return mod

def main():
    folder, out = sys.argv[1], sys.argv[2]
    mods = {}
    for p in sorted(glob.glob(os.path.join(folder, "M*_Participant_Guide*.docx"))):
        m = parse_guide(p)
        mods["M%d" % m["num"]] = m
    json.dump({"source": "CGI AI-Native DCS Academy participant guides v4.0 (9 Nov 2026), M0–M9", "modules": mods},
              open(out, "w"), ensure_ascii=False, indent=1)
    print("modules:", ", ".join(sorted(mods, key=lambda s: int(s[1:]))))
    for k in sorted(mods, key=lambda s: int(s[1:])):
        print(k, [(p["id"], len(p["text"]), bool(p["discipline"])) for p in mods[k]["prompts"]])

main()
