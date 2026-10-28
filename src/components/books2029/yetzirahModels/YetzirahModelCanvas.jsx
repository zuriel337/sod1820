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
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true,toneMapped:false}));
  sprite.position.set(...(point.labelPosition||[point.position[0],point.position[1]+.65,point.position[2]]));sprite.scale.set(...(point.labelScale||[2.05,1.025,1]));sprite.userData.componentId=point.id;
  return {sprite,canvas,texture,point};
}
function paintLabel(label,palette,selected,learning=false){
  const c=label.canvas.getContext('2d');c.clearRect(0,0,512,256);
  if(learning){c.fillStyle=palette.card;c.globalAlpha=.94;c.beginPath();c.roundRect(60,68,392,120,32);c.fill();c.globalAlpha=1;c.fillStyle=selected?palette.accentDiscovery:palette.ink;c.textAlign='center';c.direction='rtl';c.font=`500 64px ${TYPEFACE.ui}`;c.fillText(label.point.label,256,150);label.texture.needsUpdate=true;return;}
  c.fillStyle=palette.card;c.globalAlpha=.96;c.beginPath();c.roundRect(10,10,492,236,28);c.fill();c.globalAlpha=1;
  c.strokeStyle=selected?palette.accentDiscovery:palette.borderStrong;c.lineWidth=selected?10:3;c.stroke();
  c.fillStyle=palette.ink;c.textAlign='center';c.direction='rtl';c.font=`600 52px ${TYPEFACE.ui}`;c.fillText(label.point.label,256,label.point.seal?90:150);
  if(label.point.seal){c.font=`500 70px ${TYPEFACE.body}`;c.fillText(label.point.seal,256,190);}
  label.texture.needsUpdate=true;
}
export default function YetzirahModelCanvas(props){
  const host=useRef(null),controller=useRef(null),latest=useRef(props),lastRevision=useRef(props.viewRevision);latest.current=props;
  useEffect(()=>{
    const container=host.current,canvas=document.createElement('canvas');canvas.setAttribute('aria-label','המחשה מרחבית; אפשר לבחור גם ברשימת הרכיבים');canvas.setAttribute('role','img');container.appendChild(canvas);
    let renderer,controls,resize,frame=0,disposed=false,narrow=false,cameraTween=null,currentPair=props.cameraPair;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(CAMERA.fov,1,.1,100);camera.position.set(...CAMERA.position);camera.lookAt(...CAMERA.target);
    const nodes=[],edges=[],labels=[],hits=[],decorations=[],faces=[],directionLabels=[],halos=[];
    function disposeScene(){const resources=new Set();scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);for(const m of(Array.isArray(object.material)?object.material:[object.material]))if(m){if(m.map)resources.add(m.map);resources.add(m);}});resources.forEach(resource=>resource.dispose());}
    try{
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
      const p=latest.current.palette,lightInk=p.mode==='light'?p.card:p.ink;scene.add(new THREE.HemisphereLight(lightInk,p.cardSoft,2.2));const light=new THREE.DirectionalLight(lightInk,3);light.userData.role='key';light.position.set(4,7,6);scene.add(light);const rim=new THREE.DirectionalLight(p.accentSecondary,1.8);rim.userData.role='rim';rim.position.set(-5,1,-4);scene.add(rim);
      const geometry=modelGeometry(props.model);
      for(const point of geometry.points){
        const mesh=new THREE.Mesh(point.shape==='tile'?new THREE.BoxGeometry(1.2,.16,1):point.shape==='ring'?new THREE.TorusGeometry(.48,.065,16,64):new THREE.SphereGeometry(.29,28,20),new THREE.MeshStandardMaterial({color:p.warmAccent,metalness:.48,roughness:.28,emissive:p.accentDiscovery,emissiveIntensity:0}));
        mesh.position.set(...point.position);mesh.userData.componentId=point.id;scene.add(mesh);nodes.push({mesh,point});hits.push(mesh);
        if(props.framing==='learning'){const halo=new THREE.Mesh(new THREE.TorusGeometry(.44,.012,8,64),new THREE.MeshBasicMaterial({color:p.accentDiscovery,transparent:true,opacity:.7,depthWrite:false}));halo.position.copy(mesh.position);scene.add(halo);halos.push({mesh:halo,id:point.id});}
        if(point.showLabel!==false){const label=labelSprite(point);scene.add(label.sprite);labels.push(label);hits.push(label.sprite);}
      }
      for(const segment of geometry.segments||[]){const mesh=cylinder(segment.from,segment.to,.045,new THREE.MeshStandardMaterial({color:p.warmAccent,metalness:.48,roughness:.3}));mesh.userData.componentId=segment.id;scene.add(mesh);nodes.push({mesh,point:segment,segment:true});hits.push(mesh);const label=labelSprite(segment);scene.add(label.sprite);labels.push(label);hits.push(label.sprite);}
      if(geometry.cubeRadius){const r=geometry.cubeRadius;for(const [direction,v]of Object.entries(DIRECTION_VECTORS)){const face=new THREE.Mesh(new THREE.PlaneGeometry(2*r,2*r),new THREE.MeshBasicMaterial({color:p.accentDiscovery,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));face.position.set(...v.map(n=>n*r));if(v[0])face.rotation.y=Math.PI/2;if(v[1])face.rotation.x=Math.PI/2;scene.add(face);faces.push({mesh:face,direction});const annotation=labelSprite({label:DIRECTION_LABELS[direction],position:v.map(n=>n*(r+.75)),id:null});annotation.sprite.scale.set(1.25,.625,1);scene.add(annotation.sprite);directionLabels.push({...annotation,direction});}}
      for(const edge of geometry.edges){const mesh=cylinder(edge.from,edge.to,.016,new THREE.MeshStandardMaterial({color:p.inkSoft,transparent:true,opacity:.4,metalness:.3,roughness:.45}));scene.add(mesh);edges.push({mesh,edge});}
      if(geometry.orientationCenter){const ring=new THREE.Mesh(new THREE.TorusGeometry(.24,.018,8,64),new THREE.MeshBasicMaterial({color:p.inkSoft,transparent:true,opacity:.45}));ring.rotation.x=Math.PI/2;scene.add(ring);decorations.push(ring);}
      if(props.framing==='learning'){const floor=new THREE.GridHelper(7.2,16,p.inkSoft,p.inkSoft);floor.position.y=-2.85;floor.material.transparent=true;floor.material.opacity=.12;floor.material.depthWrite=false;scene.add(floor);decorations.push(floor);}
      controls=new OrbitControls(camera,canvas);controls.target.set(...CAMERA.target);controls.minDistance=6;controls.maxDistance=17;controls.enablePan=false;controls.autoRotateSpeed=.35;
      if(props.framing==='learning'&&props.savedViewRef?.current){camera.position.fromArray(props.savedViewRef.current.position);controls.target.fromArray(props.savedViewRef.current.target);}
      const request=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(draw);};
      function draw(){frame=0;if(disposed)return;const now=latest.current;controls.autoRotate=now.rotate&&!now.reducedMotion&&!cameraTween;controls.enableDamping=!now.reducedMotion&&!cameraTween;if(cameraTween){const t=now.reducedMotion?1:Math.min(1,(performance.now()-cameraTween.started)/550);camera.position.lerpVectors(cameraTween.from,cameraTween.to,t*t*(3-2*t));if(t===1)cameraTween=null;}const changed=controls.update();let settling=false;if(now.framing==='learning')nodes.forEach(({mesh,segment})=>{if(segment)return;const target=mesh.userData.targetScale||1;const delta=target-mesh.scale.x;if(Math.abs(delta)>.001){mesh.scale.setScalar(now.reducedMotion?target:mesh.scale.x+delta*.18);settling=!now.reducedMotion;}});halos.forEach(({mesh})=>mesh.quaternion.copy(camera.quaternion));renderer.render(scene,camera);canvas.dataset.frameCount=String(Number(canvas.dataset.frameCount||0)+1);canvas.dataset.rotation=controls.autoRotate?'running':'off';canvas.dataset.cameraMotion=cameraTween?'moving':'settled';if(controls.autoRotate||changed||settling||cameraTween)request();}
      const update=()=>{
        const {palette,selectedId,isolated,focusIds,framing,revealedIds,cameraPair}=latest.current;
        for(const light of scene.children){if(light.isHemisphereLight){light.color.set(palette.mode==='light'?palette.card:palette.ink);light.groundColor.set(palette.cardSoft);}if(light.isDirectionalLight)light.color.set(light.userData.role==='rim'?palette.accentSecondary:palette.mode==='light'?palette.card:palette.ink);}decorations.forEach(d=>d.material.color.set(palette.inkSoft));
        const inFocus=id=>focusIds?.length?focusIds.includes(id):id===selectedId;
        const revealed=id=>!revealedIds||revealedIds.includes(id);
        nodes.forEach(({mesh,point})=>{const chosen=selectedId===point.id;mesh.material.color.set(chosen?palette.accentDiscovery:framing==='learning'&&inFocus(point.id)?palette.accentSecondary:palette.warmAccent);if(mesh.material.emissive){mesh.material.emissive.set(palette.accentDiscovery);mesh.material.emissiveIntensity=chosen?.35:0;}const scale=point.from?1:(chosen?1.18:1);if(framing==='learning')mesh.userData.targetScale=scale;else mesh.scale.setScalar(scale);mesh.visible=revealed(point.id)&&(!isolated||!selectedId||inFocus(point.id));});
        labels.forEach(label=>{label.sprite.visible=revealed(label.point.id)&&(framing==='learning'?(!narrow||inFocus(label.point.id)):!narrow)&&(geometry.kind!=='boundaries'||label.point.id===selectedId)&&(!isolated||!selectedId||inFocus(label.point.id));paintLabel(label,palette,label.point.id===selectedId,framing==='learning');});
        halos.forEach(({mesh,id})=>{mesh.visible=revealed(id)&&inFocus(id);mesh.material.color.set(id===selectedId?palette.accentDiscovery:palette.accentSecondary);});
        const selected=geometry.segments?.find(s=>s.id===selectedId);faces.forEach(f=>{f.mesh.visible=Boolean(selected?.directions.includes(f.direction));f.mesh.material.color.set(palette.accentDiscovery);});directionLabels.forEach(l=>{l.sprite.visible=!narrow;paintLabel(l,palette,Boolean(selected?.directions.includes(l.direction)));});
        edges.forEach(({mesh,edge})=>{const focused=nodes.some(n=>inFocus(n.point.id)&&(n.point.position===edge.from||n.point.position===edge.to));const shown=nodes.some(n=>n.mesh.visible&&(n.point.position===edge.from||n.point.position===edge.to));mesh.material.color.set(framing==='learning'&&focused?palette.accentDiscovery:palette.inkSoft);mesh.material.opacity=framing==='learning'?(focused?.9:.22):.4;mesh.scale.set(framing==='learning'&&focused?1.8:1,1,framing==='learning'&&focused?1.8:1);mesh.visible=(framing!=='learning'||shown)&&(!isolated||!selectedId||focused);});
        if(framing==='learning'&&currentPair!==cameraPair){currentPair=cameraPair;const direction=new THREE.Vector3(...(cameraPair===3?[3.5,4.5,10]:cameraPair===4?[10,4.5,3.5]:CAMERA.position));const to=direction.normalize().multiplyScalar(camera.position.distanceTo(controls.target));if(latest.current.reducedMotion)camera.position.copy(to);else cameraTween={from:camera.position.clone(),to,started:performance.now()};}
        canvas.dataset.visibleComponents=JSON.stringify([...new Set(nodes.filter(n=>n.mesh.visible).map(n=>n.point.id))]);
        canvas.dataset.viewZoom=String(latest.current.viewZoom||0);
        request();
      };
      const reset=(home=true)=>{cameraTween=null;if(latest.current.framing==='learning'){const half=Math.min(THREE.MathUtils.degToRad(42)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(42)/2)*camera.aspect));const distance=THREE.MathUtils.clamp(3.65/Math.tan(half)*Math.pow(.88,latest.current.viewZoom||0),6,17);const direction=home?new THREE.Vector3(...CAMERA.position):camera.position.clone().sub(controls.target);camera.position.copy(direction.normalize().multiplyScalar(distance));controls.target.set(...CAMERA.target);camera.lookAt(...CAMERA.target);}else camera.position.set(...CAMERA.position);controls.update();update();};
      const fit=()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){narrow=width<480;camera.aspect=width/height;camera.fov=latest.current.framing==='learning'?42:viewportFov(width,height);camera.updateProjectionMatrix();renderer.setSize(width,height,false);if(latest.current.framing==='learning')reset(false);update();}};
      const stopTravel=()=>{cameraTween=null;};
      resize=new ResizeObserver(fit);resize.observe(container);controls.addEventListener('change',request);controls.addEventListener('start',stopTravel);
      let down=null;
      const onDown=e=>{down=[e.clientX,e.clientY];};
      const onUp=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)return;down=null;const b=canvas.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(hits,false).find(h=>h.object.visible);if(hit)latest.current.onSelect(hit.object.userData.componentId);};
      const lost=e=>{e.preventDefault();latest.current.onUnavailable('context_lost');};
      canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('webglcontextlost',lost);
      controller.current={update,reset};fit();update();canvas.dataset.renderState='ready';canvas.dataset.framing=props.framing||'catalog';
      return()=>{if(latest.current.savedViewRef)latest.current.savedViewRef.current={position:camera.position.toArray(),target:controls.target.toArray()};disposed=true;controller.current=null;cancelAnimationFrame(frame);resize.disconnect();controls.removeEventListener('change',request);controls.removeEventListener('start',stopTravel);controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('webglcontextlost',lost);disposeScene();renderer.renderLists.dispose();renderer.dispose();if(!renderer.getContext().isContextLost())renderer.forceContextLoss();canvas.remove();};
    }catch{
      disposed=true;cancelAnimationFrame(frame);resize?.disconnect();controls?.dispose();disposeScene();renderer?.dispose();if(renderer&&!renderer.getContext().isContextLost())renderer.forceContextLoss();canvas.remove();latest.current.onUnavailable('webgl_unavailable');
    }
  },[props.model]);
  useEffect(()=>controller.current?.update(),[props.selectedId,props.isolated,props.palette,props.rotate,props.reducedMotion,props.focusIds,props.revealedIds,props.cameraPair]);
  useEffect(()=>{if(props.framing==='learning')controller.current?.reset(false);},[props.viewZoom,props.framing]);
  useEffect(()=>{if(props.framing==='learning'&&lastRevision.current!==props.viewRevision)controller.current?.reset();lastRevision.current=props.viewRevision;},[props.viewRevision,props.framing]);
  return <div ref={host} className="ym-canvas" />;
}
