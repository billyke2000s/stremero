// Generate scenes using the editor's pure build engine, without a browser dependency.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const only = new Set(process.argv.slice(2));
const context = vm.createContext({ console, localStorage: { getItem: () => null } });
const code = fs.readFileSync('site/editor.js', 'utf8').split('let stageTimer =')[0];
vm.runInContext(code, context);
context.library = JSON.parse(fs.readFileSync('site/parts.json', 'utf8'));
vm.runInContext('LIB=library; SRC=Object.fromEntries(LIB.sources.map(s=>[s.id,s]));',context);
for (const s of context.library.sources) {
 if (only.size && !only.has(s.name)) continue;
 for (const [id,label] of [['starting','Starting soon'],['brb','Be right back'],['ending','Ending'],['chatting','Just Chatting']]) {
  context.args=[s.id,id];
  const r=vm.runInContext(`(() => { const [id,sid]=args; const sc=sceneFor(picksFor(id),sid); sc.elements.forEach((e,i)=>e.id='p'+(i+1)); design={v:1,scene:sid,from:SRC[id].name,scenes:{main:designFromOverlay(id),[sid]:sc}}; const r=build(sc,false,{unified:true}); const c=sc.elements.find(e=>e.kind==='cam'); return {...r,cam:c?[c.x,c.y,c.w,c.h]:null}; })()`,context);
  const dir=path.join('site',s.path,'scenes',id); fs.mkdirSync(dir,{recursive:true});
  r.fields.widgetName.value=`${s.name} (${label})`;
  for(const [key,f] of Object.entries(r.fields)) if(key.startsWith('show')&&f.type==='checkbox') f.value=true;
  const files={'overlay.html':r.html,'styles.css':r.css,'overlay.js':r.js,'fields.json':JSON.stringify(r.fields,null,2),'scene.json':JSON.stringify({id,label,cam:r.cam},null,2),'START-HERE.txt':`${s.name} — ${label}\n\nCreate a 1920 x 1080 Custom Widget in StreamElements. Paste the HTML, CSS, JS and Fields from Stremero into their corresponding tabs. Add the resulting overlay URL as an OBS Browser Source.\n${r.cam?'Webcam: '+r.cam.join(', '):'No webcam in this scene.'}\n`};
  for(const [f,text] of Object.entries(files)) fs.writeFileSync(path.join(dir,f),text);
 }
 console.log('Scenes built:',s.name);
}
