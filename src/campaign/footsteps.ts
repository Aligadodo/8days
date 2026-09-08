import type { Point } from "./types";
import type { AudioEventId } from "../audio/AudioManager";

/** Sound follows the ground under the feet, not the whole room's theme. */
export function footstepFor(region: string, position: Point, sceneId?: string): AudioEventId {
  if (sceneId === "d03-room" && region === "工房木地板与温室陶砖地") {
    // Registered to the v2 painting's actual plank/tile seam: source (938,450) → (918,750).
    // This is an acoustic boundary only; it never expands navigation or changes collisions.
    const seamX = (938 - (position.y * 941 / 900 - 450) * 20 / 300) * 1600 / 1672;
    return position.x < seamX ? "footstep.wood" : "footstep.stone";
  }
  if (/石地|石砖|陶砖|地砖|石桥|石台|石阶|石门槛|水泥|混凝土|柏油|沥青|瓷砖/.test(region)) return "footstep.stone";
  if (/木地板|木地坪|木板|木栈|栈道|木廊|码头|桥/.test(region)) return "footstep.wood";
  return /花|草|山/.test(region) ? "footstep.grass" : "footstep.stone";
}
