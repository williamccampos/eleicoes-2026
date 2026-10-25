import {STATES,stateColor} from './data.js';
const NS='http://www.w3.org/2000/svg';
const project=([lon,lat])=>[(lon+54)*Math.cos(15*Math.PI/180),lat+14.5];
const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
function center(f){
 const main=[...polygons(f)].sort((a,b)=>Math.abs(area(b[0]))-Math.abs(area(a[0])))[0][0].map(project);
 return [(Math.min(...main.map(p=>p[0]))+Math.max(...main.map(p=>p[0])))/2,(Math.min(...main.map(p=>p[1]))+Math.max(...main.map(p=>p[1])))/2];
}
function area(ring){return ring.reduce((a,p,i)=>{const q=ring[(i+1)%ring.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2;}
export async function createMap({stage,message,tooltip,select,describe}){
 const response=await fetch(new URL('./assets/brasil-uf-ibge.geojson',import.meta.url));if(!response.ok)throw new Error('Malha indisponível');
 const geo=await response.json();if(geo.features?.length!==27||STATES.some(s=>!geo.features.some(f=>String(f.properties.codarea)===s.id)))throw new Error('Malha incompleta');
 const features=geo.features.map(f=>({...f,state:STATES.find(s=>s.id===String(f.properties.codarea)),center:center(f)}));
 let records=new Map(),selected='sp',mode='3d',renderer=null,controls=null,scene=null,camera=null,three=null;
 const meshEntries=[],targets=[],svgPaths=new Map(),svg=document.createElementNS(NS,'svg');
 svg.classList.add('map-svg');svg.setAttribute('viewBox','-23 -23 46 46');svg.setAttribute('role','group');svg.setAttribute('aria-label','Mapa do Brasil por estado. Use Tab e Enter para selecionar.');
 function showTooltip(uf,event){tooltip.innerHTML=describe(uf);tooltip.hidden=false;const rect=stage.getBoundingClientRect();tooltip.style.left=Math.max(6,Math.min(event.clientX-rect.left+12,rect.width-225))+'px';tooltip.style.top=Math.max(4,Math.min(event.clientY-rect.top+12,rect.height-110))+'px';}
 for(const f of features){
  const path=document.createElementNS(NS,'path');path.setAttribute('d',polygons(f).map(p=>p.map(r=>r.map((point,i)=>{const [x,y]=project(point);return (i?'L':'M')+x.toFixed(4)+','+(-y).toFixed(4);}).join('')+'Z').join('')).join(''));
  path.setAttribute('fill-rule','evenodd');path.setAttribute('fill','#64788f');path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',f.state.name);path.addEventListener('click',()=>select(f.state.uf));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(f.state.uf);}});path.addEventListener('pointermove',e=>showTooltip(f.state.uf,e));path.addEventListener('pointerleave',()=>tooltip.hidden=true);svg.appendChild(path);svgPaths.set(f.state.uf,path);
 }
 for(const f of features){const label=document.createElementNS(NS,'text');label.textContent=f.state.uf.toUpperCase();const [x,y]=f.center;label.setAttribute('x',x+(f.state.uf==='df'?.7:0));label.setAttribute('y',-y+.25);svg.appendChild(label);}
 stage.appendChild(svg);
 function paint(){
  for(const f of features){const d=records.get(f.state.uf)?.data,path=svgPaths.get(f.state.uf);path.setAttribute('fill',stateColor(d));path.classList.toggle('selected',selected===f.state.uf);path.setAttribute('aria-pressed',String(selected===f.state.uf));path.setAttribute('aria-label',`${f.state.name}: ${describe(f.state.uf).replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ')}`);}
  for(const item of meshEntries){const d=records.get(item.uf)?.data,height=1.0+3.2*(d?.progress??0)/100,color=stateColor(d);item.group.scale.z=height;item.top.color.set(color);item.side.color.set(color).multiplyScalar(.55);item.lines.material.color.set(item.uf===selected?'#ffe19b':'#c0d0e0');item.lines.material.opacity=item.uf===selected?1:.22;item.label.position.z=height+.8;}
  if(renderer&&mode==='3d')renderer.render(scene,camera);
 }
 function setMode(next){mode=next==='3d'&&renderer?'3d':'2d';svg.style.display=mode==='3d'?'none':'';if(renderer){renderer.domElement.hidden=mode!=='3d';controls.enabled=mode==='3d';}document.getElementById('view-3d').setAttribute('aria-pressed',String(mode==='3d'));document.getElementById('view-2d').setAttribute('aria-pressed',String(mode==='2d'));tooltip.hidden=true;paint();}
 document.getElementById('view-3d').addEventListener('click',()=>setMode('3d'));document.getElementById('view-2d').addEventListener('click',()=>setMode('2d'));
 try{
  three=await import('three');const {OrbitControls}=await import('./assets/vendor/OrbitControls.js');
  renderer=new three.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=three.SRGBColorSpace;
  scene=new three.Scene();camera=new three.PerspectiveCamera(40,1,.1,200);camera.up.set(0,0,1);camera.position.set(0,-38,58);camera.lookAt(0,0,0);
  scene.add(new three.AmbientLight('#e7f1ff',2));const sun=new three.DirectionalLight('#ffffff',2.4);sun.position.set(-25,-10,50);scene.add(sun);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=35;controls.maxDistance=100;controls.minPolarAngle=.05;controls.maxPolarAngle=1.05;controls.rotateSpeed=.65;controls.zoomSpeed=.7;controls.saveState();controls.addEventListener('change',()=>{if(mode==='3d')renderer.render(scene,camera);});
  for(const f of features){
   const shapes=polygons(f).map(p=>{const shape=new three.Shape(p[0].map(point=>new three.Vector2(...project(point))));for(const ring of p.slice(1))shape.holes.push(new three.Path(ring.map(point=>new three.Vector2(...project(point)))));return shape;});
   const geometry=new three.ExtrudeGeometry(shapes,{depth:1,bevelEnabled:false,steps:1,curveSegments:1});const top=new three.MeshLambertMaterial({color:'#64788f'}),side=new three.MeshLambertMaterial({color:'#334358'}),mesh=new three.Mesh(geometry,[top,side]);mesh.userData.uf=f.state.uf;targets.push(mesh);
   const lines=new three.LineSegments(new three.EdgesGeometry(geometry,20),new three.LineBasicMaterial({color:'#c0d0e0',transparent:true,opacity:.22}));const group=new three.Group();group.add(mesh,lines);scene.add(group);
   const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const ctx=canvas.getContext('2d');ctx.font='700 34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#172d45';ctx.lineWidth=5;ctx.strokeText(f.state.uf.toUpperCase(),48,32);ctx.fillStyle='#edf4ff';ctx.fillText(f.state.uf.toUpperCase(),48,32);const texture=new three.CanvasTexture(canvas);texture.colorSpace=three.SRGBColorSpace;const label=new three.Sprite(new three.SpriteMaterial({map:texture,depthTest:false,transparent:true}));label.scale.set(1.8,1.2,1);label.position.set(f.center[0]+(f.state.uf==='df'?.6:0),f.center[1],1.5);scene.add(label);meshEntries.push({uf:f.state.uf,group,top,side,lines,label});
  }
  const canvas=renderer.domElement;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Mapa 3D interativo do Brasil. Arraste para girar. A seleção por teclado está disponível no seletor e na tabela de estados.');stage.appendChild(canvas);
  function resize(){const width=stage.clientWidth,height=stage.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();if(mode==='3d')renderer.render(scene,camera);}
  new ResizeObserver(resize).observe(stage);
  const ray=new three.Raycaster(),pointer=new three.Vector2();let down=null;
  function hit(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(targets,false)[0]?.object.userData.uf;}
  canvas.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];tooltip.hidden=true;});canvas.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){const uf=hit(e);if(uf)select(uf);}down=null;});canvas.addEventListener('pointercancel',()=>{down=null;tooltip.hidden=true;});canvas.addEventListener('pointermove',e=>{if(e.buttons){tooltip.hidden=true;return;}const uf=hit(e);canvas.style.cursor=uf?'pointer':'grab';if(uf)showTooltip(uf,e);else tooltip.hidden=true;});canvas.addEventListener('pointerleave',()=>tooltip.hidden=true);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setMode('2d');});
  document.getElementById('map-reset').addEventListener('click',()=>{controls.reset();tooltip.hidden=true;});
  resize();setMode('3d');
 }catch(error){
  if(renderer?.domElement.parentNode)renderer.domElement.remove();renderer?.dispose();renderer=null;setMode('2d');const button=document.getElementById('view-3d');button.disabled=true;button.textContent='3D indisponível';document.querySelector('.map-hint').textContent='Mapa 2D ativo neste navegador. Selecione um estado no mapa, no seletor ou na tabela.';
 }
 message.hidden=true;
 return {update(next,uf){records=next;selected=uf;paint();}};
}
