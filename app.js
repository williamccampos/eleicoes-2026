import {BASE,INTERVAL,STATES,colorFor,electionFrom,sourceUrl,normalize,standing,isStale,getJson} from './data.js';
const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('pt-BR'),pf=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),clock=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const count=v=>v===null||v===undefined?'—':fmt.format(v),pct=v=>v===null||v===undefined?'—':pf.format(v)+'%',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=new Map(['br',...STATES.map(s=>s.uf)].map(uf=>[uf,{data:null,error:null}]));
let election=null,busy=false,selected='sp',lastCheck=null,nextCheck=0,mapView=null,catalog=[],completedRequests=0;
function candidateHtml(c,detail=false){return `<div class="${detail?'state-candidate':'national-candidate'}" style="--color:${colorFor(c.number)}"><div class="candidate-top"><div class="portrait">${c.photo?`<img src="${esc(c.photo)}" alt="Foto oficial de ${esc(c.name)}" width="61" height="61" decoding="async" referrerpolicy="no-referrer">`:''}<span${c.photo?' hidden':''}>Sem foto</span></div><div><div class="candidate-party">${esc(c.party)} <span class="candidate-number">${esc(c.number)}</span></div><div class="candidate-name">${esc(c.name)}</div></div></div><div class="candidate-percent">${pct(c.percent)}${detail?`<small>${count(c.votes)} votos</small>`:''}</div>${detail?'':`<div class="candidate-votes">${count(c.votes)} votos${c.elected?' · Eleito pelo TSE':''}</div>`}<div class="candidate-track"><span style="width:${c.percent??0}%"></span></div></div>`;}
function wirePhotos(root){for(const img of root.querySelectorAll('.portrait img')){const fail=()=>{img.hidden=true;img.nextElementSibling.hidden=false;};img.addEventListener('error',fail,{once:true});if(img.complete&&!img.naturalWidth)fail();}}
function statusText(r){if(r.error&&!r.data)return r.error;if(!r.data)return 'Consultando TSE…';const d=r.data,s=standing(d);if(r.error)return 'Sem conexão · último dado recebido';if(isStale(d))return 'Aguardando atualização do TSE';if(s.kind==='waiting')return d.sections>0?'Sem votos válidos computados':'Aguardando início da apuração';if(s.kind==='tie')return 'Empate nos votos válidos';return d.completed?'Totalização encerrada pelo TSE':`${s.leader.name} lidera · +${pf.format(s.margin)} p.p.`;}
function sourceText(d){return d?`TSE: ${esc(d.date)} às ${esc(d.time)}`:'Sem arquivo recebido';}
function renderNational(){
 const r=records.get('br'),d=r.data;
 $('national-pct').textContent=pct(d?.progress);$('national-bar').style.width=(d?.progress??0)+'%';
 $('national-count').textContent=d?`${count(d.sections)} de ${count(d.totalSections)} seções`:statusText(r);
 $('national-time').textContent=d?`${sourceText(d)} · ${statusText(r)}`:'Horário de Brasília';
 if(d)catalog=d.candidates.map(c=>({...c,votes:null,percent:null,elected:false}));
 else if(!catalog.length){const other=[...records.values()].find(r=>r.data)?.data;if(other)catalog=other.candidates.map(c=>({...c,votes:null,percent:null,elected:false}));}
 const candidates=d?.candidates||catalog;
 $('national-candidates').innerHTML=candidates.length?candidates.map(c=>candidateHtml(c)).join(''):'<p class="muted">'+esc(statusText(r))+'</p>';wirePhotos($('national-candidates'));
 catalog.forEach((c,i)=>{$('candidate-column-'+(i+1)).textContent=c.name;});
 $('map-legend').innerHTML=catalog.map(c=>`<span><i style="background:${colorFor(c.number)}"></i>${esc(c.name)}</span>`).join('')+'<span><i style="background:#64788f"></i>Sem votos / sem dados</span><span><i style="background:#d8b44f"></i>Empate</span>';
}
function renderSelected(){
 const r=records.get(selected),d=r.data,s=standing(d);$('state-select').value=selected;
 const candidates=d?.candidates||catalog;
 $('state-result').innerHTML=`<div class="detail-state-progress"><strong>${pct(d?.progress)}</strong><span>das seções</span></div><div class="progress"><span style="width:${d?.progress??0}%"></span></div><p class="muted">${d?`${count(d.sections)} de ${count(d.totalSections)} seções`:'Aguardando dados oficiais'}</p><div class="detail-status" style="--leader-color:${s.leader?colorFor(s.leader.number):'#94a3b8'}">${esc(statusText(r))}</div><div class="detail-candidates">${candidates.map(c=>candidateHtml(c,true)).join('')}</div><div class="detail-totals"><div>Válidos<strong>${count(d?.valid)}</strong></div><div>Brancos<strong>${count(d?.blank)}</strong></div><div>Nulos<strong>${count(d?.nullVotes)}</strong></div></div><div class="detail-source">${sourceText(d)}${d?`<br><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Ver arquivo oficial ↗</a>`:''}${r.error&&d?'<br>Resultado preservado da última consulta bem-sucedida.':''}</div>`;
 wirePhotos($('state-result'));
}
const searchKey=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function renderTable(){
 const q=searchKey($('state-search').value.trim()),sort=$('state-sort').value;
 const states=STATES.filter(s=>searchKey(s.name+' '+s.uf).includes(q)).sort((a,b)=>sort==='progress'?(records.get(b.uf).data?.progress??-1)-(records.get(a.uf).data?.progress??-1)||a.name.localeCompare(b.name,'pt-BR'):sort==='margin'?standing(records.get(b.uf).data).margin-standing(records.get(a.uf).data).margin||a.name.localeCompare(b.name,'pt-BR'):a.name.localeCompare(b.name,'pt-BR'));
 $('state-rows').innerHTML=states.map(state=>{const r=records.get(state.uf),d=r.data,s=standing(d);return `<tr${state.uf===selected?' class="selected"':''}><td><button class="state-name-button" type="button" data-state="${state.uf}" aria-label="Ver resultado de ${esc(state.name)}"><span class="uf">${state.uf.toUpperCase()}</span>${esc(state.name)}</button></td><td>${pct(d?.progress)}<div class="cell-progress"><span style="width:${d?.progress??0}%"></span></div></td>${[0,1].map(i=>{const c=catalog[i],actual=c&&d?.candidates.find(x=>x.number===c.number);return `<td style="color:${c?colorFor(c.number):'#667489'}">${pct(actual?.percent)}<span class="cell-votes">${count(actual?.votes)} votos</span></td>`;}).join('')}<td><span class="cell-situation" style="--leader-color:${s.leader?colorFor(s.leader.number):s.kind==='tie'?'#d8b44f':'#94a3b8'}"><i></i>${esc(statusText(r))}</span></td><td class="cell-time">${d?`${esc(d.date)}<br>${esc(d.time)}`:'—'}</td></tr>`;}).join('');
 $('table-empty').hidden=states.length>0;
}
function renderConnection(){
 const all=[...records.values()],errors=all.filter(r=>r.error),old=all.filter(r=>isStale(r.data)),loaded=all.filter(r=>r.data),hasVotes=loaded.some(r=>standing(r.data).kind!=='waiting');
 const el=$('connection');el.className='connection'+(errors.length||old.length?' warn':loaded.length===28?' ok':'');
 el.textContent=busy?`Consultando TSE · ${completedRequests}/28`:errors.length?`${errors.length} consulta(s) indisponível(is)`:old.length?'Aguardando atualização do TSE':loaded.length===28?(hasVotes?'Conectado ao TSE':'TSE conectado · aguardando votos'):'Aguardando TSE';
 $('refresh').disabled=busy;
 const notice=$('notice');notice.hidden=!errors.length&&!old.length;
 notice.textContent=errors.length?'Algumas consultas estão indisponíveis. Resultados recebidos anteriormente são preservados com a hora original. Haverá nova tentativa automática.':old.length?'Alguns arquivos do TSE foram gerados há mais de 5 minutos. O painel continua consultando a fonte; confira o horário de cada estado.':'';
 const stateRecords=STATES.map(s=>records.get(s.uf));
 $('state-coverage').textContent=`${stateRecords.filter(r=>r.data).length}/27 UFs com arquivo · ${stateRecords.filter(r=>r.data?.sections>0).length} com seções apuradas`;
 if(lastCheck)$('last-check').textContent=`Última consulta: ${clock.format(lastCheck)} · ${document.hidden?'retoma ao voltar à página':busy?'consultando…':'próxima em '+Math.max(0,Math.ceil((nextCheck-Date.now())/1000))+'s'}`;
}
function selectState(uf){if(!STATES.some(s=>s.uf===uf))return;selected=uf;renderSelected();renderTable();mapView?.update(records,selected);}
function tooltip(uf){const state=STATES.find(s=>s.uf===uf),r=records.get(uf);return `<strong>${esc(state?.name)} · ${uf.toUpperCase()}</strong>${esc(statusText(r))}<br>${pct(r.data?.progress)} das seções<br>${sourceText(r.data)}`;}
async function refresh(){
 if(busy)return;busy=true;completedRequests=0;renderConnection();
 try{
  if(!election)election=electionFrom(await getJson(`${BASE}/comum/config/ele-c.json`));
  const queue=[...records.keys()];let cursor=0;
  async function worker(){while(cursor<queue.length){const uf=queue[cursor++],r=records.get(uf);try{r.data=normalize(await getJson(sourceUrl(election,uf)),uf,election);r.error=null;}catch(e){r.error=e.message;}completedRequests++;if(uf==='br'){renderNational();renderSelected();}renderConnection();}}
  await Promise.all(Array.from({length:7},worker));
 }catch(e){for(const r of records.values())r.error=e.message;}
 finally{busy=false;lastCheck=new Date();nextCheck=Date.now()+INTERVAL;renderNational();renderSelected();renderTable();renderConnection();mapView?.update(records,selected);$('announcement').textContent=`Consulta ao TSE realizada às ${clock.format(lastCheck)}.`;}
}
$('state-select').innerHTML=STATES.map(s=>`<option value="${s.uf}">${s.name} · ${s.uf.toUpperCase()}</option>`).join('');
$('state-select').value=selected;$('state-select').addEventListener('change',e=>selectState(e.target.value));
$('state-rows').addEventListener('click',e=>{const b=e.target.closest('[data-state]');if(b)selectState(b.dataset.state);});
$('state-search').addEventListener('input',renderTable);$('state-sort').addEventListener('change',renderTable);$('refresh').addEventListener('click',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('online',refresh);
setInterval(()=>{if(!document.hidden&&!busy&&nextCheck&&Date.now()>=nextCheck)refresh();renderConnection();},1000);
renderSelected();renderTable();refresh();
import('./map.js').then(async ({createMap})=>{mapView=await createMap({stage:$('map-stage'),message:$('map-message'),tooltip:$('map-tooltip'),select:selectState,describe:tooltip});mapView.update(records,selected);}).catch(()=>{$('map-message').textContent='Não foi possível carregar o mapa. Use a lista de estados abaixo.';});
