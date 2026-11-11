"""Exercise the intro editor, offline HTML, project imports and real video capture.

Run: python3 scripts/check-intros.py (Playwright Chromium required).
Optional: CHROMIUM_EXECUTABLE=/path/to/chromium for a system browser.
"""
import asyncio
import functools
import http.server
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import threading

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


async def check(origin, temporary):
    async with async_playwright() as p:
        launch = {'headless': True}
        if os.environ.get('CHROMIUM_EXECUTABLE'):
            launch['executable_path'] = os.environ['CHROMIUM_EXECUTABLE']
        browser = await p.chromium.launch(**launch)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(origin + '/intros.html')
        await page.wait_for_function('!!window.introStudio')
        assert await page.get_by_role('link', name='Intros', exact=True).get_attribute('aria-current') == 'page'
        assert await page.evaluate('document.fonts.check(\'700 150px "Stremero Original"\')')
        assert await page.evaluate('introStudio.settings.accent') == '#ff9900'
        assert abs(await page.evaluate('StremeroIntro.duration(introStudio.settings)') - 2.96) < .001
        assert await page.evaluate("""() => {
          const d=introStudio.renderer.ctx.getImageData(0,0,1920,1080).data;
          let orange=0;for(let i=0;i<d.length;i+=4)if(d[i]>240&&d[i+1]>130&&d[i+1]<175&&d[i+2]<20)orange++;
          return orange>10000;
        }""")

        await page.locator('#intro-seek').fill('0.1')
        assert await page.locator('#stage-name').inner_text() == 'Recording'
        await page.get_by_role('button', name='Play intro', exact=False).click()
        await page.wait_for_timeout(180)
        assert float((await page.locator('#timecode').inner_text()).split(' / ')[0]) > .1
        await page.get_by_role('button', name='Pause', exact=True).click()
        paused = await page.locator('#timecode').inner_text()
        await page.wait_for_timeout(120)
        assert await page.locator('#timecode').inner_text() == paused

        hostile = '</script><script>window.introInjected=true</script>'
        await page.locator('[name=title]').fill(hostile)
        await page.locator('[name=suffix]').fill('studio')
        await page.locator('[name=subtitle]').fill('my channel')
        await page.locator('[name=accent]').evaluate("el=>{el.value='#22cc88';el.dispatchEvent(new Event('input',{bubbles:true}));}")
        assert await page.evaluate('introStudio.settings.accent') == '#22cc88'
        assert await page.evaluate('introStudio.settings.font') == 'original'

        # Uploaded fonts and audio survive a saved project and offline HTML.
        await page.locator('#font-file').set_input_files(str(SITE / '_intros/LiberationSans-Regular.ttf'))
        await page.wait_for_function("introStudio.settings.font==='custom'")
        await page.locator('summary').filter(has_text='Sound & background').click()
        await page.locator('#audio-file').set_input_files(str(SITE / '_intros/classic-sting.mp3'))
        await page.wait_for_function("introStudio.assets.audioName==='classic-sting.mp3'")
        async with page.expect_download() as downloaded:
            await page.locator('#save-project').click()
        project_path = temporary / 'project.json'
        await (await downloaded.value).save_as(project_path)
        project = json.loads(project_path.read_text())
        assert project['assets']['customFont'].startswith('data:')
        assert project['settings']['title'] == hostile

        async with page.expect_download() as downloaded:
            await page.locator('#download-html').click()
        html_path = temporary / 'intro.html'
        await (await downloaded.value).save_as(html_path)
        html = html_path.read_text()
        assert '<script>window.introInjected' not in html
        assert 'FONT-LICENSE.txt' not in html
        assert 'SIL OPEN FONT LICENSE' in html
        offline = await browser.new_context(offline=True)
        standalone = await offline.new_page()
        standalone.on('pageerror', lambda e: errors.append(str(e)))
        await standalone.goto(html_path.as_uri())
        await standalone.wait_for_function('document.fonts.check(\'700 150px "Stremero Custom"\')')
        await standalone.wait_for_timeout(3300)
        assert not await standalone.evaluate('!!window.introInjected')
        assert await standalone.evaluate("document.querySelector('canvas').getContext('2d').getImageData(0,0,1,1).data[3]") == 255
        assert 'Could not load' not in await standalone.locator('button').inner_text()
        await offline.close()

        await page.locator('#reset-intro').click()
        assert await page.locator('[name=title]').input_value() == 'Obskyra'
        assert await page.locator('[name=accent]').input_value() == '#ff9900'
        await page.locator('#load-project').set_input_files(str(project_path))
        await page.wait_for_function("introStudio.settings.title.startsWith('</script>')")
        assert await page.evaluate('introStudio.settings.font') == 'custom'
        assert await page.locator('[name=accent]').input_value() == '#22cc88'

        # Failed imports must preserve the working project and reject remote URLs.
        bad = temporary / 'invalid.json'
        bad.write_text(json.dumps({'version': 1, 'settings': {'title': 'SHOULD NOT APPLY'}, 'assets': {'audio': 'https://example.com/audio.mp3'}}))
        await page.locator('#load-project').set_input_files(str(bad))
        await page.wait_for_function("document.querySelector('#intro-status').classList.contains('error')")
        assert await page.locator('[name=title]').input_value() == hostile
        assert await page.get_by_role('button', name='Download HTML', exact=False).is_enabled()

        await page.locator('#reset-intro').click()
        await page.locator('summary').filter(has_text='Animation & timing').click()
        await page.locator('[name=lead]').fill('0')
        await page.locator('[name=reveal]').fill('0.1')
        await page.locator('[name=hold]').fill('0.2')
        await page.locator('[name=title]').fill('A' * 80)
        await page.locator('[name=subtitle]').fill('B' * 80)
        await page.locator('summary').filter(has_text='Size & placement').click()
        await page.locator('[name=subtitleSpacing]').fill('100')
        assert abs(await page.evaluate('StremeroIntro.duration(introStudio.settings)') - .3) < .001
        assert await page.evaluate("""() => {
          const c=introStudio.renderer.ctx;
          return [...c.getImageData(0,0,20,1080).data].every((v,i)=>i%4===3?v===255:v===0);
        }""")
        await page.locator('#reset-intro').click()
        await page.set_viewport_size({'width': 390, 'height': 844})
        assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
        await page.get_by_role('link', name='Intros', exact=True).scroll_into_view_if_needed()
        assert await page.get_by_role('link', name='Intros', exact=True).is_visible()
        await page.set_viewport_size({'width': 1440, 'height': 1000})

        # Real capture, not a mocked recorder: verify both tracks and decoded size.
        await page.evaluate("""() => {
          const Native=window.MediaRecorder;
          window.MediaRecorder=class extends Native {
            constructor(stream,options){super(stream,options);window.introRecordedTracks=stream.getTracks().map(t=>t.kind);}
          };
        }""")
        await page.locator('#video-size').select_option('1280')
        await page.locator('#video-fps').select_option('30')
        async with page.expect_download(timeout=20000) as downloaded:
            await page.locator('#export-video').click()
        video = await downloaded.value
        video_path = temporary / video.suggested_filename
        await video.save_as(video_path)
        assert video_path.stat().st_size > 10000
        assert sorted(await page.evaluate('window.introRecordedTracks')) == ['audio', 'video']
        if shutil.which('ffprobe'):
            info = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video_path)]))
            stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
            assert (stream['width'], stream['height']) == (1280,720)
            assert any(s['codec_type'] == 'audio' for s in info['streams'])
        else:
            metadata = await page.evaluate("""async data=>{
              const v=document.createElement('video');v.src=data;
              await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=no;});
              return [v.videoWidth,v.videoHeight];
            }""", 'data:video/' + video_path.suffix[1:] + ';base64,' + __import__('base64').b64encode(video_path.read_bytes()).decode())
            assert metadata == [1280,720]
        assert await page.locator('#download-html').is_enabled()
        await page.locator('#export-video').click()
        await page.locator('#cancel-export').click()
        await page.wait_for_function("document.querySelector('#cancel-export').hidden")
        assert 'cancelled' in await page.locator('#intro-status').inner_text()
        assert not errors, errors
        await browser.close()
        print('Intros: bundled font, editable settings, playback, offline HTML, safe project round-trip, mobile layout, audio/video recording and cancellation passed')


if __name__ == '__main__':
    for name in ['index.html','transitions.html','preview.html','editor.html']:
        assert 'href="intros.html"' in (SITE / name).read_text(), name
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=SITE))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory() as temp:
            asyncio.run(check('http://127.0.0.1:' + str(server.server_port), pathlib.Path(temp)))
    finally:
        server.shutdown()
