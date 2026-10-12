'use strict';
const frame=document.getElementById('transition-frame'),play=document.getElementById('play-wipe'),status=document.getElementById('transition-status'),link=document.getElementById('obs-link');
const obsUrl=new URL('_transitions/bat-spin.html',location.href).href;link.value=obsUrl;
frame.addEventListener('load',()=>{try{frame.contentWindow.batTransition.render(400);play.disabled=false;status.textContent='Ready to preview';frame.contentWindow.addEventListener('batTransitionEnd',()=>status.textContent='Finished · transparent')}catch(e){status.textContent='Preview could not load. Reload this page.'}});
play.addEventListener('click',()=>{frame.contentWindow.batTransition.play();status.textContent='Playing wipe with original audio';setTimeout(()=>{if(frame.contentWindow.batTransition.audioState.startsWith('blocked'))status.textContent='Your browser blocked audio playback.'},200)});
document.getElementById('copy-obs').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(obsUrl);status.textContent='OBS link copied'}catch(e){link.focus();link.select();status.textContent='Select and copy the OBS link above'}});
