// Read-only authoring preview; serves existing rasters unchanged on an ephemeral port.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const cases=[
  ['DAY02 original','/assets/maps/day02-night-office.png',920,506,75,75],
  ['DAY02 opened','/assets/life-015/day02/copier-box-open-source.png',920,506,75,75],
  ['DAY04 original','/assets/exploration-014/day04/water-observatory.png',1112,276,68,62],
  ['DAY02 actual crop composite','/assets/maps/day02-night-office.png',920,506,75,75],
];
const html=`<!doctype html><meta charset="utf-8"><title>Life015 original / generated state QA</title><style>body{background:#222;color:white;font:16px sans-serif;display:grid;grid-template-columns:460px 460px;gap:20px}figure{margin:0} .clip{position:relative;overflow:hidden}img{position:absolute;max-width:none;image-rendering:pixelated}h2{font-size:20px}</style>${cases.map(([title,src,x,y,w,h])=>`<figure><h2>${title}</h2><div class="clip" style="width:${w*6}px;height:${h*6}px"><img src="${src}" style="width:${1672*6}px;height:${941*6}px;left:${-x*6}px;top:${-y*6}px">${title.includes('composite')?`<div style="position:absolute;left:${(932-x)*6}px;top:${(516-y)*6}px;width:${49*6}px;height:${56*6}px;overflow:hidden"><img src="/assets/life-015/day02/copier-box-open-source.png" style="width:${1672*6}px;height:${941*6}px;left:${-932*6}px;top:${-516*6}px"></div>`:''}</div></figure>`).join('')}`;
http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  const path=resolve('public',`.${decodeURIComponent(req.url)}`);
  if(!path.startsWith(resolve('public/assets')+'/')&&!path.startsWith(resolve('public/assets')+'\\')){res.writeHead(403);return res.end();}
  try{res.setHeader('Content-Type','image/png');res.end(readFileSync(path));}catch{res.writeHead(404);res.end();}
}).listen(0,'127.0.0.1',function(){console.log(`http://127.0.0.1:${this.address().port}`);});
