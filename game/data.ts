/** Original, data-driven rules. All distances are world units; all times are seconds. */
export const WORLD = 4200;
export const CENTER = WORLD / 2;
export const RADIUS = 1950;
export const PLAYER_RADIUS = 13;
export const SPEED = 166;
export const TICK = 1 / 20;
export const CAPACITY = 64;
export const MAX_HUMANS = 8;
export const FLIGHT = 12;
export const RARITIES = ["Field", "Refined", "Prismatic", "Relic"] as const;
export const RARITY_COLORS = ["#c2d3c5", "#69dcae", "#9f9dff", "#ffc475"];
export const WEAPONS = [
 {name:"Flicker",class:"Sidearm",damage:19,interval:.30,mag:14,reload:1.15,spread:.035,range:450,pellets:1,recoil:.018,move:1,color:"#c3ddcd"},
 {name:"Needle",class:"Rapid",damage:12,interval:.085,mag:30,reload:1.65,spread:.095,range:425,pellets:1,recoil:.038,move:1.03,color:"#80e4c1"},
 {name:"Cinder",class:"Carbine",damage:24,interval:.175,mag:24,reload:1.9,spread:.036,range:660,pellets:1,recoil:.03,move:.96,color:"#ffbd75"},
 {name:"Stillpoint",class:"Precision",damage:62,interval:1.02,mag:5,reload:2.5,spread:.009,range:1000,pellets:1,recoil:.1,move:.87,color:"#b6afff"},
 {name:"Shatter",class:"Scatter",damage:10,interval:.85,mag:6,reload:2.15,spread:.24,range:290,pellets:7,recoil:.085,move:.96,color:"#f1c897"},
 {name:"Torrent",class:"Support",damage:17,interval:.12,mag:48,reload:3.2,spread:.065,range:610,pellets:1,recoil:.04,move:.84,color:"#9bd7ee"},
] as const;
export const ZONES = [
 {hold:65,shrink:40,r:1450,damage:1},
 {hold:60,shrink:40,r:1060,damage:2},
 {hold:55,shrink:40,r:710,damage:3},
 {hold:50,shrink:35,r:435,damage:5},
 {hold:45,shrink:30,r:220,damage:8},
 {hold:35,shrink:25,r:0,damage:16},
] as const; // 532 seconds including flight; matches can end earlier by elimination.
export type Rect = {x:number;y:number;w:number;h:number;kind:"wall"|"rock"|"crate";};
export const PLACES = [
 {x:700,y:650,name:"RELAY STATION",sub:"High-tier salvage"},
 {x:1800,y:650,name:"SUNKEN YARD",sub:"Close-quarters"},
 {x:670,y:1740,name:"CINDER PORT",sub:"Dense cover"},
 {x:1820,y:1730,name:"HALO LAB",sub:"Long sightlines"},
 {x:1300,y:1260,name:"THE OBSERVATORY",sub:"Island heart"},
].map(p=>({...p,x:p.x*WORLD/2600,y:p.y*WORLD/2600}));
export const BUILDINGS = PLACES.flatMap((p,pi)=>[0,1,2].map(i=>({x:p.x+(i-1)*155-60,y:p.y+(i%2)*140-55,w:112+(pi%2)*20,h:95,style:pi%3})));
// Roofless rooms with real door gaps: players can enter; walls occlude shots and bot vision.
export const WALLS:Rect[] = BUILDINGS.flatMap(b=>[
 {x:b.x,y:b.y,w:b.w,h:10,kind:"wall" as const},
 {x:b.x,y:b.y,w:10,h:b.h,kind:"wall" as const},
 {x:b.x+b.w-10,y:b.y,w:10,h:b.h,kind:"wall" as const},
 {x:b.x,y:b.y+b.h-10,w:b.w/2-22,h:10,kind:"wall" as const},
 {x:b.x+b.w/2+22,y:b.y+b.h-10,w:b.w/2-22,h:10,kind:"wall" as const},
]);
export const CRATES:Rect[] = PLACES.flatMap(p=>[0,1,2,3].map(i=>({x:p.x-110+i*68,y:p.y-120,w:26,h:30,kind:"crate" as const})));
export const ROCKS:Rect[] = Array.from({length:30},(_,i)=>{const a=i*2.39996,r=380+(i%5)*130;return{x:CENTER+Math.cos(a)*r,y:CENTER+Math.sin(a)*r,w:30+(i%3)*12,h:24+(i%4)*9,kind:"rock" as const}});
export const SOLIDS=[...WALLS,...CRATES,...ROCKS];
export const BOT_NAMES=["Kestrel","Moss","Flint","Sable","Rook","Echo","Drift","Cairn","Brine","Lumen","Briar","Wisp","Slate","Copper","Finch","Dune"];
export const COSMETICS=[{id:"copper",name:"Copper trail",xp:0,color:"#ffb56c"},{id:"jade",name:"Jade signal",xp:700,color:"#76edbb"},{id:"iris",name:"Iris wake",xp:2000,color:"#b6a4ff"},{id:"frost",name:"Frostline",xp:4500,color:"#b8e8f9"}];
export const DAILY=[{id:"matches",name:"Back to the island",target:3,unit:"matches",xp:180},{id:"defeats",name:"Make your mark",target:5,unit:"defeats",xp:220},{id:"survival",name:"Weather the storm",target:300,unit:"seconds survived",xp:200}];
export const rankName=(xp:number)=>xp<1000?"Cinder IV":xp<2500?"Cinder III":xp<5000?"Alloy II":xp<10000?"Prism I":"Eclipse";
