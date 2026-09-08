import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { loadSource } from "../../../tests/load-source.mjs";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const { buildWorldNavigation } = loadSource(resolve(root, "src/campaign/worldGeometry.ts"));
const pack = loadSource(resolve(root, "src/campaign/exploration/day01.ts")).default;
const outdoor = loadSource(resolve(root, "src/campaign/worlds/day01.ts")).default;
const nav = buildWorldNavigation(pack.room.world, new Set());
const outside = buildWorldNavigation(outdoor, new Set());
const roomPoints = [pack.room.world.spawn, pack.room.world.approaches.exit, ...pack.room.nodes.map(n => n.approach)];
let pairs = 0;
for (const point of roomPoints) assert(nav.isWalkable(point), `Room stance ${JSON.stringify(point)}`);
for (let i = 0; i < roomPoints.length; i++) for (let j = i + 1; j < roomPoints.length; j++) {
  assert(nav.route(roomPoints[i], roomPoints[j], undefined, 0).length > 0, `Disconnected room pair ${i}/${j}`);
  pairs++;
}
for (const node of [pack.room.entry, ...pack.outside]) {
  assert(outside.isWalkable(node.approach), `Outdoor stance ${node.title}`);
  assert(outside.route(outdoor.spawn, node.approach, undefined, 0).length, `Outdoor initial reach ${node.title}`);
}
const negatives = [[500,450],[1100,290],[1410,650],[250,700],[950,310],[1400,240],[1415,385],[600,768]];
for (const [x,y] of negatives) assert(!nav.isWalkable({x:x*1600/1672,y:y*900/941}), `Furniture negative ${x},${y}`);
let animalSegments = 0;
for (const [nodes, navigation] of [[pack.room.nodes,nav], [pack.outside,outside]]) {
  for (const node of nodes) if (node.patrol) {
    for (let i = 0; i < node.patrol.length; i++) {
      assert(navigation.isWalkable(node.patrol[i]), `Animal ground ${node.id}`);
      assert(navigation.visible(node.patrol[i], node.patrol[(i+1)%node.patrol.length]), `Animal crosses furniture ${node.id}`);
      animalSegments++;
    }
  }
}
const ids = new Set([...pack.outside, ...pack.room.nodes].map(n => n.id));
assert.equal(ids.size, pack.outside.length + pack.room.nodes.length);
for (const node of [...pack.outside,...pack.room.nodes,...pack.achievements]) {
  assert(node.id.startsWith("d01-"));
  for (const required of node.requires ?? []) assert(ids.has(required), `Unknown prerequisite ${required}`);
}
assert(pack.room.nodes.filter(n => n.reward).length >= 3);
console.log(JSON.stringify({day:1, roomInteractions:pack.room.nodes.length, outdoorDiscoveries:pack.outside.length, rewards:pack.room.nodes.filter(n=>n.reward).length, achievements:pack.achievements.length, connectedRoomPairs:pairs, blockedFurnitureProbes:negatives.length, safeAnimalSegments:animalSegments, initialOutdoorEntry:true},null,2));
