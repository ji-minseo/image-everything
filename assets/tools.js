const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const tool=document.body.dataset.tool||"";
const TOP_LINKS=[
["compress","🗜️ Compress","../compress-image/"],
["resize","↔️ Resize","../resize-image/"],
["crop","✂️ Crop","../crop-image/"],
["convert","🔁 Convert","../convert-image/"],
["webp","🟣 To WebP","../image-to-webp/"],
["jpg","🟡 WebP to JPG","../webp-to-jpg/"],
["rotate","↻ Rotate","../rotate-image/"],
["info","ⓘ Info","../image-info/"]
];

function formatBytes(bytes){
  if(bytes===0)return"0 B";
  const units=["B","KB","MB","GB"],i=Math.floor(Math.log(bytes)/Math.log(1024));
  return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
}
function baseName(name){return name.replace(/\.[^.]+$/,"")}
function extFor(type){return type==="image/jpeg"?"jpg":type==="image/png"?"png":type==="image/webp"?"webp":"img"}
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image"))};
    img.src=url;
  });
}
function canvasBlob(canvas,type,quality){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not create image")),type,quality));
}
function makeCanvas(img,w=img.naturalWidth,h=img.naturalHeight,type="image/png"){
  const c=document.createElement("canvas");c.width=w;c.height=h;
  const ctx=c.getContext("2d");
  if(type==="image/jpeg"){ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h)}
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(img,0,0,w,h);
  return c;
}
function ratioText(w,h){
  const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(w,h);
  return `${w/g}:${h/g}`;
}
function setSummary(file,img){
  const el=$("#fileSummary"); if(!el)return;
  el.classList.add("show");
  el.textContent=`${file.name} · ${img.naturalWidth}×${img.naturalHeight}px · ${formatBytes(file.size)}`;
}
function renderResult(file,blob,label){
  const box=$("#results"); if(!box)return;
  const card=document.createElement("div");card.className="result-card";
  const thumb=document.createElement("img");thumb.className="thumb";thumb.alt="";
  thumb.src=URL.createObjectURL(blob);
  const info=document.createElement("div");
  const pct=file.size?Math.round((1-blob.size/file.size)*100):0;
  info.innerHTML=`<div class="result-name">${label}</div><div class="result-meta">${formatBytes(file.size)} → ${formatBytes(blob.size)}${pct>0?` · ${pct}% smaller`:""}</div>`;
  const a=document.createElement("a");a.className="download";a.textContent="Download";a.href=URL.createObjectURL(blob);a.download=label;
  card.append(thumb,info,a);box.appendChild(card);
}
function resetResults(){const r=$("#results");if(r)r.innerHTML=""}
function initDropzone({multiple=false,accept="image/*",onFiles}={}){
  const dz=$("#dropzone"),input=$("#fileInput");
  if(!dz||!input)return;
  input.multiple=multiple;input.accept=accept;
  $(".chooseBtn")?.addEventListener("click",()=>input.click());
  dz.addEventListener("click",e=>{if(!e.target.closest("button"))input.click()});
  ["dragenter","dragover"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add("dragover")}));
  ["dragleave","drop"].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove("dragover")}));
  dz.addEventListener("drop",e=>onFiles([...e.dataTransfer.files].filter(f=>f.type.startsWith("image/"))));
  input.addEventListener("change",()=>onFiles([...input.files]));
}
function addBottomTabs(){
  const ad=$(".ad-slot"),top=$(".tool-tabs");if(!ad||!top)return;
  const wrap=document.createElement("section");wrap.className="more-tools";
  const label=document.createElement("div");label.className="more-tools-label";label.textContent="More image tools";
  const nav=top.cloneNode(true);nav.classList.add("bottom-tabs");nav.removeAttribute("aria-label");
  wrap.append(label,nav);ad.insertAdjacentElement("afterend",wrap);
}
addBottomTabs();

