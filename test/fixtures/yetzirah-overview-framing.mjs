import {Euler,PerspectiveCamera,Vector3} from 'three';
import {viewportFov} from '../../src/components/books2029/yetzirahModels/sourceModels.js';
export function overviewBounds(width,height,fov=viewportFov(width,height,54)){
 const camera=new PerspectiveCamera(fov,width/height,.1,100);camera.position.set(0,1.1,8.8);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const rotation=new Euler(.14,-.32,0),projected=[];
 for(let i=0;i<22;i++){
  const angle=i/22*Math.PI*2,center=new Vector3(Math.cos(angle)*3.35,Math.sin(angle)*3.35,Math.sin(angle*3)*.7).applyEuler(rotation);
  for(const x of [-.36,0,.36])for(const y of [-.36,0,.36])for(const z of [-.36,0,.36])projected.push(center.clone().add(new Vector3(x,y,z)).project(camera));
 }
 return {x:Math.max(...projected.map(p=>Math.abs(p.x))),y:Math.max(...projected.map(p=>Math.abs(p.y))),zMin:Math.min(...projected.map(p=>p.z)),zMax:Math.max(...projected.map(p=>p.z))};
}
