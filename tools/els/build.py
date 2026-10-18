#!/usr/bin/env python3
# בונה את הכלי «הצופן התנכי» מהתבנית + הנתונים הדחוסים.
# ברירת-מחדל: public/tzofen.html + נכס טקסט-פסוקים דחוס, תוכן-ממוען ונטען לפי דרישה.
# אופליין:       --standalone-out <path> יוצר HTML יחיד ועצמאי בלי לשנות את פלט האתר.
import argparse
import base64
from contextlib import contextmanager
import fcntl
import gzip
import hashlib
import json
import os
import re
import secrets
import stat
import sys
import tempfile


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
REPO_ROOT_REAL = os.path.realpath(ROOT)
DATA = os.path.join(HERE, "data")
OUT = os.path.join(ROOT, "public", "tzofen.html")
ASSET_DIR = os.path.join(ROOT, "public", "els-data")
EXPECTED_LETTER_COUNT = 1_204_583
EXPECTED_VERSE_COUNT = 23_204
TEST_FAIL_PHASE_ENV = "SOD1820_ELS_TEST_FAIL_PHASE"
TEST_PAUSE_PHASE_ENV = "SOD1820_ELS_TEST_PAUSE_PHASE"
DIRECTORY_OPEN_FLAGS = (
    os.O_RDONLY
    | getattr(os, "O_DIRECTORY", 0)
    | getattr(os, "O_NOFOLLOW", 0)
    | getattr(os, "O_CLOEXEC", 0)
)


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def data(name):
    return read_text(os.path.join(DATA, name))


def gz64(value):
    """gzip → base64 (decoded in-browser with the native DecompressionStream)."""
    return base64.b64encode(gzip.compress(value.encode("utf-8"), 9, mtime=0)).decode("ascii")


def test_checkpoint(phase):
    """Private process-test hook; inert unless a test-only environment variable is set."""
    if os.environ.get(TEST_PAUSE_PHASE_ENV) == phase:
        print(f"ELS_TEST_CHECKPOINT {phase}", flush=True)
        if not sys.stdin.buffer.read(1):
            raise RuntimeError(f"test checkpoint {phase} lost its controller")
    if os.environ.get(TEST_FAIL_PHASE_ENV) == phase:
        raise RuntimeError(f"injected ELS build failure at {phase}")


