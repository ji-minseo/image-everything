/* Dedicated image compressor. Keeps file picking separate from other tool modes. */
(()=>{'use strict';window.__dedicatedImageCompressor=true;
const $=s=>document.querySelector(s),state={files:[],output:[]};
const fmt=n=>n>=1048576?(n/1048576).toFixed(2)+' MB':n>=1024?(n/1024).toFixed(1)+' KB':n+' B';
const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)};
const toBlob=(canvas,type,q)=>new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('Could not encode image.')),type,q));
const decode=f=>new Promise((ok,fail)=>{const u=URL.createObjectURL(f),img=new Image();img.onload=()=>{URL.revokeObjectURL(u);ok(img)};img.onerror=()=>{URL.revokeObjectURL(u);fail(Error('Could not read image.'))};img.src=u});
async function encode(file,q,target){const img=await decode(file),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;if(!c.width||!c.height||c.width*c.height>50000000)throw Error('Image dimensions are unsupported or too large.');const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas unavailable.');ctx.drawImage(img,0,0);const type=['image/jpeg','image/png','image/webp'].includes(file.type)?file.type:'image/png';
let b=await toBlob(c,type,q);
if(target&&type!=='image/png'){let lo=.1,hi=q,best=b.size<=target?b:null;for(let i=0;i<8;i++){const mid=(lo+hi)/2,x=await toBlob(c,type,mid);if(x.size<=target){best=x;lo=mid}else hi=mid}if(best)b=best}
if(b.size>=file.size)return {blob:file,kept:true,type};
return {blob:b,kept:false,type};
}
function init(){const input=$('#fileInput'),drop=$('#dropzone'),pick=$('.chooseBtn'),summary=$('#fileSummary'),run=$('#processBtn'),results=$('#results'),zipBtn=$('#downloadZipBtn');if(!input||!drop||!run||!results)return;
input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.style.removeProperty('display');
const picker=()=>input.click();
pick?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();picker()});
drop.addEventListener('click',e=>{if(e.target.closest('button,input,a'))return;picker()});
drop.addEventListener('keydown',e=>{if(e.target===drop&&(e.key==='Enter'||e.key===' ')){e.preventDefault();picker()}});
for(const k of ['dragenter','dragover'])drop.addEventListener(k,e=>{e.preventDefault();drop.classList.add('dragover')});
for(const k of ['dragleave','drop'])drop.addEventListener(k,e=>{e.preventDefault();drop.classList.remove('dragover')});
function update(){const fs=state.files;results.replaceChildren();state.output=[];zipBtn?.classList.add('hidden');$('#compressionSummary')?.classList.add('hidden');run.disabled=!fs.length;summary.classList.toggle('show',!!fs.length);summary.replaceChildren();if(!fs.length)return;
const heading=document.createElement('strong');heading.textContent=fs.length+' image'+(fs.length===1?'':'s')+' ready';summary.append(heading);const list=document.createElement('div');list.className='selected-files-grid';fs.forEach((f,i)=>{const item=document.createElement('div');item.className='selected-file';const visual=document.createElement('div');visual.className='selected-file-thumb';const img=document.createElement('img');const preview=URL.createObjectURL(f);img.src=preview;img.alt='';img.onload=()=>URL.revokeObjectURL(preview);img.onerror=()=>{URL.revokeObjectURL(preview);visual.textContent='🖼️'};visual.append(img);const desc=document.createElement('div');desc.className='selected-file-info';const title=document.createElement('div');title.className='selected-file-name';title.textContent=f.name;title.title=f.name;const size=document.createElement('div');size.className='selected-file-size';size.textContent=fmt(f.size);desc.append(title,size);const remove=document.createElement('button');remove.type='button';remove.className='selected-file-remove';remove.textContent='×';remove.setAttribute('aria-label','Remove '+f.name);remove.onclick=()=>{state.files.splice(i,1);update()};item.append(visual,desc,remove);list.append(item)});summary.append(list);
}
function select(files){state.files=[...files].filter(f=>['image/jpeg','image/png','image/webp'].includes(f.type)||/\.(jpe?g|png|webp)$/i.test(f.name));update();}
input.addEventListener('change',()=>{select(input.files);input.value=''});
drop.addEventListener('drop',e=>select(e.dataTransfer.files));
$('#quality')?.addEventListener('input',e=>{const el=$('#qualityValue');if(el)el.textContent=e.target.value+'%'});
function addResult(f,blob,name,extra){const card=document.createElement('div');card.className='result-card';const img=document.createElement('img');img.className='thumb';img.alt='';const u=URL.createObjectURL(blob);img.src=u;const info=document.createElement('div');const t=document.createElement('div');t.className='result-name';t.textContent=name;const meta=document.createElement('div');meta.className='result-meta';meta.textContent=fmt(f.size)+' → '+fmt(blob.size)+(extra?' · '+extra:'');info.append(t,meta);const a=document.createElement('a');a.className='download';a.textContent='Download';a.href=u;a.download=name;card.append(img,info,a);results.append(card)}
run.addEventListener('click',async()=>{if(!state.files.length)return;run.disabled=true;results.replaceChildren();state.output=[];zipBtn?.classList.add('hidden');const q=Math.max(.2,Math.min(1,Number($('#quality')?.value||80)/100)),target=Math.max(0,Number($('#targetKB')?.value||0))*1024;let totalIn=0,totalOut=0;
for(const f of state.files){try{const out=await encode(f,q,target);const ext=out.type==='image/png'?'png':out.type==='image/webp'?'webp':'jpg',name=f.name.replace(/\.[^.]+$/,'')+'-compressed.'+ext;state.output.push({name,blob:out.blob});totalIn+=f.size;totalOut+=out.blob.size;addResult(f,out.blob,name,out.kept?'original kept':'compressed')}catch(e){const p=document.createElement('p');p.textContent=f.name+': '+e.message;results.append(p)}}
if(totalIn){const panel=$('#compressionSummary');panel?.classList.remove('hidden');const pct=Math.round((1-totalOut/totalIn)*100);if($('#compressionSaved'))$('#compressionSaved').textContent=pct+'% smaller';if($('#compressionSize'))$('#compressionSize').textContent=fmt(totalIn)+' → '+fmt(totalOut);if($('#originalSize'))$('#originalSize').textContent=fmt(totalIn);if($('#compressedSize'))$('#compressedSize').textContent=fmt(totalOut);if($('#originalBar'))$('#originalBar').style.width='100%';if($('#compressedBar'))$('#compressedBar').style.width=Math.max(3,totalOut/totalIn*100)+'%';}
if(state.output.length>1)zipBtn?.classList.remove('hidden');run.disabled=!state.files.length;
});
zipBtn?.addEventListener('click',async()=>{if(!window.JSZip){alert('ZIP download is unavailable. Please download individually.');return}zipBtn.disabled=true;try{const z=new window.JSZip();for(const item of state.output)z.file(item.name,item.blob);download(await z.generateAsync({type:'blob'}),'compressed-images.zip')}finally{zipBtn.disabled=false}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();