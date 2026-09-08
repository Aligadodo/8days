import { distance, p, type Navigation } from "../navigation";
import type { Point } from "../types";

export interface EquippedPet { id:string; species:"cat"|"dog"|"mouse"; name:string; }
export interface FollowingPet extends EquippedPet {
  point:Point; route:Point[]; speed:number; stride:number; direction:number; turnDelay:number; routeDelay:number;
}
/** Followers use the player's safe breadcrumb trail and the same continuous footprint collision as the player. */
export class PetFollowers {
  readonly pets=new Map<string,FollowingPet>();
  private trail:Point[]=[];
  reset(equipped:EquippedPet[],player:Point,nav:Navigation) {
    this.pets.clear();this.trail=[{...player}];this.sync(equipped,player,nav);
  }
  sync(equipped:EquippedPet[],player:Point,nav:Navigation) {
    const allowed=equipped.slice(0,3);
    for(const id of this.pets.keys())if(!allowed.some(p=>p.id===id))this.pets.delete(id);
    allowed.forEach((pet,index)=>{
      if(this.pets.has(pet.id))return;
      const offset=p(player.x+(index-1)*18,player.y+18);
      const point=nav.visible(player,offset)?offset:{...player};
      this.pets.set(pet.id,{...pet,point,route:[],speed:0,stride:0,direction:1,turnDelay:0,routeDelay:0});
    });
  }
  private behind(player:Point,lag:number) {
    let from=player;
    for(let index=this.trail.length-1;index>=0;index--){
      const target=this.trail[index],length=distance(from,target);
      if(length>=lag && length>0)return p(from.x+(target.x-from.x)*lag/length,from.y+(target.y-from.y)*lag/length);
      lag-=length;from=target;
    }
    return {...from};
  }
  update(delta:number,player:Point,nav:Navigation,called=false,blocked:(p:Point)=>boolean=()=>false) {
    if(!this.trail.length)this.trail.push({...player});
    if(distance(player,this.trail.at(-1)!)>=6){this.trail.push({...player});if(this.trail.length>420)this.trail.shift();}
    if(this.trail.length===1)return;
    [...this.pets.values()].forEach((pet,index)=>{
      const target=this.behind(player,(called?18:38)+index*(called?16:26));
      const separation=distance(pet.point,target);
      pet.turnDelay=Math.max(0,pet.turnDelay-delta);pet.routeDelay-=delta;
      if(separation<7){pet.route=[];pet.speed*=Math.exp(-delta*12);return;}
      if(pet.routeDelay<=0){
        pet.routeDelay=.35+index*.04;
        pet.route=nav.route(pet.point,target,blocked,0);
      }
      const maxSpeed=Math.min(225,80+separation*1.4);
      pet.speed+=((pet.route.length?maxSpeed:0)-pet.speed)*(1-Math.exp(-delta*7));
      let budget=pet.speed*delta;
      while(budget>0 && pet.route.length){
        const next=pet.route[0],length=distance(pet.point,next);
        if(length<.1){pet.route.shift();continue;}
        const step=Math.min(budget,length),candidate=p(pet.point.x+(next.x-pet.point.x)*step/length,pet.point.y+(next.y-pet.point.y)*step/length);
        if(!nav.visible(pet.point,candidate,blocked)){pet.route=[];pet.speed=0;break;}
        const dx=candidate.x-pet.point.x;
        if(Math.abs(dx)>.1 && pet.turnDelay<=0 && Math.abs(next.x-pet.point.x)>4){
          const direction=dx>0?1:-1;if(direction!==pet.direction){pet.direction=direction;pet.turnDelay=.28;}
        }
        pet.point=candidate;pet.stride+=step;budget-=step;if(step>=length-.01)pet.route.shift();
      }
    });
  }
}
