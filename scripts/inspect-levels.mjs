import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/game/data/levels.generated.ts", import.meta.url), "utf8");
const levels = JSON.parse(src.match(/export const LEVELS = (\[[\s\S]*\]);/)[1]);
for (const id of [1,2,3,5,10,15,20,30,50,75,100,150,200,300,400,500]) {
  const l = levels[id-1];
  console.log("L"+id, "type="+l.t, "init="+l.ip.length, "shots="+l.q, "total="+(l.ip.length+l.q), "dir="+l.d, "sp="+l.sp);
}
let maxInit = 0, over15 = 0, over30 = 0;
for (const l of levels) {
  maxInit = Math.max(maxInit, l.ip.length);
  if (l.ip.length > 15) over15++;
  if (l.ip.length + l.q > 30) over30++;
}
console.log("maxInit="+maxInit, "levels>15init="+over15, "levels>30total="+over30);
