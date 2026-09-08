import {writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const {default:p}=loadSource('src/campaign/exploration/day06.ts');
const room=p.room, world=room.world;
const pts=poly=>poly.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1600 900">
<image href="../../../public/assets/exploration-014/day06/shelter-v1.png" width="1600" height="900" preserveAspectRatio="none"/>
${world.regions.map(r=>`<polygon points="${pts(r.polygon)}" fill="#22ffaa" fill-opacity=".08" stroke="#22ffaa" stroke-width="2"/>`).join('')}
${world.obstacles.map(r=>`<polygon points="${pts(r.polygon)}" fill="#ff6655" fill-opacity=".15" stroke="#ff6655" stroke-width="2"><title>${esc(r.name)}</title></polygon>`).join('')}
${room.nodes.map(n=>`${n.baked?`<polygon points="${pts(n.baked)}" fill="none" stroke="#ffe599" stroke-width="2"/>`:''}<circle cx="${n.approach.x}" cy="${n.approach.y}" r="7" fill="#88ddff"/><text x="${n.approach.x+10}" y="${n.approach.y}" fill="white" font-size="13">${n.id}</text>`).join('')}
<circle cx="${world.approaches.exit.x}" cy="${world.approaches.exit.y}" r="9" fill="#ffffff"/>
${room.nodes.filter(n=>n.patrol).map(n=>`<polyline points="${pts([n.position,...n.patrol,n.position])}" fill="none" stroke="#df9aff" stroke-dasharray="6 4" stroke-width="3"/>`).join('')}
</svg>`;
writeFileSync('design/exploration-014/day06/navigation-overlay.svg',svg);
writeFileSync('design/exploration-014/day06/registration.json',JSON.stringify({sourceSize:[1672,941],worldSize:[1600,900],scale:[1600/1672,900/941],entry:room.entry,regions:world.regions,obstacles:world.obstacles,exit:{position:world.positions.exit,approach:world.approaches.exit,baked:world.baked.exit},nodes:room.nodes.map(({id,position,approach,baked,visual,patrol})=>({id,position,approach,baked,visual,patrol}))},null,2));
console.log('Saved navigation overlay and registration. No raster editing.');
