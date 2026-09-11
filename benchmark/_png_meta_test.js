const fs=require('fs'),path=require('path');
global.window={fflate:require('../vendor/fflate.js')};
const src=fs.readFileSync(path.join(__dirname,'..','js','tools.js'),'utf8');
const start=src.indexOf('const PNG_STATIC_CRC_TABLE');
const fstart=src.indexOf('function encodeIndexedPng');
let i=src.indexOf('{',fstart),depth=0,end=-1;
for(;i<src.length;i++){ if(src[i]==='{')depth++; else if(src[i]==='}'){depth--; if(depth===0){end=i+1;break;}} }
const api=new Function('window', src.slice(start,end)+'\nreturn {encodeIndexedPng};')(global.window);
const W=40,H=40; const rgba=new Uint8Array(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;rgba[o]=(x*6)&255;rgba[o+1]=(y*6)&255;rgba[o+2]=128;rgba[o+3]=(x+y<10?0:255);}
const png=api.encodeIndexedPng(rgba,W,H);
const types=[]; let off=8;
while(off+8<=png.length){const len=(png[off]<<24|png[off+1]<<16|png[off+2]<<8|png[off+3])>>>0;const t=String.fromCharCode(png[off+4],png[off+5],png[off+6],png[off+7]);types.push(t);off+=12+len;if(t==='IEND')break;}
const bad=types.filter(t=>['tEXt','iTXt','zTXt','tIME','eXIf'].includes(t));
console.log('indexed PNG chunks:',types.join(','));
console.log('metadata chunks present:',bad.length?bad.join(','):'NONE');
