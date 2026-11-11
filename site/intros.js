(async function () {
  'use strict';
  const I=window.StremeroIntro,E=window.IntroExports;
  const $=id=>document.getElementById(id),form=$('intro-controls'),canvas=$('intro-canvas');
  const storageKey='stremero.intro.v1';
  let settings=I.normalize(),assets={},defaultAudio='',cursor=I.duration(settings);
  let playing=false,raf=0,epoch=0,ready=false,exportAbort=null,fontFace=null,assetBusy=false,playGeneration=0;
  const renderer=new I.Renderer(canvas,settings),audio=new E.AudioTrack();
  function status(text,error=false) {$('intro-status').textContent=text;$('intro-status').classList.toggle('error',error);}
  function syncForm() {
    for(const key of Object.keys(I.DEFAULTS)){
      const input=form.elements.namedItem(key);if(!input)continue;
      if(input.type==='checkbox')input.checked=settings[key];else input.value=settings[key];
    }
    for(const output of form.querySelectorAll('[data-output]'))output.textContent=settings[output.dataset.output]+'%';
    $('intro-seek').max=I.duration(settings);
  }
  function updateTime() {
    const duration=I.duration(settings);$('intro-seek').value=cursor;
    $('timecode').textContent=`${cursor.toFixed(2)} / ${duration.toFixed(2)}s`;
    const t=settings.lead?cursor/settings.lead*1.64:1.64;
    $('stage-name').textContent=cursor>=settings.lead?'Logo':t<.55?'Recording':t<1.12?'Upload':'Play';
  }
  function draw() {renderer.draw(cursor);updateTime();}
  function persist() {try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch{}}
  function pause() {playGeneration++;playing=false;cancelAnimationFrame(raf);audio.stop();$('pause-intro').disabled=true;$('play-intro').textContent='▶ Play intro';}
  async function play(from=0) {
    if(!ready||assetBusy||exportAbort)return;
    pause();const generation=playGeneration;cursor=Math.min(from,I.duration(settings));
    try {
      if(settings.sound){await audio.prepare(assets.audio);if(generation!==playGeneration)return;audio.start(settings.audioOffset+cursor,settings.volume);}
      epoch=performance.now()-cursor*1000;playing=true;$('pause-intro').disabled=false;$('play-intro').textContent='▶ Playing';
      const tick=now=>{
        if(!playing)return;cursor=Math.min(I.duration(settings),(now-epoch)/1000);draw();
        if(cursor>=I.duration(settings)){pause();if(settings.loop)play(0);}else raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }catch(error){pause();status('The sound could not play. Try a different audio file, or switch sound off.',true);}
  }
  function assetLock(value) {assetBusy=value;for(const id of ['play-intro','replay-intro','download-html','export-video','save-frame'])$(id).disabled=value||!ready||(id==='export-video'&&!E.videoType());}
  async function readUpload(file,kind) {
    if(!file)throw new Error('Choose a file first.');
    if(file.size>20*1024*1024)throw new Error('Choose a file smaller than 20 MB.');
    if(kind==='font'&&!/\.(ttf|otf|woff2?)$/i.test(file.name))throw new Error('Choose a TTF, OTF or WOFF font.');
    if(kind==='image'&&!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('Choose a PNG, JPG or WebP image.');
    return E.blobData(file);
  }
  function safeData(data,kind) {
    if(data===null||data===undefined||data==='')return null;
    const prefixes={font:/^data:(?:font\/[^;,]+|application\/(?:octet-stream|x-font[^;,]*|font[^;,]*|vnd.ms-opentype));base64,/,audio:/^data:(?:audio\/[^;,]+|application\/octet-stream);base64,/,background:/^data:image\/(?:png|jpeg|webp);base64,/};
    if(typeof data!=='string'||data.length>28*1024*1024||!prefixes[kind].test(data))throw new Error('This project contains an invalid '+kind+' file.');
    return data;
  }
  async function setCustomFont(data,name) {
    const next=await E.loadFont(data,'Stremero Custom');
    if(fontFace)document.fonts.delete(fontFace);fontFace=next;
    assets.customFont=data;assets.customFontName=name;
    $('custom-font-option').disabled=false;$('font-name').textContent=name;
    settings.font='custom';
  }
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',e=>{
    const input=e.target;if(!Object.hasOwn(I.DEFAULTS,input.name))return;
    pause();settings=I.normalize({...settings,[input.name]:input.type==='checkbox'?input.checked:input.value});
    renderer.update(settings);cursor=I.duration(settings);syncForm();draw();persist();
  });
  $('play-intro').addEventListener('click',()=>play(cursor>=I.duration(settings)?0:cursor));
  $('pause-intro').addEventListener('click',pause);$('replay-intro').addEventListener('click',()=>play(0));
  $('intro-seek').addEventListener('input',()=>{pause();cursor=Number($('intro-seek').value);draw();});
  document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>{
    pause();const stage=Number(button.dataset.stage);cursor=stage>=1.64?I.duration(settings):settings.lead*stage/1.64;draw();
  }));
  $('fullscreen-intro').addEventListener('click',()=>{$('preview-surface').requestFullscreen?.().catch(()=>status('Fullscreen is unavailable in this browser.',true));});
  $('reset-intro').addEventListener('click',()=>{
    if(assetBusy)return;pause();settings=I.normalize();
    if(fontFace){document.fonts.delete(fontFace);fontFace=null;}
    assets.customFont=null;assets.customFontName='';assets.background=null;assets.audio=defaultAudio;
    $('custom-font-option').disabled=true;$('font-name').textContent='';$('audio-name').textContent='Classic drum sting';$('remove-background').hidden=true;
    for(const id of ['font-file','audio-file','background-file','load-project'])$(id).value='';
    renderer.backgroundImage=null;renderer.update(settings);cursor=I.duration(settings);syncForm();draw();persist();status('Original words, font, colours, timing and sound restored.');
  });
  async function upload(id,handler) {
    $(id).addEventListener('change',async()=>{
      if(!$(id).files[0])return;pause();assetLock(true);
      try{await handler($(id).files[0]);renderer.update(settings);cursor=I.duration(settings);syncForm();draw();persist();status('Updated. Your upload stays on this device.');}
      catch(error){status(error.message,true);}finally{assetLock(false);$(id).value='';}
    });
  }
  upload('font-file',async file=>{await setCustomFont(await readUpload(file,'font'),file.name);});
  upload('audio-file',async file=>{
    const data=await readUpload(file,'audio');
    await audio.prepare(data,false);assets.audio=data;assets.audioName=file.name;settings.audioOffset=0;
    $('audio-name').textContent=file.name;
  });
  upload('background-file',async file=>{
    const data=await readUpload(file,'image'),image=await E.loadImage(data);
    assets.background=data;renderer.backgroundImage=image;$('remove-background').hidden=false;
  });
  $('restore-audio').addEventListener('click',()=>{pause();assets.audio=defaultAudio;assets.audioName='';settings.audioOffset=0;$('audio-name').textContent='Classic drum sting';renderer.update(settings);syncForm();draw();persist();});
  $('remove-background').addEventListener('click',()=>{assets.background=null;renderer.backgroundImage=null;$('remove-background').hidden=true;draw();});
  function filename(ext) {return (settings.title||'my-intro').replace(/[^a-z0-9_-]/gi,'-').slice(0,60)+'-intro.'+ext;}
  $('download-html').addEventListener('click',()=>{
    const html=E.html(settings,assets,I.runtimeSource);
    E.download(new Blob([html],{type:'text/html'}),filename('html'));status('HTML downloaded. It includes the font, sound and your uploaded files.');
  });
  $('save-frame').addEventListener('click',()=>canvas.toBlob(blob=>{if(blob){E.download(blob,filename('png'));status('Current frame saved as PNG.');}else status('This frame could not be saved.',true);},'image/png'));
  $('save-project').addEventListener('click',()=>{
    const project={version:1,settings,assets:{customFont:assets.customFont||null,customFontName:assets.customFontName||'',audio:assets.audio,audioName:assets.audioName||'',background:assets.background||null}};
    E.download(new Blob([JSON.stringify(project)],{type:'application/json'}),filename('json'));status('Project saved, including your uploaded font, image and sound.');
  });
  upload('load-project',async file=>{
    if(file.size>65*1024*1024)throw new Error('This project is too large.');
    const project=JSON.parse(await file.text());
    if(project.version!==1||!project.settings||typeof project.settings!=='object')throw new Error('Choose a Stremero intro project.');
    const next=I.normalize(project.settings),a=project.assets||{};
    const customFont=safeData(a.customFont,'font'),sound=safeData(a.audio,'audio')||defaultAudio,background=safeData(a.background,'background');
    // Validate the complete project before replacing the current one.
    const image=await E.loadImage(background);
    const probe=new AudioTrackProbe();await probe.check(sound);
    let nextFace=null;
    if(customFont){nextFace=new FontFace('Stremero Custom',`url(${JSON.stringify(customFont)})`,{weight:'100 900'});await nextFace.load();}
    if(fontFace)document.fonts.delete(fontFace);fontFace=nextFace;if(nextFace)document.fonts.add(nextFace);
    settings=next;if(next.font==='custom'&&!customFont)settings.font='original';
    assets.customFont=customFont;assets.customFontName=typeof a.customFontName==='string'?a.customFontName.slice(0,200):'';
    assets.audio=sound;assets.audioName=typeof a.audioName==='string'?a.audioName.slice(0,200):'';assets.background=background;
    renderer.backgroundImage=image;$('custom-font-option').disabled=!customFont;$('font-name').textContent=assets.customFontName;
    $('audio-name').textContent=assets.audioName||'Classic drum sting';$('remove-background').hidden=!background;
  });
  // Decode imports without interrupting the currently selected audio on failure.
  class AudioTrackProbe {
    async check(data) {const context=new (window.AudioContext||window.webkitAudioContext)();try{await context.decodeAudioData(await (await fetch(data)).arrayBuffer());}finally{await context.close();}}
  }
  $('export-video').addEventListener('click',async()=>{
    if(exportAbort||!ready)return;pause();exportAbort=new AbortController();
    const controls=[...document.querySelectorAll('button,input,select')].filter(el=>el!==$('cancel-export'));
    const disabled=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
    $('export-progress').hidden=false;$('export-progress').value=0;$('cancel-export').hidden=false;
    status('Recording your intro… keep this tab open until it finishes.');
    try {
      const result=await E.record({settings:{...settings},assets:{...assets},width:Number($('video-size').value),fps:Number($('video-fps').value),signal:exportAbort.signal,onProgress:p=>{$('export-progress').value=p;cursor=p*I.duration(settings);draw();}});
      E.download(result.blob,filename(result.extension));status('Your '+result.extension.toUpperCase()+' video is ready.');
    }catch(error){status(error.name==='AbortError'?'Video export cancelled.':error.message,error.name!=='AbortError');}
    finally{exportAbort=null;controls.forEach((el,i)=>el.disabled=disabled[i]);$('export-progress').hidden=true;$('cancel-export').hidden=true;cursor=I.duration(settings);draw();}
  });
  $('cancel-export').addEventListener('click',()=>exportAbort?.abort());
  window.addEventListener('pagehide',()=>{pause();exportAbort?.abort();audio.context?.close();});
  try {
    const saved=localStorage.getItem(storageKey);if(saved)settings=I.normalize(JSON.parse(saved));
  }catch{}
  // Uploads intentionally are not placed in browser storage. A project keeps them.
  if(settings.font==='custom')settings.font='original';
  try {
    const [font,fontRegular,sound,license]=await Promise.all([E.dataURL('_intros/LiberationSans-Bold.ttf'),E.dataURL('_intros/LiberationSans-Regular.ttf'),E.dataURL('_intros/classic-sting.mp3'),fetch('_intros/FONT-LICENSE.txt').then(r=>{if(!r.ok)throw new Error('Could not load the font license.');return r.text();})]);
    await E.loadFont(font,'Stremero Original','700 900');await E.loadFont(fontRegular,'Stremero Original','100 600');
    assets={font,fontRegular,audio:sound,fontLicense:license,customFont:null,background:null};defaultAudio=sound;
    ready=true;renderer.update(settings);cursor=I.duration(settings);syncForm();draw();assetLock(false);
    $('replay-intro').disabled=false;$('save-project').disabled=false;
    if(!E.videoType()){$('export-video').disabled=true;$('video-hint').textContent='This browser cannot record video. Download HTML to play your intro in OBS or open this page in Chrome or Edge.';}
    status('Original styling loaded. Change any setting, then press Play intro.');
    // A small read-only surface also lets the browser checks inspect exported output.
    window.introStudio={get settings(){return {...settings};},get assets(){return {...assets};},renderer};
  }catch(error){status(error.message||'The intro assets could not load. Please reload.',true);}
})();
