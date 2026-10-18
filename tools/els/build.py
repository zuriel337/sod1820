#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» מהתבנית + הנתונים הדחוסים.
# ברירת-מחדל: public/tzofen.html + נכס טקסט-פסוקים דחוס, תוכן-ממוען ונטען לפי דרישה.
# אופליין:       --standalone-out <path> יוצר HTML יחיד ועצמאי בלי לשנות את פלט האתר.
import argparse
import base64
import gzip
import hashlib
import json
import os
import re
import tempfile


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(ROOT, "public", "tzofen.html")
ASSET_DIR = os.path.join(ROOT, "public", "els-data")
OWNED_ASSET = re.compile(r"^tk-vtext\.[0-9a-f]{16}\.gzdata$")


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def data(name):
    return read_text(os.path.join(DATA, name))


def gz64(value):
    """gzip → base64 (decoded in-browser with the native DecompressionStream)."""
    return base64.b64encode(gzip.compress(value.encode("utf-8"), 9, mtime=0)).decode("ascii")


def atomic_write(path, payload):
    """Replace one generated artifact only after its complete bytes are on disk."""
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{os.path.basename(path)}.", suffix=".tmp", dir=parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
        os.chmod(temporary, 0o644)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def remove_stale_owned_assets(current_name):
    """Remove only prior generator-owned payloads, never foreign files or directories."""
    removed = []
    for entry in sorted(os.scandir(ASSET_DIR), key=lambda item: item.name):
        if entry.name == current_name or not OWNED_ASSET.fullmatch(entry.name):
            continue
        if entry.is_dir(follow_symlinks=False):
            continue
        os.unlink(entry.path)  # A matching symlink is unlinked, never followed.
        removed.append(entry.name)
    return removed


STANDALONE_VERIFIER = r'''
  // Offline artifact adapter: replay browser-discovered candidates byte-for-byte against the
  // same embedded canonical corpus. It does not add a second discovery/search implementation.
  function standaloneVerifyBatch(payload){
    const scope=payload&&payload.scope,limit=scope==="tanakh"?N:scope==="torah"?TORAH_N:0;
    if(!limit)return {ok:false,error:"standalone_scope_invalid"};
    const corpusId=CORPUS_ID[scope];
    if(payload.corpus_id!==corpusId)return {ok:true,result:{status:"CORPUS_MISMATCH",corpus_id:corpusId}};
    const term=norm(payload.term||""),verified=[];
    for(const candidate of Array.isArray(payload.candidates)?payload.candidates:[]){
      let matches=term.length>=2&&Number.isInteger(candidate.skip)&&candidate.skip>=2&&
        (candidate.dir===1||candidate.dir===-1)&&Number.isInteger(candidate.start);
      for(let i=0;matches&&i<term.length;i++){
        const corpusIndex=candidate.start+candidate.dir*candidate.skip*i;
        if(corpusIndex<0||corpusIndex>=limit||T[corpusIndex]!==term[i])matches=false;
      }
      if(matches)verified.push({skip:candidate.skip,dir:candidate.dir,start:candidate.start});
    }
    return {ok:true,result:{status:"OK",corpus_id:corpusId,verified,offline:true},
      trace_id:"standalone-replay-"+scope+"-"+verified.length};
  }
'''.strip("\n")

STANDALONE_DISPATCH = (
    '    if(op==="verify_batch")return Promise.resolve(standaloneVerifyBatch(payload));\n'
    '    return Promise.resolve({ok:false,error:"standalone_operation_unsupported"});'
)


def load_inputs():
    template = read_text(os.path.join(HERE, "els-code.template.html"))
    ref_formatter_path = os.path.join(ROOT, "src", "lib", "presentation", "tanakhReferenceParts.js")
    ref_formatter = read_text(ref_formatter_path).replace("export function ", "function ")
    letters = data("tk-letters.txt")
    niqqud = data("niqqud-compact.txt")
    verse_lens = data("tk-vlens.txt").strip()
    verse_chapters = data("tk-vchap.txt").strip()
    verse_text_path = os.path.join(DATA, "tk-vtext.txt")
    with open(verse_text_path, "rb") as handle:
        verse_text = handle.read()
    with open(os.path.join(DATA, "tk-meta.json"), encoding="utf-8") as handle:
        books = ",".join(json.load(handle)["books"])
    logo = data("els-logo-b64.txt").strip()
    return {
        "template": template,
        "ref_formatter": ref_formatter,
        "letters": letters,
        "niqqud": niqqud,
        "verse_lens": verse_lens,
        "verse_chapters": verse_chapters,
        "verse_text": verse_text,
        "books": books,
        "logo": logo,
    }


