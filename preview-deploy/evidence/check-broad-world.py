import json, os, re
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

art = Path('/workspace/artifacts/2029-integrated-preview')
access_path = os.environ.get('BROAD_WORLD_ACCESS_FILE')
access = json.loads(Path(access_path).read_text()) if access_path else None
base = 'https://' + urlsplit(access['shareableUrl']).netloc if access else 'http://127.0.0.1:4178'
out = art / ('broad-hosted' if access else 'broad-local')
out.mkdir(exist_ok=True)
receipt = {'base': base, 'target': 'PREVIEW', 'cases': []}

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in (1440, 390):
        context = browser.new_context(viewport={'width': width, 'height': 960}, reduced_motion='reduce')
        page = context.new_page()
        page.set_default_timeout(45000)
        errors = []
        external_writes = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        def record(request):
            if request.method not in ('GET', 'HEAD', 'OPTIONS') and '/rest/v1/rpc/' not in request.url:
                external_writes.append({'method': request.method, 'path': urlsplit(request.url).path})
        page.on('request', record)
        if access:
            page.goto(access['shareableUrl'], wait_until='domcontentloaded')
            expect(page.get_by_role('heading', name='סיפור חדש. עומק של שנים.', exact=True)).to_be_visible()
        else:
            page.goto(base + '/world', wait_until='domcontentloaded')
        expect(page.get_by_role('heading', name='סיפור חדש. עומק של שנים.', exact=True)).to_be_visible()
        expect(page.locator('[data-world-discovery-door] .sod29-canonical-media-figure')).to_have_count(4)
        for img in page.locator('[data-world-discovery-door] img').all():
            img.scroll_into_view_if_needed()
            expect(img).to_be_visible()
            img.evaluate("i=>i.complete&&i.naturalWidth>0 ? Promise.resolve() : new Promise((resolve,reject)=>{i.addEventListener('load',resolve,{once:true});i.addEventListener('error',()=>reject(Error('Source image unavailable')),{once:true})})")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(out / f'world-{width}.png'), full_page=True)
        sources = page.locator('.sod29-world-source-home-grid')
        sources.locator('button[aria-controls="world-corpus-sod-hashmal"]').click()
        corpus = page.locator('#world-corpus-sod-hashmal')
        expect(corpus.locator('[data-experience-capability="corpus-full-source"]')).to_be_visible()
        assert len(corpus.locator('[data-experience-capability="corpus-full-source"]').inner_text()) > 200
        corpus_count = re.search(r'(\d+) מקורות זמינים', corpus.inner_text()).group(1)
        selector = corpus.get_by_role('combobox')
        first_count = selector.locator('option').count()
        assert first_count == 24
        corpus.get_by_role('button', name='עוד מקורות', exact=True).click()
        expect(selector.locator('option')).to_have_count(48)
        selector.select_option(index=1)
        expect(corpus.locator('[data-experience-capability="corpus-full-source"]')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(out / f'hashmal-{width}.png'))
        sources.locator('button[aria-controls="world-corpus-sod-hashmal"]').click()
        sources.locator('button[aria-controls="world-contributor-material"]').filter(has_text='צבי').click()
        contributor = page.locator('[data-experience-capability="contributor-findings-projection"]')
        expect(contributor.get_by_role('heading', name=re.compile('המקורות של צבי'))).to_be_visible()
        expect(contributor.locator('[data-experience-capability="contributor-source-finding-group"]')).to_have_count(1)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(out / f'tzvi-{width}.png'))
        sources.locator('button[aria-controls="world-contributor-material"]').filter(has_text='צבי').click()
        topic_section = page.locator('#world-all-convergences')
        topic_section.get_by_role('textbox', name='חיפוש בכל ההתכנסויות', exact=True).fill('1237')
        expect(topic_section.locator('a[href="/topic/1237"]')).to_be_visible()
        topic_section.locator('a[href="/topic/1237"]').click()
        expect(page).to_have_url(re.compile('/topic/1237'))
        page.go_back(wait_until='domcontentloaded')
        expect(page.get_by_role('heading', name='סיפור חדש. עומק של שנים.', exact=True)).to_be_visible()

        for witness in ('india-health', 'see-my-back', 'wall-clock', 'wisdom-methods'):
            door = page.locator(f'[data-world-discovery-door="{witness}"]')
            door.get_by_role('link', name='לפתוח את החיבור ←', exact=True).click()
            focus = page.locator(f'[data-discovery-witness="{witness}"]')
            expect(focus).to_be_visible()
            media_id = focus.get_attribute('data-source-identity')
            assert media_id
            page.reload(wait_until='domcontentloaded')
            expect(page.locator(f'[data-discovery-witness="{witness}"]')).to_be_visible()
            assert page.locator(f'[data-discovery-witness="{witness}"]').get_attribute('data-source-identity') == media_id
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.screenshot(path=str(out / f'{witness}-{width}.png'))

        page.get_by_role('button', name='נושאים מתוך ספריית המקורות', exact=True).click()
        depth = page.locator('#world-source-depth')
        depth.scroll_into_view_if_needed()
        expect(depth.get_by_role('heading', name='נושאים ומקורות', exact=True)).to_be_visible()
        expect(depth.locator('.sod29-world-subject-card').filter(has_text='סוד החשמל')).to_be_visible()
        depth.locator('.sod29-world-subject-card').filter(has_text='סוד החשמל').click()
        expect(depth.locator('.sod29-world-subject-works li').first).to_be_visible()
        assert 'אין עדיין קשר מתועד' in depth.inner_text()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')

        page.locator('#world-journey-entry').get_by_role('link', name='878 · לתוך המילוי של משיח', exact=True).click()
        expect(page.get_by_text('משיח → 878', exact=True)).to_be_visible()
        assert external_writes == []
        blocked = page.evaluate("""async()=>{const r=await fetch('https://linswmnnkjxvweumprav.supabase.co/rest/v1/research_paths',{method:'POST',body:'{}'});return {status:r.status,blocked:r.headers.get('X-Preview-Write-Blocked')}}""")
        assert blocked == {'status': 403, 'blocked': 'true'}
        assert errors == []
        case = {'width': width, 'sourceImages': 4, 'hashmalPublicSources': int(corpus_count), 'sourcePagination': [first_count, 48], 'tzvi': 'PASS', 'topic1237': 'PASS', 'readingReopenAfterReload': 'PASS', 'sourceCategoryNotTopic': 'PASS', 'number878': 'PASS', 'overflow': False, 'errors': errors, 'externalWritesBeforeGuardProbe': [], 'previewGuard': blocked}
        receipt['cases'].append(case)
        print(json.dumps(case, ensure_ascii=False), flush=True)
        context.close()
    browser.close()
(out / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
