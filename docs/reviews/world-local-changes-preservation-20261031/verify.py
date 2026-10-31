#!/usr/bin/env python3
"""Verify this preservation commit and reconstruct its eight-file delta."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

DOC = "docs/reviews/world-local-changes-preservation-20261031"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".")
    ap.add_argument("--ref", default="HEAD")
    args = ap.parse_args()
    def git(*argv):
        return subprocess.check_output(["git", "-C", args.repo, *argv])
    def blob(ref, path):
        return git("show", ref + ":" + path)
    def sha(raw):
        return hashlib.sha256(raw).hexdigest()
    manifest = json.loads(blob(args.ref, DOC + "/manifest.json"))
    base = manifest["source_base_sha"]
    parents = git("show", "-s", "--format=%P", args.ref).decode().split()
    assert parents == [base], parents
    assert git("rev-parse", base + "^{tree}").decode().strip() == manifest["source_base_tree"]
    records = manifest["records"]
    assert len(records) == 9 and sum(r["kind"] == "uncommitted_tracked_file" for r in records) == 8
    expected = {r["stored_path"] for r in records} | {DOC + "/" + f for f in
        ["README.md", "manifest.json", "changes.patch", "secret-scope-review.json", "verify.py"]}
    changed = set(git("diff", "--name-only", base, args.ref).decode().splitlines())
    assert changed == expected, {"unexpected": sorted(changed - expected), "missing": sorted(expected - changed)}
    patch = blob(args.ref, manifest["patch_path"])
    assert sha(patch) == manifest["patch_sha256"]
    rows = []
    with tempfile.TemporaryDirectory(prefix="world-preservation-restore-") as directory:
        root = Path(directory)
        for record in records:
            path = record["stored_path"]
            current = blob(args.ref, path)
            assert sha(current) == record["snapshot_sha256"], path
            assert git("rev-parse", args.ref + ":" + path).decode().strip() == record["snapshot_git_blob"], path
            mode = git("ls-tree", args.ref, "--", path).decode().split()[0]
            assert mode == record["mode"], path
            if record["kind"] == "uncommitted_tracked_file":
                original = blob(base, record["source_path"])
                assert sha(original) == record["base_sha256"], path
                assert git("rev-parse", base + ":" + path).decode().strip() == record["base_git_blob"]
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(original)
                target.chmod(0o755 if record["mode"] == "100755" else 0o644)
                rows.append(record)
        patch_file = root / "restore.patch"
        patch_file.write_bytes(patch)
        subprocess.run(["git", "apply", "--check", str(patch_file)], cwd=root, check=True, capture_output=True)
        subprocess.run(["git", "apply", str(patch_file)], cwd=root, check=True, capture_output=True)
        for record in rows:
            assert sha((root / record["source_path"]).read_bytes()) == record["snapshot_sha256"], record["source_path"]
    scan = json.loads(blob(args.ref, DOC + "/secret-scope-review.json"))
    assert scan["findings"] == [] and scan["scanned_original_files"] == 9
    print(json.dumps({"status": "PASS", "head": git("rev-parse", args.ref).decode().strip(),
        "base": base, "tracked_files_restored_exactly": len(rows), "historical_evidence_files": 1,
        "exact_changed_path_allowlist": len(changed), "product_tests": "NOT_RUN"}))

if __name__ == "__main__":
    main()