def render(inputs, verse_asset_url, standalone=False):
    tk = inputs["letters"]
    corpus_tanakh = hashlib.sha256(tk.encode("utf-8")).hexdigest()
    corpus_torah = corpus_tanakh[:16]
    assert len(tk) == 1204583, "tk-letters.txt must be the canonical 1,204,583-letter stream"

    verse_text = inputs["verse_text"]
    replacements = {
        "__TORAH_DATA__": gz64(tk),
        "__NIQQUD_DATA__": gz64(inputs["niqqud"]),
        "__TANAKH_REFERENCE_FORMATTER__": inputs["ref_formatter"],
        "__VERSE_LENS__": inputs["verse_lens"],
        "__VERSE_CHAP__": inputs["verse_chapters"],
        "__VERSE_TEXT_ASSET__": verse_asset_url,
        "__VERSE_TEXT_SHA256__": hashlib.sha256(verse_text).hexdigest(),
        "__VERSE_TEXT_BYTES__": str(len(verse_text)),
        "__BOOK_NAMES__": inputs["books"],
        "__ELS_LOGO__": inputs["logo"],
        "__CORPUS_ID_TORAH__": corpus_torah,
        "__CORPUS_ID_TANAKH__": corpus_tanakh,
        "__STANDALONE_VERIFIER__": STANDALONE_VERIFIER if standalone else "",
        "__STANDALONE_ENGINE_DISPATCH__": STANDALONE_DISPATCH if standalone else "",
    }
    output = inputs["template"]
    for marker, value in replacements.items():
        output = output.replace(marker, value)
    unresolved = sorted(set(re.findall(r"__[A-Z0-9_]+__", output)))
    assert not unresolved, f"unresolved template markers: {', '.join(unresolved)}"
    return output.encode("utf-8")


def build_hosted(inputs, verse_gzip, asset_name):
    asset_url = f"/els-data/{asset_name}"
    html = render(inputs, asset_url, standalone=False)
    os.makedirs(ASSET_DIR, exist_ok=True)
    asset_path = os.path.join(ASSET_DIR, asset_name)

    atomic_write(asset_path, verse_gzip)
    assert gzip.decompress(verse_gzip) == inputs["verse_text"], "generated verse-text asset must round-trip byte-for-byte"
    with open(asset_path, "rb") as handle:
        assert handle.read() == verse_gzip, "generated verse-text asset bytes changed on disk"
    atomic_write(OUT, html)
    with open(OUT, "rb") as handle:
        assert handle.read() == html, "generated hosted HTML bytes changed on disk"

    # Cleanup is deliberately last: an unsuccessful build never prunes the last known assets.
    removed = remove_stale_owned_assets(asset_name)
    print("wrote", OUT, "| KB:", round(len(html) / 1024))
    print("wrote", asset_path, "| KB:", round(len(verse_gzip) / 1024), "| source sha256:", hashlib.sha256(inputs["verse_text"]).hexdigest())
    if removed:
        print("removed stale owned verse assets:", ", ".join(removed))


def build_standalone(inputs, verse_gzip, output_path):
    asset_data_url = "data:application/gzip;base64," + base64.b64encode(verse_gzip).decode("ascii")
    html = render(inputs, asset_data_url, standalone=True)
    output_path = os.path.abspath(output_path)
    atomic_write(output_path, html)
    with open(output_path, "rb") as handle:
        assert handle.read() == html, "generated standalone HTML bytes changed on disk"
    print("wrote standalone", output_path, "| KB:", round(len(html) / 1024), "| source sha256:", hashlib.sha256(inputs["verse_text"]).hexdigest())


def parse_args():
    parser = argparse.ArgumentParser(description="Build the hosted split ELS artifact or one opt-in offline standalone HTML.")
    parser.add_argument(
        "--standalone-out",
        metavar="PATH",
        help="write one self-contained offline HTML to PATH without changing public/tzofen.html or public/els-data",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    inputs = load_inputs()
    verse_text = inputs["verse_text"]
    verse_sha256 = hashlib.sha256(verse_text).hexdigest()
    verse_gzip = gzip.compress(verse_text, compresslevel=9, mtime=0)
    asset_name = f"tk-vtext.{verse_sha256[:16]}.gzdata"
    if args.standalone_out:
        build_standalone(inputs, verse_gzip, args.standalone_out)
    else:
        build_hosted(inputs, verse_gzip, asset_name)


if __name__ == "__main__":
    main()
