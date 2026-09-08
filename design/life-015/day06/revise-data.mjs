import {readFileSync,writeFileSync} from 'node:fs';
const path='src/campaign/life/day06.ts';let s=readFileSync(path,'utf8');
s=s.replace(/  shared\('d06-worn-pack'.*\n/,`  shared('d06-worn-pack',{id:'d06-life-worn-pack',title:'旧登山包里的备用布料',kind:'container',lootTable:'cloth',description:'营地主人将旧包外袋中的备用布料赠给避雨旅人。解开外袋扣带，取一份，再把袋口扣回去；保留原来观察补线的发现。',emptyText:'这一份备用布料已取走，外袋已扣回，包和其余装备仍放在木凳上。'}),\n`);
s=s.replace(/  shared\('d06-camp-light'.*\n/,`  {id:'d06-life-bridge-knot',title:'吊桥东端的缆绳结',kind:'inspect',position:p(1306,580),approach:{x:1265,y:526},
    baked:poly([[1293,564],[1309,560],[1318,566],[1315,589],[1303,595],[1294,584]]),
    visual:{mount:'hanging',depth:609*Y,support:'吊桥东端靠岸木柱上缠绕的真实绳结，从桥头台阶看，不跨护栏或松绳'},
    description:'反复检查靠岸缆绳结的缠绕方向，保持绳结原状，不把桥索当作可回收纤维。',emptyText:'绳结仍绕在木柱上，桥索保持原状。'},\n`);
s=s.replace(/  shared\('d06-rain-petals'.*\n/,`  {id:'d06-life-bench-joint',title:'营地空凳面的接缝',kind:'inspect',position:p(1361,908),approach:{x:1283,y:853},
    baked:poly([[1333,901],[1350,891],[1375,904],[1375,913],[1360,922],[1335,914]]),
    visual:{mount:'table',depth:935*Y,support:'绿色背包左侧露出的原生木凳面，从凳西侧营地地面观察，轮廓与背包分开'},
    description:'看看空凳面的木板接缝是否积水，留出下一位旅人放东西的位置。',emptyText:'接缝里还有雨水，木凳继续留在原地。'},\n`);
s=s.replace(/  shared\('d06-blue-cape'.*\n/,`  {id:'d06-life-stove-poker',title:'炉侧直立火钳',kind:'inspect',position:p(619,371),approach:p(671,446),
    baked:poly([[613,252],[620,249],[627,271],[626,349],[619,371],[612,366],[616,337]]),
    visual:{mount:'ground',depth:390*Y,support:'炉体右侧真实直立火钳，从炉台与折巾凳南侧的木地板观察，不伸进火中'},
    description:'看看火钳摆放的位置与长柄，不触碰热端。它是照看炉火的共用工具，观察后原位保留。',emptyText:'火钳仍立在炉旁，长柄远离通行脚步。'},\n`);
s=s.replaceAll("lootTable:'salvage'","lootTable:'cloth'").replaceAll("lootTable:'mineral'","lootTable:'stone'").replaceAll("lootTable:'nature'","lootTable:'herbs'");
s=s.replaceAll('营地白花簇的落籽','营地花簇旁的芳香草').replaceAll('只拾花簇根旁已经落下的自然小物，不拔活花。雨水会慢慢带来下一批，在线等待至少五分钟。','从花簇旁的草丛采一小份芳香草，保留根部与完整白花。至少在线五分钟后再来。').replaceAll('眼前可拾的小物已经收好，等自然积落后再来。','这处芳香草已采过，留根休养，稍后再来。');
s=s.replaceAll('沥水盘边的回收小件','沥水盘边的备用擦靴布').replaceAll('山舍主人允许取走靴盘边留作回收的零碎小件。翻查这只已经敞开的浅盘，取一次共享回收物；靴子与盘本身留下。','山舍主人允许从已经敞开的浅盘边取一份备用擦靴布。取出布料后把靴子和盘留好，不拆靴带或翻鞋内。').replaceAll('浅盘边的共享回收份额已取完，靴子仍是主人的物品。','浅盘边的备用擦靴布已取完，靴与盘仍在原位。');
s=s.replaceAll('共享回收份额','共享布料份额').replaceAll('可用回收小料','可用布料边角').replaceAll('可用小料','布料边角').replaceAll('共享小料','共享布料').replaceAll('这一份','这一份');
writeFileSync(path,s);