async function initCompress(){
  let files=[];
  initDropzone({multiple:true,onFiles:fs=>{files=fs;resetResults();$("#fileSummary").classList.add("show");$("#fileSummary").textContent=`${files.length} image${files.length===1?"":"s"} ready`;$("#processBtn").disabled=!files.length}});
  $("#quality")?.addEventListener("input",e=>$("#qualityValue").textContent=e.target.value+"%");
  $("#processBtn")?.addEventListener("click",async()=>{
    resetResults();$("#processBtn").disabled=true;
    const q=Number($("#quality").value)/100;
    for(const file of files){
      try{
        const img=await loadImage(file);
        let type=["image/jpeg","image/png","image/webp"].includes(file.type)?file.type:"image/jpeg";
        const canvas=makeCanvas(img,img.naturalWidth,img.naturalHeight,type);
        const blob=await canvasBlob(canvas,type,q);
        renderResult(file,blob,`${baseName(file.name)}-compressed.${extFor(type)}`);
      }catch(e){}
    }
    $("#processBtn").disabled=false;
  });
}
async function initResize(){
  let file=null,img=null,lock=true;
  initDropzone({onFiles:async fs=>{
    file=fs[0];if(!file)return;img=await loadImage(file);setSummary(file,img);
    $("#width").value=img.naturalWidth;$("#height").value=img.naturalHeight;$("#processBtn").disabled=false;
    const c=makeCanvas(img);c.className="preview-canvas";const wrap=$("#preview");wrap.innerHTML="";wrap.append(c);wrap.classList.add("show");
  }});
  $("#lock")?.addEventListener("change",e=>lock=e.target.checked);
  $("#width")?.addEventListener("input",()=>{if(lock&&img&&$("#width").value)$("#height").value=Math.max(1,Math.round(Number($("#width").value)*img.naturalHeight/img.naturalWidth))});
  $("#height")?.addEventListener("input",()=>{if(lock&&img&&$("#height").value)$("#width").value=Math.max(1,Math.round(Number($("#height").value)*img.naturalWidth/img.naturalHeight))});
  $("#processBtn")?.addEventListener("click",async()=>{
    if(!file||!img)return;resetResults();
    const w=Math.max(1,Number($("#width").value)||1),h=Math.max(1,Number($("#height").value)||1);
    const type=["image/jpeg","image/png","image/webp"].includes(file.type)?file.type:"image/png";
    const blob=await canvasBlob(makeCanvas(img,w,h,type),type,.92);
    renderResult(file,blob,`${baseName(file.name)}-${w}x${h}.${extFor(type)}`);
  });
}
async function initCrop(){
  let file=null,img=null;
  const updatePreview=()=>{
    if(!img)return;
    const x=Math.max(0,Number($("#cropX").value)||0),y=Math.max(0,Number($("#cropY").value)||0);
    const w=Math.max(1,Math.min(Number($("#cropW").value)||img.naturalWidth,img.naturalWidth-x));
    const h=Math.max(1,Math.min(Number($("#cropH").value)||img.naturalHeight,img.naturalHeight-y));
    const c=document.createElement("canvas");c.width=w;c.height=h;c.className="preview-canvas";
    c.getContext("2d").drawImage(img,x,y,w,h,0,0,w,h);
    const wrap=$("#preview");wrap.innerHTML="";wrap.append(c);wrap.classList.add("show");
  };
  initDropzone({onFiles:async fs=>{
    file=fs[0];if(!file)return;img=await loadImage(file);setSummary(file,img);
    $("#cropX").value=0;$("#cropY").value=0;$("#cropW").value=img.naturalWidth;$("#cropH").value=img.naturalHeight;
    $("#processBtn").disabled=false;updatePreview();
  }});
  ["#cropX","#cropY","#cropW","#cropH"].forEach(s=>$(s)?.addEventListener("input",updatePreview));
  $("#centerSquare")?.addEventListener("click",()=>{
    if(!img)return;const size=Math.min(img.naturalWidth,img.naturalHeight);
    $("#cropW").value=size;$("#cropH").value=size;$("#cropX").value=Math.round((img.naturalWidth-size)/2);$("#cropY").value=Math.round((img.naturalHeight-size)/2);updatePreview();
  });
  $("#processBtn")?.addEventListener("click",async()=>{
    if(!file||!img)return;resetResults();
    const x=Math.max(0,Number($("#cropX").value)||0),y=Math.max(0,Number($("#cropY").value)||0);
    const w=Math.max(1,Math.min(Number($("#cropW").value)||img.naturalWidth,img.naturalWidth-x));
    const h=Math.max(1,Math.min(Number($("#cropH").value)||img.naturalHeight,img.naturalHeight-y));
    const type=["image/jpeg","image/png","image/webp"].includes(file.type)?file.type:"image/png";
    const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");
    if(type==="image/jpeg"){ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h)}
    ctx.drawImage(img,x,y,w,h,0,0,w,h);
    const blob=await canvasBlob(c,type,.92);
    renderResult(file,blob,`${baseName(file.name)}-cropped.${extFor(type)}`);
  });
}
function initConvert(forceType=null,accept="image/*"){
  let files=[];
  initDropzone({multiple:true,accept,onFiles:fs=>{files=fs;resetResults();$("#fileSummary").classList.add("show");$("#fileSummary").textContent=`${files.length} image${files.length===1?"":"s"} ready`;$("#processBtn").disabled=!files.length}});
  $("#quality")?.addEventListener("input",e=>$("#qualityValue").textContent=e.target.value+"%");
  $("#processBtn")?.addEventListener("click",async()=>{
    resetResults();$("#processBtn").disabled=true;
    const q=Number($("#quality")?.value||92)/100,type=forceType||$("#format").value;
    for(const file of files){
      try{
        const img=await loadImage(file),canvas=makeCanvas(img,img.naturalWidth,img.naturalHeight,type);
        const blob=await canvasBlob(canvas,type,q);
        renderResult(file,blob,`${baseName(file.name)}.${extFor(type)}`);
      }catch(e){}
    }
    $("#processBtn").disabled=false;
  });
}
async function initRotate(){
  let file=null,img=null,angle=0,flipX=1,flipY=1;
  const draw=()=>{
    if(!img)return null;
    const swap=Math.abs(angle)%180===90,c=document.createElement("canvas");
    c.width=swap?img.naturalHeight:img.naturalWidth;c.height=swap?img.naturalWidth:img.naturalHeight;c.className="preview-canvas";
    const ctx=c.getContext("2d");ctx.translate(c.width/2,c.height/2);ctx.rotate(angle*Math.PI/180);ctx.scale(flipX,flipY);ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);return c;
  };
  const preview=()=>{const c=draw();if(!c)return;const w=$("#preview");w.innerHTML="";w.append(c);w.classList.add("show")};
  initDropzone({onFiles:async fs=>{file=fs[0];if(!file)return;img=await loadImage(file);angle=0;flipX=flipY=1;setSummary(file,img);$("#processBtn").disabled=false;preview()}});
  $("#left")?.addEventListener("click",()=>{angle=(angle-90)%360;preview()});
  $("#right")?.addEventListener("click",()=>{angle=(angle+90)%360;preview()});
  $("#flipH")?.addEventListener("click",()=>{flipX*=-1;preview()});
  $("#flipV")?.addEventListener("click",()=>{flipY*=-1;preview()});
  $("#processBtn")?.addEventListener("click",async()=>{
    if(!file||!img)return;resetResults();const c=draw();const type=["image/jpeg","image/png","image/webp"].includes(file.type)?file.type:"image/png";
    const blob=await canvasBlob(c,type,.92);renderResult(file,blob,`${baseName(file.name)}-edited.${extFor(type)}`);
  });
}
function initInfo(){
  initDropzone({multiple:true,onFiles:async files=>{
    const out=$("#results");out.innerHTML="";
    for(const file of files){
      try{
        const img=await loadImage(file),card=document.createElement("div");card.className="info-card";
        card.innerHTML=`<h2>${file.name}</h2><p>${img.naturalWidth} × ${img.naturalHeight}px · ${ratioText(img.naturalWidth,img.naturalHeight)} · ${formatBytes(file.size)} · ${file.type||"Unknown format"}</p>`;
        out.append(card);
      }catch(e){}
    }
  }});
}
if(tool==="compress")initCompress();
if(tool==="resize")initResize();
if(tool==="crop")initCrop();
if(tool==="convert")initConvert();
if(tool==="webp")initConvert("image/webp");
if(tool==="jpg")initConvert("image/jpeg","image/webp");
if(tool==="rotate")initRotate();
if(tool==="info")initInfo();