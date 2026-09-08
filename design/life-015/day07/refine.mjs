import {readFileSync,writeFileSync} from 'node:fs';
const f='src/campaign/life/day07.ts';let s=readFileSync(f,'utf8');
s=s.replace('position:p(494,571),approach:{x:449,y:575},baked:poly([[479,546],[499,539],[514,546],[514,566],[492,574],[479,568]])','position:exploration.outside[1].position,approach:exploration.outside[1].approach,baked:exploration.outside[1].baked!');
const a=s.indexOf(' n({id:"d07-life-cart-blue-box"'),b=s.indexOf('\n n({id:"d07-life-west-planter"',a);
s=s.slice(0,a)+` n({id:"d07-life-east-crate",title:"东站房窗下周转箱",kind:"container",position:p(1586,455),approach:p(1570,478),baked:poly([[1569,441],[1598,437],[1617,446],[1615,462],[1588,470],[1568,458]]),visual:ground("东站房右窗下原生低矮箱体，从箱南侧站台取站方共享包装余料，不挡木门",473),lootTable:"salvage",description:"站方允许取用窗下周转箱的一份包装余料。掀盖取用后合好，箱体继续留给车站周转。",emptyText:"这份包装余料已经领取，箱盖已合好，不会再次补发。"}),`+s.slice(b);
s=s.replace(' observe("cart-labels","d07-luggage-cart","检查整车行李的提手和封签。私人包裹只看外观，站方周转箱的包装余料可分别取用。"),\n','');writeFileSync(f,s);
