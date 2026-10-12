"""Check the Transitions gallery, sound preview, and clean OBS URL."""
import asyncio, functools, http.server, pathlib, threading
from playwright.async_api import async_playwright

SITE = pathlib.Path(__file__).resolve().parent.parent / 'site'

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

async def check(origin):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'])
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(origin + '/transitions.html')
        await page.get_by_role('button', name='And the rest', exact=True).click()
        assert await page.locator('#transition-empty').is_visible()
        await page.get_by_role('button', name='Movies', exact=True).click()
        await page.locator('.card').click()
        await page.wait_for_function("!document.getElementById('play-wipe').disabled")
        frame = next(f for f in page.frames if f.parent_frame and 'bat-spin' in f.url)
        assert await frame.evaluate("document.querySelector('audio').paused")
        await page.get_by_role('button', name='Play wipe', exact=True).click()
        await page.wait_for_timeout(250)
        assert await frame.evaluate("!document.querySelector('audio').paused && document.querySelector('audio').currentTime > 0")
        await page.get_by_role('button', name='Copy link to OBS').click()
        assert await page.evaluate('navigator.clipboard.readText()') == origin + '/_transitions/bat-spin.html'
        await page.wait_for_timeout(2200)
        assert await frame.evaluate("document.querySelector('canvas').getContext('2d').getImageData(0,0,1,1).data[3]") == 0
        await page.set_viewport_size({'width': 390, 'height': 844})
        assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert not errors, errors
        await browser.close()
        print('Transitions: categories, card navigation, original audio, clean OBS URL, transparency and mobile layout passed')

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=SITE))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(check('http://127.0.0.1:' + str(server.server_port)))
    finally:
        server.shutdown()