def atomic_write(path, payload, *, before_replace_phase=None, create_parent=False):
    """Replace one generated artifact only after its complete bytes are on disk."""
    parent = os.path.dirname(os.path.abspath(path))
    if create_parent:
        os.makedirs(parent, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{os.path.basename(path)}.", suffix=".tmp", dir=parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
        os.chmod(temporary, 0o644)
        if before_replace_phase:
            test_checkpoint(before_replace_phase)
        os.replace(temporary, path)
    finally:
        if os.path.lexists(temporary):
            os.unlink(temporary)


def path_is_within(path, parent):
    try:
        return os.path.commonpath((path, parent)) == parent
    except ValueError:
        return False


def open_directory_no_symlinks(absolute_path):
    """Bind an absolute directory one component at a time without following links."""
    if not os.path.isabs(absolute_path):
        raise ValueError("directory path must be absolute")
    descriptor = os.open(os.sep, DIRECTORY_OPEN_FLAGS)
    try:
        for component in absolute_path.split(os.sep):
            if not component or component == ".":
                continue
            next_descriptor = os.open(component, DIRECTORY_OPEN_FLAGS, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = next_descriptor
        return descriptor
    except Exception:
        os.close(descriptor)
        raise


def directory_fd_is_within(candidate_fd, root_fd):
    """Check ancestry using only bound directory descriptors and inode identities."""
    root_metadata = os.fstat(root_fd)
    root_identity = (root_metadata.st_dev, root_metadata.st_ino)
    cursor = os.dup(candidate_fd)
    seen = set()
    try:
        while True:
            metadata = os.fstat(cursor)
            identity = (metadata.st_dev, metadata.st_ino)
            if identity == root_identity:
                return True
            if identity in seen:
                raise RuntimeError("directory ancestry cycle while validating standalone output")
            seen.add(identity)
            parent = os.open("..", DIRECTORY_OPEN_FLAGS, dir_fd=cursor)
            try:
                parent_metadata = os.fstat(parent)
                parent_identity = (parent_metadata.st_dev, parent_metadata.st_ino)
            except Exception:
                os.close(parent)
                raise
            if parent_identity == identity:
                os.close(parent)
                return False
            os.close(cursor)
            cursor = parent
    finally:
        os.close(cursor)


@contextmanager
def standalone_destination(output_path):
    """Bind one create-new external destination until publication is complete."""
    if not output_path or "\x00" in output_path:
        raise ValueError("standalone output path is empty or invalid")
    raw_absolute = output_path if os.path.isabs(output_path) else os.path.join(os.getcwd(), output_path)
    parent_path, basename = os.path.split(raw_absolute)
    if not basename or basename in {".", ".."}:
        raise ValueError("standalone output must name a new file")

    try:
        parent_fd = open_directory_no_symlinks(parent_path)
    except OSError as error:
        raise ValueError("standalone output parent must be an existing real directory without symlinks") from error
    try:
        repo_fd = open_directory_no_symlinks(REPO_ROOT_REAL)
        try:
            if directory_fd_is_within(parent_fd, repo_fd):
                raise ValueError("standalone output must be outside the entire repository root")
        finally:
            os.close(repo_fd)

        try:
            os.stat(basename, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            raise ValueError("standalone output is create-new and refuses to overwrite any entry")

        test_checkpoint("standalone_parent_bound")
        yield {"parent_fd": parent_fd, "basename": basename}
    finally:
        os.close(parent_fd)


def atomic_create_at(destination, payload):
    """Publish complete bytes create-new through one held parent directory descriptor."""
    parent_fd = destination["parent_fd"]
    basename = destination["basename"]
    temporary = None
    for _ in range(128):
        candidate = f".{basename}.{os.getpid()}.{secrets.token_hex(8)}.tmp"
        flags = (
            os.O_WRONLY
            | os.O_CREAT
            | os.O_EXCL
            | getattr(os, "O_NOFOLLOW", 0)
            | getattr(os, "O_CLOEXEC", 0)
        )
        try:
            descriptor = os.open(candidate, flags, 0o600, dir_fd=parent_fd)
        except FileExistsError:
            continue
        temporary = candidate
        break
    if temporary is None:
        raise RuntimeError("could not allocate standalone temporary file")

    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fchmod(handle.fileno(), 0o644)
            os.fsync(handle.fileno())
        test_checkpoint("before_standalone_publish")
        os.link(
            temporary,
            basename,
            src_dir_fd=parent_fd,
            dst_dir_fd=parent_fd,
            follow_symlinks=False,
        )
        os.unlink(temporary, dir_fd=parent_fd)
        temporary = None

        verify_flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
        verify_fd = os.open(basename, verify_flags, dir_fd=parent_fd)
        try:
            metadata = os.fstat(verify_fd)
            if not stat.S_ISREG(metadata.st_mode):
                raise RuntimeError("standalone output is not a regular file")
            with os.fdopen(verify_fd, "rb", closefd=False) as handle:
                if handle.read() != payload:
                    raise RuntimeError("generated standalone HTML bytes changed on disk")
        finally:
            os.close(verify_fd)
    finally:
        if temporary is not None:
            try:
                os.unlink(temporary, dir_fd=parent_fd)
            except FileNotFoundError:
                pass


@contextmanager
def hosted_publish_lock():
    """Serialize the complete hosted publish transaction across processes."""
    hosted_directory = os.path.realpath(os.path.dirname(OUT))
    scope = hashlib.sha256(hosted_directory.encode("utf-8")).hexdigest()
    lock_directory = os.path.join(tempfile.gettempdir(), f"sod1820-els-publish-locks-{os.getuid()}")
    try:
        os.mkdir(lock_directory, 0o700)
    except FileExistsError:
        lock_metadata = os.lstat(lock_directory)
        if not stat.S_ISDIR(lock_metadata.st_mode) or stat.S_ISLNK(lock_metadata.st_mode):
            raise RuntimeError("ELS publish lock directory is not a real directory")
    lock_path = os.path.join(lock_directory, f"{scope}.lock")
    if path_is_within(os.path.realpath(lock_path), hosted_directory):
        raise RuntimeError("ELS publish lock must stay outside the deployed public tree")
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(lock_path, flags, 0o600)
    try:
        lock_metadata = os.fstat(descriptor)
        if not stat.S_ISREG(lock_metadata.st_mode):
            raise RuntimeError("ELS publish lock artifact is not a regular file")
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
    finally:
        os.close(descriptor)


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
        books = json.load(handle)["books"]
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


def validate_source_inputs(inputs):
    """Enforce the source invariants that the browser requires before publication."""
    letters = inputs["letters"]
    if len(letters) != EXPECTED_LETTER_COUNT:
        raise ValueError("tk-letters.txt must be the canonical 1,204,583-letter stream")

    verse_lens_text = inputs["verse_lens"]
    if not re.fullmatch(r"[0-9]+(?:,[0-9]+)*", verse_lens_text):
        raise ValueError("tk-vlens.txt must be a strict comma-separated integer list")
    verse_lens = [int(value) for value in verse_lens_text.split(",")]
    if len(verse_lens) != EXPECTED_VERSE_COUNT or any(length <= 0 for length in verse_lens):
        raise ValueError("tk-vlens.txt must declare exactly 23,204 positive verse lengths")
    if sum(verse_lens) != len(letters):
        raise ValueError("tk-vlens.txt must align exactly with the canonical letter stream")

    chapter_text = inputs["verse_chapters"]
    if not re.fullmatch(r"[0-9]+(?:,[0-9]+)*(?:\|[0-9]+(?:,[0-9]+)*)*", chapter_text):
        raise ValueError("tk-vchap.txt must be a strict book/chapter integer index")
    chapter_books = [[int(value) for value in book.split(",")] for book in chapter_text.split("|")]
    if any(count <= 0 for book in chapter_books for count in book):
        raise ValueError("tk-vchap.txt chapter counts must be positive")
    if len(chapter_books) != len(inputs["books"]) or sum(map(sum, chapter_books)) != len(verse_lens):
        raise ValueError("tk-vchap.txt and tk-meta.json must align with tk-vlens.txt")

    verse_bytes = inputs["verse_text"]
    try:
        verse_text = verse_bytes.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("tk-vtext.txt must be strict UTF-8") from error
    if not verse_text.endswith("\n"):
        raise ValueError("tk-vtext.txt must end with one LF-delimited final verse")
    if "\r" in verse_text or "\x00" in verse_text:
        raise ValueError("tk-vtext.txt must use LF delimiters and contain no NUL bytes")
    rows = verse_text.split("\n")
    if rows[-1] != "" or len(rows) != len(verse_lens) + 1:
        raise ValueError("tk-vtext.txt row count must align exactly with tk-vlens.txt")
    for index, (row, expected_letters) in enumerate(zip(rows[:-1], verse_lens), start=1):
        if not row or len(re.sub(r"[^א-ת]", "", row)) < expected_letters:
            raise ValueError(f"tk-vtext.txt verse {index} is shorter than its tk-vlens.txt alignment")


def render(inputs, verse_asset_url, standalone=False):
    tk = inputs["letters"]
    corpus_tanakh = hashlib.sha256(tk.encode("utf-8")).hexdigest()
    corpus_torah = corpus_tanakh[:16]

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
        "__BOOK_NAMES__": ",".join(inputs["books"]),
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
    asset_path = os.path.join(ASSET_DIR, asset_name)
    if gzip.decompress(verse_gzip) != inputs["verse_text"]:
        raise RuntimeError("generated verse-text asset must round-trip byte-for-byte")

    with hosted_publish_lock():
        test_checkpoint("lock_acquired")
        os.makedirs(ASSET_DIR, exist_ok=True)
        atomic_write(
            asset_path,
            verse_gzip,
            before_replace_phase="before_asset_replace",
        )
        with open(asset_path, "rb") as handle:
            if handle.read() != verse_gzip:
                raise RuntimeError("generated verse-text asset bytes changed on disk")
        test_checkpoint("between_asset_and_html")
        atomic_write(OUT, html)
        with open(OUT, "rb") as handle:
            if handle.read() != html:
                raise RuntimeError("generated hosted HTML bytes changed on disk")
        test_checkpoint("after_html_publish")
    print("wrote", OUT, "| KB:", round(len(html) / 1024))
    print("wrote", asset_path, "| KB:", round(len(verse_gzip) / 1024), "| source sha256:", hashlib.sha256(inputs["verse_text"]).hexdigest())


def build_standalone(inputs, verse_gzip, destination):
    asset_data_url = "data:application/gzip;base64," + base64.b64encode(verse_gzip).decode("ascii")
    html = render(inputs, asset_data_url, standalone=True)
    atomic_create_at(destination, html)
    print("wrote standalone", destination["basename"], "through bound external directory | KB:", round(len(html) / 1024), "| source sha256:", hashlib.sha256(inputs["verse_text"]).hexdigest())


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

    def prepare_payload():
        inputs = load_inputs()
        validate_source_inputs(inputs)
        test_checkpoint("inputs_validated")
        verse_text = inputs["verse_text"]
        verse_sha256 = hashlib.sha256(verse_text).hexdigest()
        verse_gzip = gzip.compress(verse_text, compresslevel=9, mtime=0)
        return inputs, verse_gzip, f"tk-vtext.{verse_sha256[:16]}.gzdata"

    if args.standalone_out:
        with standalone_destination(args.standalone_out) as destination:
            inputs, verse_gzip, _ = prepare_payload()
            build_standalone(inputs, verse_gzip, destination)
        return

    inputs, verse_gzip, asset_name = prepare_payload()
    build_hosted(inputs, verse_gzip, asset_name)


if __name__ == "__main__":
    main()
