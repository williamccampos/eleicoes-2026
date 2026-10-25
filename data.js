export const BASE='https://resultados.tse.jus.br/oficial';
export const DATE='25/10/2026';
export const INTERVAL=30000;
export const STATES=[
 ['12','ac','Acre'],['27','al','Alagoas'],['16','ap','Amapá'],['13','am','Amazonas'],['29','ba','Bahia'],['23','ce','Ceará'],['53','df','Distrito Federal'],['32','es','Espírito Santo'],['52','go','Goiás'],['21','ma','Maranhão'],['51','mt','Mato Grosso'],['50','ms','Mato Grosso do Sul'],['31','mg','Minas Gerais'],['15','pa','Pará'],['25','pb','Paraíba'],['41','pr','Paraná'],['26','pe','Pernambuco'],['22','pi','Piauí'],['33','rj','Rio de Janeiro'],['24','rn','Rio Grande do Norte'],['43','rs','Rio Grande do Sul'],['11','ro','Rondônia'],['14','rr','Roraima'],['42','sc','Santa Catarina'],['35','sp','São Paulo'],['28','se','Sergipe'],['17','to','Tocantins']
].map(([id,uf,name])=>({id,uf,name}));
export const colorFor=n=>({'13':'#dd4b65','22':'#388de8'}[String(n)]||'#9675df');
export const number=v=>v===undefined||v===null||v===''?null:Number.isFinite(Number(String(v).replace(',','.')))?Number(String(v).replace(',','.')):null;
export function electionFrom(config){
 const elections=config?.pl?.filter(p=>p.c==='ele2026'&&p.dt===DATE).flatMap(p=>p.e||[])||[];
 const election=elections.find(e=>String(e.t)==='2'&&e.abr?.some(a=>a.cp?.some(c=>String(c.cd)==='1')));
 if(!election||!/^\d+$/.test(String(election.cd)))throw new Error('O TSE ainda não disponibilizou a configuração presidencial do segundo turno de 25/10/2026.');
 return String(election.cd);
}
export const sourceUrl=(e,uf)=>`${BASE}/ele2026/${e}/dados/${uf}/${uf}-c0001-e${String(e).padStart(6,'0')}-u.json`;
export function normalize(j,uf,election){
 if(!j||String(j.ele)!==String(election)||String(j.t)!=='2'||j.f!=='o'||String(j.cdabr).toLowerCase()!==uf)throw new Error('Arquivo incompatível com o segundo turno presidencial e o local selecionado.');
 const office=j.carg?.find(c=>String(c.cd)==='1');
 if(!office||!j.s||!j.v)throw new Error('Formato de resultado não reconhecido.');
 const candidates=[];
 for(const a of office.agr||[])for(const p of a.par||[])for(const c of p.cand||[]){
  const id=String(c.sqcand||'');
  candidates.push({name:String(c.nmu||c.nm||''),number:String(c.n),party:String(p.sg||''),votes:number(c.vap),percent:number(c.pvap),sequence:number(c.seq),photo:/^\d+$/.test(id)?`${BASE}/ele2026/${election}/fotos/br/${id}.jpeg`:null,elected:c.e==='s'});
 }
 if(candidates.length!==2||new Set(candidates.map(c=>c.number)).size!==2||candidates.some(c=>!/^\d+$/.test(c.number)||!c.name||c.votes===null||c.votes<0||c.percent===null||c.percent<0||c.percent>100))throw new Error('O arquivo não contém os dois candidatos e votos válidos esperados para o segundo turno.');
 const progress=number(j.s.pst);
 if(progress===null||progress<0||progress>100)throw new Error('Percentual de seções inválido no arquivo.');
 candidates.sort((a,b)=>(a.sequence??999)-(b.sequence??999)||a.number.localeCompare(b.number));
 const date=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(j.dg||'');
 const generated=date&&/^\d{2}:\d{2}:\d{2}$/.test(j.hg||'')?Date.parse(`${date[3]}-${date[2]}-${date[1]}T${j.hg}-03:00`):null;
 return {uf,candidates,progress,sections:number(j.s.st),totalSections:number(j.s.ts),valid:number(j.v.vv),blank:number(j.v.vb),nullVotes:number(j.v.tvn),date:j.dg,time:j.hg,generated,completed:j.and==='f'||j.tf==='s',url:sourceUrl(election,uf)};
}
export function standing(d){
 if(!d)return {kind:'missing',leader:null,margin:0};
 if(d.candidates.reduce((s,c)=>s+c.votes,0)===0)return {kind:'waiting',leader:null,margin:0};
 const ranked=[...d.candidates].sort((a,b)=>b.votes-a.votes);
 if(ranked[0].votes===ranked[1].votes)return {kind:'tie',leader:null,margin:0};
 return {kind:'leading',leader:ranked[0],margin:Math.max(0,ranked[0].percent-ranked[1].percent)};
}
export function stateColor(d){
 const s=standing(d);if(s.kind==='tie')return '#d8b44f';if(!s.leader)return '#64788f';
 const base=colorFor(s.leader.number).slice(1).match(/../g).map(n=>parseInt(n,16));
 const t=.38+.62*Math.min(1,s.margin/50),neutral=[124,139,156];
 return '#'+base.map((v,i)=>Math.round(neutral[i]+(v-neutral[i])*t).toString(16).padStart(2,'0')).join('');
}
export const isStale=d=>Boolean(d&&!d.completed&&d.sections>0&&d.generated&&Date.now()-d.generated>300000);
export async function getJson(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok){const error=new Error(r.status===404?'Aguardando divulgação do TSE.':`Consulta indisponível (HTTP ${r.status}).`);error.status=r.status;throw error;}return await r.json();}
 catch(e){if(e.name==='AbortError')throw new Error('Tempo de resposta excedido. Nova tentativa automática.');if(e instanceof TypeError)throw new Error('Falha de conexão com o TSE. Nova tentativa automática.');throw e;}
 finally{clearTimeout(timer);}
}
