import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TYPEFACE} from '../../../lib/designTokens.js';
import {CAMERA,modelGeometry,viewportFov,DIRECTION_VECTORS,DIRECTION_LABELS} from './sourceModels.js';

function cylinder(from,to,radius,material){
  const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),12),material);
  mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
}
function labelSprite(point){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
  sprite.position.set(point.position[0],point.position[1]+.65,point.position[2]);sprite.scale.set(2.05,1.025,1);sprite.userData.componentId=point.id;
  return {sprite,canvas,texture,point};
}
function paintLabel(label,palette,selected){
  const c=label.canvas.getContext('2d');c.clearRect(0,0,512,256);
  c.fillStyle=palette.card;c.globalAlpha=.96;c.beginPath();c.roundRect(10,10,492,236,28);c.fill();c.globalAlpha=1;
  c.strokeStyle=selected?palette.accentDiscovery:palette.borderStrong;c.lineWidth=selected?10:3;c.stroke();
  c.fillStyle=palette.ink;c.textAlign='center';c.direction='rtl';c.font=`600 52px ${TYPEFACE.ui}`;c.fillText(label.point.label,256,label.point.seal?90:150);
  if(label.point.seal){c.font=`500 70px ${TYPEFACE.body}`;c.fillText(label.point.seal,256,190);}
  label.texture.needsUpdate=true;
}
export default function YetzirahModelCanvas(props){
  const host=useRef(null),controller=useRef(null),latest=useRef(props);latest.current=props;
  useEffect(()=>{
    const container=host.current,canvas=document.createElement('canvas');canvas.setAttribute('aria-label','המחשה מרחבית; אפשר לבחור גם ברשימת הרכיבים');canvas.setAttribute('role','img');container.appendChild(canvas);
    let renderer,controls,resize,frame=0,disposed=false;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(CAMERA.fov,1,.1,100);camera.position.set(...CAMERA.position);camera.lookAt(...CAMERA.target);
    const nodes=[],edges=[],labels=[],hits=[],decorations=[],faces=[],directionLabels=[];
    try{
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
      const p=latest.current.palette;scene.add(new THREE.HemisphereLight(p.ink,p.cardSoft,2.2));const light=new THREE.DirectionalLight(p.ink,3);light.position.set(4,7,6);scene.add(light);const rim=new THREE.DirectionalLight(p.accentSecondary,1.8);rim.position.set(-5,1,-4);scene.add(rim);
      const geometry=modelGeometry(props.model);
      for(const point of geometry.points){
        const mesh=new THREE.Mesh(new THREE.SphereGeometry(.29,28,20),new THREE.MeshStandardMaterial({color:p.warmAccent,metalness:.48,roughness:.28,emissive:p.accentDiscovery,emissiveIntensity:0}));
        mesh.position.set(...point.position);mesh.userData.componentId=point.id;scene.add(mesh);nodes.push({mesh,point});hits.push(mesh);
        const label=labelSprite(point);scene.add(label.sprite);labels.push(label);hits.push(label.sprite);
      }
      for(const segment of geometry.segments||[]){const mesh=cylinder(segment.from,segment.to,.045,new THREE.MeshStandardMaterial({color:p.warmAccent,metalness:.48,roughness:.3}));mesh.userData.componentId=segment.id;scene.add(mesh);nodes.push({mesh,point:segment,segment:true});hits.push(mesh);const label=labelSprite(segment);scene.add(label.sprite);labels.push(label);hits.push(label.sprite);}
      if(geometry.cubeRadius){const r=geometry.cubeRadius;for(const [direction,v]of Object.entries(DIRECTION_VECTORS)){const face=new THREE.Mesh(new THREE.PlaneGeometry(2*r,2*r),new THREE.MeshBasicMaterial({color:p.accentDiscovery,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));face.position.set(...v.map(n=>n*r));if(v[0])face.rotation.y=Math.PI/2;if(v[1])face.rotation.x=Math.PI/2;scene.add(face);faces.push({mesh:face,direction});const annotation=labelSprite({label:DIRECTION_LABELS[direction],position:v.map(n=>n*(r+.75)),id:null});annotation.sprite.scale.set(1.25,.625,1);scene.add(annotation.sprite);directionLabels.push({...annotation,direction});}}
      for(const edge of geometry.edges){const mesh=cylinder(edge.from,edge.to,.016,new THREE.MeshStandardMaterial({color:p.inkSoft,transparent:true,opacity:.4,metalness:.3,roughness:.45}));scene.add(mesh);edges.push({mesh,edge});}
      if(geometry.orientationCenter){const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.018,8,64),new THREE.MeshBasicMaterial({color:p.inkSoft,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;scene.add(ring);decorations.push(ring);}
      controls=new OrbitControls(camera,canvas);controls.target.set(...CAMERA.target);controls.minDistance=6;controls.maxDistance=17;controls.enablePan=false;controls.autoRotateSpeed=.35;
      const request=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(draw);};
      function draw(){frame=0;if(disposed)return;const now=latest.current;controls.autoRotate=now.rotate&&!now.reducedMotion;controls.enableDamping=!now.reducedMotion;const changed=controls.update();renderer.render(scene,camera);canvas.dataset.frameCount=String(Number(canvas.dataset.frameCount||0)+1);canvas.dataset.rotation=controls.autoRotate?'running':'off';if(controls.autoRotate||changed)request();}
      const update=()=>{
        const {palette,selectedId,isolated}=latest.current;
        nodes.forEach(({mesh,point})=>{const chosen=selectedId===point.id;mesh.material.color.set(chosen?palette.accentDiscovery:palette.warmAccent);if(mesh.material.emissive){mesh.material.emissive.set(palette.accentDiscovery);mesh.material.emissiveIntensity=chosen?.35:0;}mesh.scale.setScalar(point.from?1:(chosen?1.18:1));mesh.visible=!isolated||!selectedId||chosen;});
        labels.forEach(label=>{label.sprite.visible=(geometry.kind!=='boundaries'||label.point.id===selectedId)&&(!isolated||!selectedId||label.point.id===selectedId);paintLabel(label,palette,label.point.id===selectedId);});
        const selected=geometry.segments?.find(s=>s.id===selectedId);faces.forEach(f=>{f.mesh.visible=Boolean(selected?.directions.includes(f.direction));f.mesh.material.color.set(palette.accentDiscovery);});directionLabels.forEach(l=>paintLabel(l,palette,Boolean(selected?.directions.includes(l.direction))));
        edges.forEach(({mesh,edge})=>{mesh.material.color.set(palette.inkSoft);mesh.visible=!isolated||!selectedId||nodes.some(n=>n.point.id===selectedId&&(n.point.position===edge.from||n.point.position===edge.to));});
        request();
      };
      const fit=()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){camera.aspect=width/height;camera.fov=viewportFov(width,height);camera.updateProjectionMatrix();renderer.setSize(width,height,false);request();}};
      resize=new ResizeObserver(fit);resize.observe(container);controls.addEventListener('change',request);
      let down=null;
      const onDown=e=>{down=[e.clientX,e.clientY];};
      const onUp=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;down=null;const b=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(hits,false).find(h=>h.object.visible);if(hit)latest.current.onSelect(hit.object.userData.componentId);};
      const lost=e=>{e.preventDefault();latest.current.onUnavailable('context_lost');};
      canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('webglcontextlost',lost);
      controller.current={update};fit();update();canvas.dataset.renderState='ready';
      return()=>{disposed=true;controller.current=null;cancelAnimationFrame(frame);resize.disconnect();controls.removeEventListener('change',request);controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('webglcontextlost',lost);const resources=new Set();scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);for(const m of(Array.isArray(object.material)?object.material:[object.material]))if(m){if(m.map)resources.add(m.map);resources.add(m);}});resources.forEach(resource=>resource.dispose());renderer.renderLists.dispose();renderer.dispose();if(!renderer.getContext().isContextLost())renderer.forceContextLoss();canvas.remove();};
    }catch{
      disposed=true;cancelAnimationFrame(frame);resize?.disconnect();controls?.dispose();renderer?.dispose();renderer?.forceContextLoss();canvas.remove();latest.current.onUnavailable('webgl_unavailable');
    }
  },[props.model]);
  useEffect(()=>controller.current?.update(),[props.selectedId,props.isolated,props.palette,props.rotate,props.reducedMotion]);
  return <div ref={host} className="ym-canvas" />;
}
