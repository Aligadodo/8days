// Read-only scene composition preview; does not run the game or access saves.
import {writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const pack=loadSource('src/campaign/exploration/day08.ts').default;
const nodes=[...pack.room.nodes];
const points=poly=>poly.map(p=>`${p.x},${p.y}`).join(' ');
const view=`<!doctype html><meta charset="utf-8"><title>DAY08 静态拼接与站位审核</title>
<style>body{margin:0;background:#101421;color:#eee;font:16px sans-serif}header{padding:10px}button{margin:4px;padding:8px}svg{width:100%;display:block}text{font:bold 12px sans-serif;paint-order:stroke;stroke:#111;stroke-width:3px;fill:white}</style>
<header>DAY08 静态审核（不运行游戏，不访问存档）<button onclick="document.getElementById('patch').style.display=document.getElementById('patch').style.display==='none'?'':'none'">切换修复图</button><button onclick="document.getElementById('geometry').style.display=document.getElementById('geometry').style.display==='none'?'':'none'">切换碰撞/交互标定</button></header>
<svg viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg"><image href="../../../public${pack.room.background}" width="1600" height="900"/>
<defs><clipPath id="repair"><rect x="${1170*1600/1672}" y="${300*900/941}" width="${390*1600/1672}" height="${215*900/941}"/></clipPath></defs>
<image id="patch" href="../../../public/assets/exploration-014/day08/field-lab-watered.png" width="1600" height="900" clip-path="url(#repair)"/>
<g id="geometry" style="display:none">
${pack.room.world.regions.map(r=>`<polygon points="${points(r.polygon)}" fill="#48f8c012" stroke="#4fc"/>`).join('')}
${pack.room.world.obstacles.map(o=>`<polygon points="${points(o.polygon)}" fill="#f447" stroke="#f55"><title>${o.name}</title></polygon>`).join('')}
${nodes.map((n,i)=>`<g>${n.baked?`<polygon points="${points(n.baked)}" fill="none" stroke="#ffd85b"/>`:''}<line x1="${n.position.x}" y1="${n.position.y}" x2="${n.approach.x}" y2="${n.approach.y}" stroke="#ffe" stroke-dasharray="4 4"/><circle cx="${n.approach.x}" cy="${n.approach.y}" r="7" fill="#4fc"/><text x="${n.approach.x+10}" y="${n.approach.y}">${i+1} ${n.title}</text></g>`).join('')}
<polygon points="${points(nodes.find(n=>n.patrol).patrol)}" fill="none" stroke="#e8f" stroke-width="3"/>
</g></svg>`;
writeFileSync('design/exploration-014/day08/review.html',view);
console.log('Wrote DAY08 static review.html');
