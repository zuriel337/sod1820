import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('/tmp/global-living-ribbon-2029')
OUT.mkdir(exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in (320, 390, 1440):
        for theme in ('light', 'parchment', 'dark'):
            context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
            context.add_init_script(f"localStorage.setItem('sod-theme', '{theme}')")
            page = context.new_page()
            errors = []
            model_calls = []
            writes = []
            page.on('request', lambda request: model_calls.append(request.url) if any(name in request.url for name in ('ai-analyze', 'research-run', 'wa-raziel')) else None)
            page.on('request', lambda request: writes.append(request.url) if request.method in ('PUT', 'PATCH', 'DELETE') else None)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1:5187/') else route.abort())
            page.goto('http://127.0.0.1:5187/2029', wait_until='domcontentloaded')
            ribbon = page.locator('.sod29-living-ribbon')
            ribbon.wait_for(timeout=30000)
            page.locator('.sod29-living-mobile .sod29-living-item' if width < 701 else '.sod29-living-desktop .sod-mq-track .sod29-living-item').first.wait_for(timeout=30000)
            assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            pause = ribbon.get_by_role('button', name='השהה תנועה')
            box = pause.bounding_box()
            assert box and box['width'] >= 44 and box['height'] >= 44
            pause.click()
            assert ribbon.get_by_role('button', name='המשך תנועה').count() == 1
            page.evaluate('window.scrollTo(0, 600)')
            page.wait_for_timeout(200)
            assert page.evaluate('window.scrollY') > 100
            rb = ribbon.bounding_box()
            header = page.locator('.sod29-header').bounding_box()
            assert rb and header and abs(rb['y'] - (header['y'] + header['height'])) <= 14
            assert rb['y'] >= 0 and rb['y'] + rb['height'] < 200
            page.screenshot(path=str(OUT / f'{width}-{theme}.png'))
            ribbon.screenshot(path=str(OUT / f'ribbon-{width}-{theme}.png'))
            ribbon.get_by_role('button', name='צמצם את פס הגילויים').click()
            ribbon.get_by_role('button', name='הרחב את פס הגילויים').click()
            assert ribbon.get_by_role('button', name='השהה תנועה').count() == 1 or ribbon.get_by_role('button', name='המשך תנועה').count() == 1
            if width >= 701:
                assert ribbon.locator('.sod-mq-track [aria-hidden=true] button[tabindex="-1"]').count() > 0
            item = ribbon.locator('.sod29-living-mobile .sod29-living-item' if width < 701 else '.sod29-living-desktop .sod-mq-track .sod29-living-item').first
            item.click()
            detail = page.get_by_role('region', name='המסר המלא')
            detail.wait_for(timeout=10000)
            text = detail.inner_text()
            expected = ["הקדוש ברוך הוא מסדר, ואם המדינה תגיע למצב עוד יותר קטסטרופלי, זה רצון השם שיהיה יותר קטסטרופלי לפני שאני מביא את הגאולה.", "שיהיה יותר חושך. למה? כי ככה גאולה שהיא אור תהיה ניכרת יותר.", "'כי שחה לעפר נפשנו, דבקה לארץ בטננו'.", "כשהמצב יהיה רק הכי גרוע, אז 'קומה עזרתה לנו ופדנו למען חסדך'."]
            assert all(part in text for part in expected)
            assert 'תהילים מ״ד' in text
            assert not errors, errors
            assert not model_calls and not writes
            if width == 320 and theme == 'light':
                projection = page.evaluate("""async () => { const m = await import('/src/components/experience2029/GlobalLivingRibbon2029.jsx'); return m.livingRibbonItems([{id:'post',title:'פוסט',kind:'source',href:'/post/example'},{id:'topic',title:'נושא',kind:'convergence',href:'/topic/example'},{id:'private',title:'פרטי',href:'/admin/secrets'}],null).map(x => ({id:x.id,type:x.typeLabel})); }""")
                assert projection == [{'id':'feed:post','type':'דופק העולם'}, {'id':'feed:topic','type':'רצף החיבורים'}]
            results.append({'width': width, 'theme': theme, 'detail': True, 'overflow': False})
            context.close()
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='no-preference')
    page = context.new_page()
    page.route('**/*', lambda route: route.continue_() if route.request.url.startswith('http://127.0.0.1:5187/') else route.abort())
    page.goto('http://127.0.0.1:5187/2029', wait_until='domcontentloaded')
    track = page.locator('.sod29-living-desktop .sod-mq-track')
    track.wait_for(timeout=30000)
    page.mouse.move(700, 500)
    before = track.evaluate("e => getComputedStyle(e).transform")
    page.wait_for_timeout(800)
    after = track.evaluate("e => getComputedStyle(e).transform")
    assert before != after, 'desktop marquee must move in normal motion'
    page.locator('.sod29-living-desktop .sod-mq-track button').first.focus()
    page.wait_for_function("() => getComputedStyle(document.querySelector('.sod29-living-desktop .sod-mq-track')).animationPlayState === 'paused'", timeout=3000)
    context.close()
    context = browser.new_context(viewport={'width': 390, 'height': 900})
    page = context.new_page()
    page.route('**/*', lambda route: route.continue_() if route.request.method in ('GET', 'HEAD', 'OPTIONS') else route.abort())
    for path in ('/2029', '/world', '/2029/posts'):
        page.goto('http://127.0.0.1:5188' + path, wait_until='domcontentloaded')
        page.locator('.sod29-living-ribbon').wait_for(timeout=30000)
        assert page.locator('.sod29-living-ribbon').count() == 1
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
        # Ensure an empty fixture page is scrollable without changing product data.
        page.evaluate("() => { const n = document.createElement('div'); n.style.height='1600px'; document.querySelector('.sod29-content').appendChild(n); }")
        page.evaluate('window.scrollTo(0, 600)')
        page.wait_for_timeout(200)
        ribbon_box = page.locator('.sod29-living-ribbon').bounding_box()
        header_box = page.locator('.sod29-header').bounding_box()
        assert page.evaluate('window.scrollY') > 100
        assert abs(ribbon_box['y'] - (header_box['y'] + header_box['height'])) <= 14
    context.close()
    browser.close()
print(json.dumps(results, ensure_ascii=False))
assert len(results) == 9
