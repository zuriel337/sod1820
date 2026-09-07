from pathlib import Path
import gzip, json

root = Path(__file__).resolve().parents[1]
records = []

first = json.loads((root / 'pages' / 'P01_04.json').read_text('utf-8'))
records.extend(first['pages'])

for name in ['P05_08.json.gz','P09_12.json.gz','P13_16.json.gz','P17_20.json.gz','P21_24.json.gz']:
    with gzip.open(root / 'chunks' / name, 'rt', encoding='utf-8') as f:
        records.extend(json.load(f)['pages'])

records.sort(key=lambda d: d['pdf_page'])
assert [d['pdf_page'] for d in records] == list(range(1, 25))
for d in records:
    i = d['pdf_page']
    assert d['source_ref'] == f'book:sefer-habahir-1883#p{i}:page'
    for k in ['input','extraction','finding','claim','provenance']:
        assert k in d
    assert d['input']['visual_render_verified'] is True
    assert d['provenance']['pdf_page'] == i
    assert d['provenance']['canonical_source'] == 'gallery/Book/Sefer_HaBahir_1883.pdf'
    assert d['provenance']['ocr_role'] == 'helper_only'
    assert d['provenance']['secondary_witness_used'] is False
    for block in d['input']['blocks']:
        assert block['source_ref'].startswith(f'book:sefer-habahir-1883#p{i}:')

coverage = json.loads((root / 'coverage.json').read_text('utf-8'))
assert coverage['expected_pages'] == list(range(1,25))
assert coverage['render_verified_pages'] == 24
assert coverage['structured_pages'] == 24
assert coverage['out_of_scope_pages_written'] == 0
print('PASS scan-a: 24 pages, exact scope 1..24, required layers/source_ref/provenance present')
