import {loadSource} from '../../../tests/load-source.mjs';
const {contains}=loadSource('src/campaign/navigation.ts');
let overlaps=0;
for(const day of ['01','03']){const {default:life}=loadSource(`src/campaign/life/day${day}.ts`),{default:exp}=loadSource(`src/campaign/exploration/day${day}.ts`),{default:w}=loadSource(`src/campaign/worlds/day${day}.ts`);
for(const [scene,nodes,old] of [['outside',life.outside,[...exp.outside,...Object.entries(w.baked).map(([id,baked])=>({id,baked}))]],['inside',life.inside,exp.room.nodes]])for(const n of nodes)for(const o of old){if(!o.baked)continue;let hits=0;for(let y=0;y<900;y+=2)for(let x=0;x<1600;x+=2)if(contains({x,y},n.baked)&&contains({x,y},o.baked))hits++;if(hits){overlaps++;console.log(day,scene,n.id,o.id,hits)}}
}

console.log(`2-unit grid overlap findings: ${overlaps}`);process.exitCode=overlaps?1:0;
