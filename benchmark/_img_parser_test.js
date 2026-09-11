const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','js','tools.js'),'utf8');
const start=src.indexOf('const IMAGE_SOURCE_PROBE_BYTES');
// find end of inspectRasterSource by brace matching from its declaration
const fstart=src.indexOf('function inspectRasterSource');
let i=src.indexOf('{',fstart),depth=0,end=-1;
for(;i<src.length;i++){ if(src[i]==='{')depth++; else if(src[i]==='}'){depth--; if(depth===0){end=i+1;break;}} }
const code=src.slice(start,end);
const fn=new Function(code+'\nreturn {inspectRasterSource, analyzeJpegSource, analyzePngSource, analyzeWebpSource, analyzeTiffSource, analyzeBmpSource};');
const api=fn();
function run(name,bytes,ext){ const r=api.inspectRasterSource(new Uint8Array(bytes),ext); console.log(name.padEnd(26),'ext='+ext,'supported='+r.supported,'preserve='+r.preserve, r.reason?('('+r.reason+')'):'', 'wh='+(r.width||'?')+'x'+(r.height||'?')); }
run('showcase_puppy.jpg', fs.readFileSync(path.join(__dirname,'..','assets','showcase_puppy.jpg')), 'jpg');
run('portrait_model.jpg', fs.readFileSync(path.join(__dirname,'..','assets','portrait_model.jpg')), 'jpg');
run('scratch_crop1.png', fs.readFileSync(path.join(__dirname,'..','scratch_crop1.png')), 'png');
run('snap_filterbar.png', fs.readFileSync(path.join(__dirname,'..','snap_filterbar.png')), 'png');
run('_a_cmyk.jpg', fs.readFileSync(path.join(__dirname,'samples','_a_cmyk.jpg')), 'jpg');
run('_a_16bit.png', fs.readFileSync(path.join(__dirname,'samples','_a_16bit.png')), 'png');
run('_a_anim.webp', fs.readFileSync(path.join(__dirname,'samples','_a_anim.webp')), 'webp');
