"""Checked compressed representation must preserve exactly the canonical source bytes."""
import ast
import base64
import gzip
from pathlib import Path
import unittest
import zlib

source = Path(__file__).resolve().parents[1] / "tools/els/build.py"
function = next(n for n in ast.parse(source.read_text()).body if isinstance(n, ast.FunctionDef) and n.name == "gz64")
namespace = {"base64": base64, "gzip": gzip, "zlib": zlib}
exec(compile(ast.Module(body=[function], type_ignores=[]), str(source), "exec"), namespace)
gz64 = namespace["gz64"]


class Encoding(unittest.TestCase):
    def test_cross_platform_header_is_kept_only_for_identical_source(self):
        value = "אותיות המקור נשמרות"
        encoded = bytearray(base64.b64decode(gz64(value)))
        encoded[9] = 255 if encoded[9] != 255 else 3
        other_platform = base64.b64encode(encoded).decode()
        self.assertEqual(gz64(value, other_platform), other_platform)
        new = gz64("מקור אחר", other_platform)
        self.assertNotEqual(new, other_platform)
        self.assertEqual(gzip.decompress(base64.b64decode(new)).decode(), "מקור אחר")

    def test_invalid_base64_header_deflate_and_truncation_are_not_retained(self):
        plain = "תורה"
        original = bytearray(base64.b64decode(gz64(plain)))
        damaged = original.copy()
        damaged[10] ^= 255
        for bad in ["not base64", base64.b64encode(damaged).decode(), base64.b64encode(original[:12]).decode()]:
            restored = gz64(plain, bad)
            self.assertNotEqual(restored, bad)
            self.assertEqual(gzip.decompress(base64.b64decode(restored)).decode(), plain)


if __name__ == "__main__":
    unittest.main()
