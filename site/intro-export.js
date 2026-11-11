/* Local assets, audio playback, standalone HTML and real-time video export. */
(function (root) {
  'use strict';
  async function dataURL(url) {
    const response=await fetch(url);
    if (!response.ok) throw new Error('An intro asset could not be loaded. Please reload the page.');
    return blobData(await response.blob());
  }
  function blobData(blob) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('This file could not be read.'));reader.readAsDataURL(blob);
    });
  }
  async function loadFont(data,family,weight='100 900') {
    const face=new FontFace(family,`url(${JSON.stringify(data)})`,{weight});
    await face.load();document.fonts.add(face);return face;
  }
  async function loadImage(data) {
    if (!data) return null;
    const image=new Image();image.src=data;await image.decode();return image;
  }
  class AudioTrack {
    constructor() { this.context=null;this.buffer=null;this.data=null;this.node=null;this.gain=null; }
    async prepare(data,resume=true) {
      if (!this.context) this.context=new (window.AudioContext||window.webkitAudioContext)();
      if(resume)await this.context.resume();
      if (this.data!==data) {
        const response=await fetch(data);
        this.buffer=await this.context.decodeAudioData(await response.arrayBuffer());this.data=data;
      }
    }
    start(offset,volume,destination=null) {
      this.stop();
      if (!this.buffer || offset>=this.buffer.duration) return;
      this.node=this.context.createBufferSource();this.node.buffer=this.buffer;
      this.gain=this.context.createGain();this.gain.gain.value=volume/100;
      this.node.connect(this.gain);this.gain.connect(this.context.destination);
      if (destination) this.gain.connect(destination);
      this.node.start(0,Math.max(0,offset));
    }
    stop() {
      if (this.node) {try{this.node.stop();}catch{}this.node.disconnect();this.node=null;}
      if (this.gain) {this.gain.disconnect();this.gain=null;}
    }
    setVolume(volume) {if(this.gain)this.gain.gain.value=volume/100;}
  }
  function videoType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    const types=['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    return types.find(type=>MediaRecorder.isTypeSupported(type))||null;
  }
  async function record({settings,assets,width=1920,fps=50,onProgress=()=>{},signal}) {
    const mimeType=videoType();
    if (!mimeType) throw new Error('Video recording is unavailable in this browser. Download HTML instead, or try Chrome or Edge.');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(width*9/16);
    const renderer=new StremeroIntro.Renderer(canvas,{...settings,transparent:false});
    renderer.backgroundImage=await loadImage(assets.background);
    const audio=new AudioTrack();
    if (settings.sound) await audio.prepare(assets.audio);
    if (signal?.aborted) {await audio.context?.close();throw new DOMException('Export cancelled.','AbortError');}
    renderer.draw(0);
    const stream=canvas.captureStream(fps);
    const destination=settings.sound?audio.context.createMediaStreamDestination():null;
    if(destination)destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
    const chunks=[];
    let recorder;
    try {recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:width===1920?10000000:6000000,audioBitsPerSecond:192000});}
    catch(error) {stream.getTracks().forEach(t=>t.stop());await audio.context?.close();throw error;}
    const duration=StremeroIntro.duration(settings);
    let raf=0,started=0,cancelled=false;
    return new Promise((resolve,reject)=>{
      const clean=()=>{cancelAnimationFrame(raf);audio.stop();stream.getTracks().forEach(t=>t.stop());audio.context?.close().catch(()=>{});signal?.removeEventListener('abort',abort);};
      const abort=()=>{cancelled=true;if(recorder.state!=='inactive')recorder.stop();};
      signal?.addEventListener('abort',abort,{once:true});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=e=>{clean();reject(e.error||new Error('Video export failed.'));};
      recorder.onstop=()=>{clean();if(cancelled)reject(new DOMException('Export cancelled.','AbortError'));else resolve({blob:new Blob(chunks,{type:mimeType}),extension:mimeType.startsWith('video/mp4')?'mp4':'webm'});};
      // Some encoders emit `start` only after their first media frame. Starting
      // the canvas and audio from that event would leave them waiting on each other.
      recorder.start(100);
      audio.start(settings.audioOffset,settings.volume,destination);
      started=performance.now();renderer.draw(0);
      const frame=now=>{
        const t=Math.min(duration,(now-started)/1000);renderer.draw(t);onProgress(t/duration);
        if(t>=duration){recorder.stop();}else raf=requestAnimationFrame(frame);
      };
      raf=requestAnimationFrame(frame);
    });
  }
  function download(blob,name) {
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  // This function is serialized into the downloaded file. It has no dependencies.
  async function standaloneBoot(runtime,payload) {
    const intro=runtime(),s=intro.normalize(payload.settings),assets=payload.assets;
    const canvas=document.querySelector('canvas'),button=document.querySelector('button');
    async function font(data,name,weight='100 900') {const f=new FontFace(name,`url(${JSON.stringify(data)})`,{weight});await f.load();document.fonts.add(f);}
    try {
      await font(assets.font,'Stremero Original','700 900');
      await font(assets.fontRegular,'Stremero Original','100 600');
      if(assets.customFont)await font(assets.customFont,'Stremero Custom');
      const renderer=new intro.Renderer(canvas,s);
      if(assets.background){const img=new Image();img.src=assets.background;await img.decode();renderer.backgroundImage=img;}
      const audio=new Audio(assets.audio);audio.volume=s.volume/100;
      let raf=0;
      function start() {
        cancelAnimationFrame(raf);button.hidden=true;audio.pause();
        if(s.sound){audio.currentTime=s.audioOffset;audio.play().catch(()=>{button.hidden=false;});}
        const epoch=performance.now(),duration=intro.duration(s);
        function frame(now){const time=(now-epoch)/1000;renderer.draw(Math.min(time,duration));if(time<duration)raf=requestAnimationFrame(frame);else if(s.loop)start();else audio.pause();}
        renderer.draw(0);raf=requestAnimationFrame(frame);
      }
      button.addEventListener('click',start);window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();start();}});
      start();
    } catch(error) {button.hidden=false;button.textContent='Could not load this intro. Please download it again.';console.error(error);}
  }
  function html(settings,assets,runtimeSource) {
    const payload=JSON.stringify({settings,assets}).replace(/</g,'\\u003c');
    const license=JSON.stringify(assets.fontLicense||'').replace(/</g,'\\u003c');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Custom intro — Stremero</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${settings.transparent?'transparent':settings.background}}body{display:grid;place-items:center}canvas{width:100%;height:100%;object-fit:contain}button{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);font:600 14px Arial;padding:12px 20px;background:#fff;color:#111;border:0;border-radius:7px;cursor:pointer}[hidden]{display:none}</style></head><body><canvas width="1920" height="1080" aria-label="Custom intro"></canvas><button hidden>Play with sound</button><script type="application/json" id="font-license">${license}</script><script>(${standaloneBoot.toString()})(${runtimeSource},${payload});<\/script></body></html>`;
  }
  root.IntroExports={dataURL,blobData,loadFont,loadImage,AudioTrack,videoType,record,download,html};
})(window);
