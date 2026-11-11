/* A deterministic canvas timeline, shared by the editor and its offline exports. */
(function (root) {
  'use strict';
  function createIntroRuntime() {
    const DEFAULTS = Object.freeze({
      title: 'Obskyra', suffix: 'hub', subtitle: 'community', recText: 'REC',
      background: '#000000', text: '#ffffff', accent: '#ff9900', boxText: '#000000',
      subtitleColor: '#ffffff', iconColor: '#ff9900', font: 'original', weight: '700',
      fontSize: 150, subtitleSize: 64, subtitleSpacing: 0, boxPadding: 16, radius: 16,
      scale: 100, x: 50, y: 44, subtitleY: 64, lead: 1.64, reveal: 0.48, hold: 0.84,
      angle: 28, stroke: 12, showRec: true, showLaptop: true, showPlay: true,
      showDot: true, showSubtitle: true, loop: false, sound: true, volume: 80,
      audioOffset: 0, backgroundOpacity: 100, transparent: false
    });
    const limits = {fontSize:[40,300],subtitleSize:[16,150],subtitleSpacing:[-10,100],
      boxPadding:[0,80],radius:[0,100],scale:[25,180],x:[5,95],y:[10,85],subtitleY:[15,95],
      lead:[0,5],reveal:[0.1,3],hold:[0.1,20],angle:[-180,180],stroke:[1,30],
      volume:[0,100],audioOffset:[0,120],backgroundOpacity:[0,100]};
    const colorKeys = ['background','text','accent','boxText','subtitleColor','iconColor'];
    const fonts = {original:'"Stremero Original"', arial:'Arial', helvetica:'Helvetica, Arial',
      georgia:'Georgia', monospace:'monospace', custom:'"Stremero Custom"'};
    function normalize(value = {}) {
      if (!value || typeof value !== 'object') value = {};
      const s = {...DEFAULTS};
      for (const key of ['title','suffix','subtitle','recText']) {
        if (typeof value[key] === 'string') s[key] = value[key].slice(0, key === 'recText' ? 20 : 80);
      }
      for (const key of colorKeys) if (/^#[0-9a-f]{6}$/i.test(value[key])) s[key] = value[key];
      for (const [key, [lo, hi]] of Object.entries(limits)) {
        const n = Number(value[key]);
        if (value[key] !== undefined && Number.isFinite(n)) s[key] = Math.max(lo, Math.min(hi, n));
      }
      for (const key of Object.keys(DEFAULTS).filter(k => typeof DEFAULTS[k] === 'boolean')) {
        if (typeof value[key] === 'boolean') s[key] = value[key];
      }
      if (Object.hasOwn(fonts, value.font)) s.font = value.font;
      if (['400','700','900'].includes(value.weight)) s.weight = value.weight;
      return s;
    }
    const clamp = n => Math.max(0, Math.min(1, n));
    const ease = n => 1 - Math.pow(1-clamp(n), 3);
    const duration = s => s.lead + s.reveal + s.hold;
    function rounded(c, x, y, w, h, r) {
      r = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
      c.beginPath(); c.roundRect(x,y,w,h,r);
    }
    function triangle(c, x, y, r, angle = 0) {
      c.save(); c.translate(x,y); c.rotate(angle); c.beginPath();
      c.moveTo(-r*.6,-r); c.lineTo(r,0); c.lineTo(-r*.6,r); c.closePath(); c.fill(); c.restore();
    }
    function tracked(c, text, x, y, width, time, start, reveal, spacing) {
      const chars = Array.from(text);
      const sum = chars.reduce((n,ch) => n + c.measureText(ch).width, 0);
      const gap = chars.length > 1 ? (spacing || (width-sum)/(chars.length-1)) : 0;
      const lineWidth = Math.max(1,sum+Math.max(0,chars.length-1)*gap);
      const fit = Math.min(1,width/lineWidth);
      c.save();c.translate(x+(width-lineWidth*fit)/2,y);c.scale(fit,1);x=0;y=0;
      chars.forEach((ch,i) => {
        const cw = c.measureText(ch).width;
        const u = clamp((time-start-i/Math.max(1,chars.length)*reveal*.75)/(reveal*.25));
        if (u > 0) {
          c.save(); c.translate(x+cw/2,y+32*(1-u)); c.rotate(-Math.PI*.4*(1-u));
          c.globalAlpha *= u; c.fillText(ch,-cw/2,0); c.restore();
        }
        x += cw+gap;
      });
      c.restore();
    }
    class Renderer {
      constructor(canvas, settings = DEFAULTS) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.settings = normalize(settings); this.backgroundImage = null;
      }
      update(settings) { this.settings = normalize(settings); }
      font(size) { return `${this.settings.weight} ${size}px ${fonts[this.settings.font]}, sans-serif`; }
      draw(seconds) {
        const s = this.settings, c = this.ctx, canvas = this.canvas;
        c.save(); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,canvas.width,canvas.height);
        c.scale(canvas.width/1920, canvas.height/1080);
        if (!s.transparent) { c.fillStyle = s.background; c.fillRect(0,0,1920,1080); }
        if (this.backgroundImage) {
          const img = this.backgroundImage, k = Math.max(1920/img.width,1080/img.height);
          c.save(); c.globalAlpha = s.backgroundOpacity/100;
          c.drawImage(img,(1920-img.width*k)/2,(1080-img.height*k)/2,img.width*k,img.height*k); c.restore();
        }
        c.textBaseline = 'alphabetic'; c.lineJoin = 'round'; c.lineCap = 'round';
        const t = Math.max(0,Math.min(duration(s),Number(seconds)||0));
        if (t < s.lead) this.icons(s.lead ? t/s.lead*1.64 : 1.64);
        else this.logo(t-s.lead);
        c.restore();
      }
      icons(t) {
        const s = this.settings, c = this.ctx, color = s.iconColor;
        c.save(); c.translate((s.x-50)*19.2,(s.y-44)*10.8); c.translate(960,500);
        c.scale(s.scale/100,s.scale/100); c.translate(-960,-500);
        c.fillStyle = color; c.strokeStyle = color; c.lineWidth = s.stroke;
        if (t < .57 && s.showRec) {
          const move = ease((t-.36)/.2);
          c.save(); c.globalAlpha = 1-clamp((t-.45)/.12);
          c.font = this.font(100); const tw = c.measureText(s.recText).width;
          const width = tw + (s.showDot ? 112 : 0), x = 960-width/2;
          c.translate(0,move*70);
          if (s.showDot && (t<.25 || t>.37)) { c.beginPath(); c.arc(x+39,493,39,0,Math.PI*2); c.fill(); }
          c.fillText(s.recText,x+(s.showDot?112:0),529); c.restore();
        }
        if (t >= .43 && t < 1.16 && s.showLaptop) {
          c.save(); c.globalAlpha = ease((t-.43)/.14);
          const collapse = clamp((t-1.01)/.15);
          const top = 346+(622-346)*collapse;
          if (collapse<1) { rounded(c,745,top,430,258*(1-collapse),7); c.stroke(); }
          c.beginPath(); c.moveTo(680,634); c.lineTo(1240,634); c.quadraticCurveTo(1235,658,1215,658);
          c.lineTo(705,658); c.quadraticCurveTo(685,658,680,634); c.fill();
          c.fillStyle = s.background;
          rounded(c,916,634,88,8,2); c.fill(); c.restore();
        }
        if (t >= .57 && t < 1.13 && s.showLaptop) {
          const rise = ease((t-.57)/.19), y = 634-145*rise;
          c.save(); c.beginPath(); c.rect(600,200,720,427); c.clip();
          c.beginPath(); c.arc(960,y,84,0,Math.PI*2); c.fill();
          if (t>.73) {
            if (s.transparent && !this.backgroundImage) c.globalCompositeOperation = 'destination-out';
            else c.fillStyle = s.background;
            const u = ease((t-.73)/.14); c.beginPath();
            c.moveTo(960,y-43*u); c.lineTo(900,y+18); c.lineTo(936,y+18);
            c.lineTo(936,y+88); c.lineTo(984,y+88); c.lineTo(984,y+18); c.lineTo(1020,y+18); c.closePath(); c.fill();
          }
          c.restore();
        }
        if (t>=1.05 && s.showPlay) {
          c.save(); const u=ease((t-1.05)/.15);
          c.globalAlpha = 1-clamp((t-1.57)/.06);
          c.lineWidth = s.stroke*(1-.72*ease((t-1.15)/.12));
          const r=84+36*u;
          c.beginPath(); c.arc(960,489,r,0,Math.PI*2); c.stroke();
          triangle(c,960,489,53,-Math.PI/2*(1-u));
          if (t>1.22) {
            const v=ease((t-1.22)/.13), x=1140-113*v, y=683-110*v;
            c.save(); c.translate(x,y); c.rotate(-.18); c.lineWidth=4;
            c.fillStyle=s.background; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-68);
            c.lineTo(48,-22); c.lineTo(25,-20); c.lineTo(44,11); c.lineTo(29,20); c.lineTo(10,-12); c.closePath(); c.fill(); c.stroke();
            if (t>1.37 && t<1.46) { c.beginPath(); c.arc(0,-68,18,Math.PI,Math.PI*2); c.stroke(); }
            c.restore();
          }
          c.restore();
        }
        c.restore();
      }
      logo(t) {
        const s=this.settings,c=this.ctx;
        c.save(); c.font=this.font(s.fontSize);
        const titleWidth=c.measureText(s.title).width;
        const suffixSize=s.fontSize*.825;
        c.font=this.font(suffixSize);
        const boxWidth=s.suffix ? c.measureText(s.suffix).width+s.boxPadding*2 : 0;
        const gap=s.title && s.suffix ? 20 : 0;
        const width=titleWidth+gap+boxWidth;
        const scale=Math.min(s.scale/100,1740/Math.max(1,width));
        c.translate(s.x*19.2,s.y*10.8); c.scale(scale,scale);
        const x=-width/2, baseline=s.fontSize*.23;
        c.font=this.font(s.fontSize);
        let offset=0;
        const chars=Array.from(s.title);
        chars.forEach((ch,i)=>{
          const cw=c.measureText(ch).width;
          const start=i/Math.max(1,chars.length)*s.reveal*.4;
          const u=clamp((t-start)/(s.reveal*.16));
          if (u>0) {
            c.save(); c.translate(x+offset+cw/2,baseline); c.scale(Math.max(.015,Math.sin(u*Math.PI/2)),1);
            c.fillStyle=u<.32?s.accent:s.text; c.fillText(ch,-cw/2,0); c.restore();
          }
          // Prefix measurement preserves kerning and the position of the suffix.
          offset=c.measureText(chars.slice(0,i+1).join('')).width;
        });
        const u=clamp((t-s.reveal*.58)/(s.reveal*.42));
        if (s.suffix && u>0) {
          c.save(); const bh=s.fontSize*1.09;
          c.translate(x+titleWidth+gap+boxWidth/2,-s.fontSize*.15+16*(1-u));
          c.rotate(-s.angle*Math.PI/180*Math.pow(1-u,2));
          const z=.85+.15*ease(u); c.scale(z,z);
          c.fillStyle=s.accent; rounded(c,-boxWidth/2,-bh/2,boxWidth,bh,s.radius); c.fill();
          c.font=this.font(suffixSize); c.fillStyle=s.boxText; c.textAlign='center';
          c.fillText(s.suffix,0,suffixSize*.35); c.restore();
        }
        c.restore();
        if (s.showSubtitle && s.subtitle) {
          c.save(); c.fillStyle=s.subtitleColor; c.font=this.font(s.subtitleSize);
          const maxWidth=Math.min(1740,Math.max(width*scale,200));
          // Keep long subtitles inside the frame, including extra tracking.
          const raw=c.measureText(s.subtitle).width+Math.max(0,s.subtitle.length-1)*Math.max(0,s.subtitleSpacing);
          if (raw>maxWidth) c.font=this.font(s.subtitleSize*maxWidth/raw);
          tracked(c,s.subtitle,s.x*19.2-maxWidth/2,s.subtitleY*10.8,maxWidth,t,s.reveal*.13,s.reveal*.95,s.subtitleSpacing);
          c.restore();
        }
      }
    }
    return {DEFAULTS,normalize,duration,Renderer,fonts};
  }
  root.StremeroIntro=createIntroRuntime();
  root.StremeroIntro.runtimeSource=createIntroRuntime.toString();
})(window);
