'use strict';
// Dependency-free, deterministic CodeSight icon rasterizer for VS Code Marketplace.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const size = 256;
const data = Buffer.alloc(size * (size * 4 + 1));
const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
function pixel(x,y,r,g,b,a=255) {
  const offset = y * (size * 4 + 1) + 1 + x * 4;
  data[offset]=clamp(r);data[offset+1]=clamp(g);data[offset+2]=clamp(b);data[offset+3]=clamp(a);
}
function triangle(x,y, ax,ay,bx,by,cx,cy) {
  const sign=(px,py,qx,qy,rx,ry)=>(px-rx)*(qy-ry)-(qx-rx)*(py-ry);
  const a=sign(x,y,ax,ay,bx,by),b=sign(x,y,bx,by,cx,cy),c=sign(x,y,cx,cy,ax,ay);
  return !(a<0||b<0||c<0) || !(a>0||b>0||c>0);
}
for(let y=0;y<size;y++) {
  for(let x=0;x<size;x++) {
    const dx=x-128,dy=y-128,d=Math.hypot(dx,dy);
    const rounded = x>=42&&x<=214&&y>=0&&y<=255 || x>=0&&x<=255&&y>=42&&y<=214 ||
      Math.hypot(x-(x<128?42:214),y-(y<128?42:214))<=42;
    if(!rounded){pixel(x,y,0,0,0,0);continue;}
    let color=[11,18,36];
    const angle=Math.atan2(dy,dx);
    if(d>=67&&d<=91&&!(angle>-.85&&angle<.85)) {
      const t=(y+x)/512;
      color=[105+20*t,56+96*t,241+12*t];
    }
    if(triangle(x,y,146,82,176,77,134,153)) color=[50,180,255];
    if(triangle(x,y,146,82,134,153,86,181)) color=[238,249,255];
    if(triangle(x,y,134,153,86,181,113,137)) color=[127,214,255];
    if(Math.hypot(x-128,y-128)<6) color=[15,37,81];
    pixel(x,y,...color);
  }
}
function chunk(type,body) {
  const length=Buffer.alloc(4);length.writeUInt32BE(body.length);
  const payload=Buffer.concat([Buffer.from(type),body]);
  let crc=0xffffffff;
  for(const byte of payload){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}
  const checksum=Buffer.alloc(4);checksum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([length,payload,checksum]);
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(data)),chunk('IEND',Buffer.alloc(0))]);
const output=path.resolve(__dirname,'../images/icon.png');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,png);
console.log('CodeSight marketplace icon generated:',output);
