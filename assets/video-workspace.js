(()=>{
"use strict";
const $=s=>document.querySelector(s), size=n=>n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(2)+" MB";
let files=[],outputs=[],urls=[];
const zipScript=document.createElement("script");zipScript.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";document.head.append(zipScript);
function cleanURLs(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[]}
function render(){cleanURLs();$("#queue").replaceChildren();files.forEach((f,i)=>{const item=document.createElement("div");item.className="media-item";const url=URL.createObjectURL(f);urls.push(url);const video=document.createElement("video");video.src=url;video.muted=true;video.preload="metadata";video.playsInline=true;video.setAttribute("aria-label","Preview of "+f.name);const info=document.createElement("div");const name=document.createElement("strong");name.textContent=f.name;const desc=document.createElement("small");desc.textContent=size(f.size);info.append(name,desc);const remove=document.createElement("button");remove.className="btn ghost";remove.textContent="Remove";remove.onclick=()=>{files.splice(i,1);outputs=[];$("#results").replaceChildren();render()};item.append(video,info,remove);$("#queue").append(item)});$("#run").disabled=!files.length;$("#count").textContent=files.length+" video"+(files.length===1?"":"s")+" selected"}
function add(fs){files.push(...[...fs].filter(f=>f.type.startsWith("video/")||/\.(mp4|mov|webm|m4v)$/i.test(f.name)));outputs=[];$("#results").replaceChildren();render()}
$("#files").addEventListener("change",e=>{add(e.target.files);e.target.value=""});const zone=$("#dropzone");zone.setAttribute("tabindex","0");zone.setAttribute("role","group");zone.onclick=e=>{if(e.target.closest("button, input, label, a"))return;$("#files").click()};zone.onkeydown=e=>{if(e.target!==zone||(e.key!=="Enter"&&e.key!==" "))return;e.preventDefault();$("#files").click()};zone.ondragover=e=>{e.preventDefault();zone.classList.add("dragover")};zone.ondragleave=()=>zone.classList.remove("dragover");zone.ondrop=e=>{e.preventDefault();zone.classList.remove("dragover");add(e.dataTransfer.files)};
function download(blob,name){const a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}
async function process(file){
if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw Error("This browser does not support local video recording.");
const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error("WebM encoding is unsupported in this browser.");
const source=document.createElement("video");const sourceURL=URL.createObjectURL(file);source.src=sourceURL;source.preload="auto";source.playsInline=true;source.muted=true;source.style.cssText="position:fixed;left:-9999px;top:0;width:2px;height:2px";document.body.append(source);
let recorder,frame,ctx,stream,sourceStream,audioContext;
try{
await new Promise((resolve,reject)=>{source.onloadedmetadata=resolve;source.onerror=()=>reject(Error("Unable to decode this video."))});
if(!Number.isFinite(source.duration)||source.duration<=0)throw Error("A finite-duration video is required.");
const maxWidth=Number($("#resolution").value);const ratio=Math.min(1,maxWidth/source.videoWidth);const w=Math.max(2,Math.floor(source.videoWidth*ratio/2)*2),h=Math.max(2,Math.floor(source.videoHeight*ratio/2)*2);
const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;ctx=canvas.getContext("2d");stream=canvas.captureStream(24);
const capture=source.captureStream||source.mozCaptureStream;
// When native captureStream is missing, try the Web Audio output path.
// Source must play for its native audio track to become available.
source.muted=false;source.volume=1;if(capture)sourceStream=capture.call(source);await source.play();
await new Promise(resolve=>setTimeout(resolve,150));
let audioTracks=sourceStream?sourceStream.getAudioTracks().filter(t=>t.readyState==="live"):[];
if(!audioTracks.length){
  // MediaStream capture frequently exposes no audio for MOV/MP4 in Chromium.
  // Route the media element through Web Audio rather than exporting silent output.
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(AudioCtx){
    try{
      audioContext=new AudioCtx();
      const sourceNode=audioContext.createMediaElementSource(source);
      const destination=audioContext.createMediaStreamDestination();
      sourceNode.connect(destination);
      await audioContext.resume();
      audioTracks=destination.stream.getAudioTracks().filter(t=>t.readyState==="live");
    }catch(_){audioTracks=[]}
  }
}
if(audioTracks.length)audioTracks.forEach(t=>stream.addTrack(t));
else throw Error("Audio capture is not supported for this file in this browser. Try Chrome or convert the MOV to MP4 first.");
const chunks=[];const bitrate=Number($("#bitrate").value)*1000000;
recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onerror=()=>reject(Error("Encoding failed."));recorder.onstop=()=>resolve(new Blob(chunks,{type:"video/webm"}))});
const draw=()=>{if(source.ended||source.paused)return;ctx.drawImage(source,0,0,w,h);frame=requestAnimationFrame(draw)};
recorder.start(1000);draw();
await new Promise((resolve,reject)=>{source.onended=resolve;source.onerror=()=>reject(Error("Video playback failed during encoding."))});cancelAnimationFrame(frame);if(recorder.state!=="inactive")recorder.stop();return await done;
}finally{if(frame)cancelAnimationFrame(frame);if(recorder&&recorder.state!=="inactive")recorder.stop();if(stream)stream.getTracks().forEach(t=>t.stop());if(sourceStream)sourceStream.getTracks().forEach(t=>t.stop());if(audioContext)await audioContext.close().catch(()=>{});source.pause();source.removeAttribute("src");source.load();source.remove();URL.revokeObjectURL(sourceURL)}
}
$("#run").onclick=async()=>{const run=$("#run");run.disabled=true;outputs=[];$("#results").replaceChildren();$("#zip").hidden=true;for(let i=0;i<files.length;i++){const f=files[i];$("#status").textContent="Encoding "+(i+1)+"/"+files.length+": "+f.name+" (real-time playback)";try{const blob=await process(f),name=f.name.replace(/\.[^.]+$/,"")+"-compressed.webm";outputs.push({blob,name});const line=document.createElement("div");line.className="media-item";const info=document.createElement("span");info.textContent=name+" · "+size(f.size)+" → "+size(blob.size)+(blob.size>=f.size?" · Output is not smaller":"");const btn=document.createElement("button");btn.className="btn";btn.textContent="Download";btn.onclick=()=>download(blob,name);line.append(info,btn);$("#results").append(line)}catch(e){const row=document.createElement("div");row.className="media-item video-result-error";row.setAttribute("role","alert");const icon=document.createElement("span");icon.className="video-error-icon";icon.textContent="!";const info=document.createElement("div");const title=document.createElement("strong");title.textContent=f.name;const detail=document.createElement("small");detail.textContent=e.message||"The video could not be compressed.";info.append(title,detail);row.append(icon,info);$("#results").append(row)}}$("#status").textContent=outputs.length+" of "+files.length+" completed";$("#zip").hidden=outputs.length<2;run.disabled=false};
$("#zip").onclick=async()=>{if(!window.JSZip){$("#status").textContent="ZIP library unavailable. Download files individually.";return}const z=new JSZip();outputs.forEach(x=>z.file(x.name,x.blob));download(await z.generateAsync({type:"blob"}),"compressed-videos.zip")};
})();
