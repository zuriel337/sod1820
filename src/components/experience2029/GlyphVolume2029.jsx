import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { boundaryAnchor } from '../../lib/spatial/glyphGeometry.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// A bounded, disposable renderer of ONE selected glyph. No research state lives here.
export default function GlyphVolume2029({ geometry, reveal, view, theme, onUnavailable, onReady }) {
  const host = useRef(null);
  useEffect(() => {
    const node = host.current;
    let renderer, observer, frame = 0, stopped = false;
    const disposable = [];
    const dispose = () => { stopped=true; cancelAnimationFrame(frame); observer?.disconnect(); disposable.forEach(x=>x.dispose()); renderer?.dispose(); renderer?.domElement.remove(); };
    try {
      renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0,0);
      node.append(renderer.domElement);
      const canvas=renderer.domElement;
      canvas.setAttribute('aria-hidden','true');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32,1,1,3000);
      camera.position.set(0,0,800);
      const group = new THREE.Group(); scene.add(group);
      // Resolve CSS color-mix/current palette through an actual computed color.
      const colorOf = (variable) => { const probe=document.createElement('span'); probe.style.color=`var(${variable})`; node.append(probe); const c=new THREE.Color(getComputedStyle(probe).color); probe.remove(); return c; };
      const face = new THREE.MeshPhysicalMaterial({ color:colorOf('--s29-accent'), metalness:.28, roughness:.24, clearcoat:.85, clearcoatRoughness:.22 });
      const side = new THREE.MeshStandardMaterial({ color:colorOf('--s29-accent-secondary'), metalness:.4, roughness:.3 });
      disposable.push(face,side);
      const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${geometry.path}"/></svg>`);
      const shapes=data.paths.flatMap(path=>SVGLoader.createShapes(path));
      if (!shapes.length) throw new Error('Missing glyph topology');
      const [x0,y0,x1,y1]=geometry.bounds, scale=260/Math.max(x1-x0,y1-y0);
      const meshGeometry=new THREE.ExtrudeGeometry(shapes,{depth:110,bevelEnabled:true,bevelThickness:5,bevelSize:4,bevelSegments:3,curveSegments:24,steps:1});
      meshGeometry.translate(-(x0+x1)/2,-(y0+y1)/2,-55);
      meshGeometry.scale(scale,scale,scale);
      disposable.push(meshGeometry);
      const mesh=new THREE.Mesh(meshGeometry,[face,side]); group.add(mesh);
      if(reveal) {
        const anchor=boundaryAnchor(geometry,[0,-1]);
        const x=(anchor[0]-(x0+x1)/2)*scale,y=(anchor[1]-(y0+y1)/2)*scale;
        const lineGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y,55*scale),new THREE.Vector3(x,y-40,55*scale)]);
        const lineMaterial=new THREE.LineBasicMaterial({color:colorOf('--s29-discovery')});
        disposable.push(lineGeometry,lineMaterial);group.add(new THREE.Line(lineGeometry,lineMaterial));
      }
      group.rotation.set(view==='front'?0:-.12,view==='front'?0:-.38,0);
      scene.add(new THREE.HemisphereLight(0xffffff,0x404050,2.5));
      const key=new THREE.DirectionalLight(0xffffff,4); key.position.set(-250,350,500); scene.add(key);
      const rim=new THREE.DirectionalLight(colorOf('--s29-discovery'),3); rim.position.set(300,-50,150); scene.add(rim);
      const draw=()=>{ if (!stopped) renderer.render(scene,camera); };
      const resize=()=>{ const w=node.clientWidth,h=node.clientHeight; if(!w||!h)return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.position.z=Math.max(650,560/camera.aspect); camera.updateProjectionMatrix(); draw(); };
      observer=new ResizeObserver(resize); observer.observe(node); resize();
      // Drag starts only on actual ink, not the bounding rectangle or holes.
      const raycaster=new THREE.Raycaster(); let drag=null;
      const hit=(event)=>{ const r=canvas.getBoundingClientRect(); raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera); return raycaster.intersectObject(mesh).length>0; };
      const down=(event)=>{ if(event.button!==0 || !hit(event))return; drag={x:event.clientX,y:event.clientY,rx:group.rotation.x,ry:group.rotation.y}; canvas.setPointerCapture(event.pointerId); };
      const move=(event)=>{ if(!drag)return; group.rotation.y=THREE.MathUtils.clamp(drag.ry+(event.clientX-drag.x)*.006,-.85,.85); group.rotation.x=THREE.MathUtils.clamp(drag.rx+(event.clientY-drag.y)*.004,-.45,.45); cancelAnimationFrame(frame); frame=requestAnimationFrame(draw); };
      const up=()=>{drag=null;};
      const lost=(event)=>{event.preventDefault(); onUnavailable();};
      canvas.addEventListener('pointerdown',down); canvas.addEventListener('pointermove',move); canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up); canvas.addEventListener('lostpointercapture',up); canvas.addEventListener('webglcontextlost',lost);
      onReady();
      return ()=>{ canvas.removeEventListener('webglcontextlost',lost); dispose(); };
    } catch { dispose(); onUnavailable(); }
    return dispose;
  }, [geometry, reveal, view, theme, onUnavailable, onReady]);
  return <div className="sod29-glyph-volume" ref={host} />;
}
