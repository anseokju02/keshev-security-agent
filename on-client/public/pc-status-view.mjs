// 이 PC의 조회 결과만 표시한다. SDP 연결 표시·AI 입력·원격 전송과 독립적이다.
const REASONS = {
  permission_denied: '읽기 권한이 없습니다. 관리자 권한으로 바꾸기 전에 담당자에게 확인하세요.',
  unsupported: '이 운영체제에서는 이 항목을 조회하지 않습니다.',
  query_failed: '조회 실패로 값을 읽지 못했습니다.',
  invalid_response: '응답 값이 올바르지 않습니다.',
  timeout: '조회 시간이 초과됐습니다. 잠시 후 다시 확인하세요.',
};
const bytes = n => `${(n / 1024 ** 3).toFixed(1)} GiB`;
const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const percent = n => number(n) && n <= 100;
const counter = n => Number.isSafeInteger(n) && n >= 0;

export function pcMetricText(key, metric) {
  if (metric?.state !== 'ok') return {text: '확인 불가', note: REASONS[metric?.reason] ?? '이번 조회에서 값을 확인하지 못했습니다. 다시 확인해 주세요.', state: 'unavailable'};
  let text, note;
  if (key === 'cpu' && percent(metric.usagePercent)) {
    text = `${metric.usagePercent.toFixed(1)}% 사용`; note = '짧은 구간의 실측값입니다. 계속 높으면 사용 중인 앱을 확인하세요.';
  } else if (key === 'memory' && number(metric.usedBytes) && number(metric.totalBytes) && metric.totalBytes > 0 && metric.usedBytes <= metric.totalBytes) {
    text = `${bytes(metric.usedBytes)} / ${bytes(metric.totalBytes)}`; note = metric.usedBytes / metric.totalBytes >= .85 ? '메모리 사용량이 높습니다. 필요한 작업을 저장하고 사용 중인 앱을 확인하세요.' : '사용 중인 메모리와 전체 메모리입니다.';
  } else if (key === 'disk' && number(metric.freeBytes) && number(metric.totalBytes) && metric.totalBytes > 0 && metric.freeBytes <= metric.totalBytes) {
    text = `${bytes(metric.freeBytes)} 여유 / ${bytes(metric.totalBytes)}`; note = metric.freeBytes / metric.totalBytes < .1 ? '남은 공간이 적습니다. 삭제하기 전에 파일을 확인하고 백업하세요.' : '현재 앱이 있는 디스크의 여유 공간입니다.';
  } else if (key === 'network' && counter(metric.interfaceCount) && counter(metric.ipv4Count)) {
    text = `네트워크 구성 · 인터페이스 ${metric.interfaceCount}개 · IPv4 구성 ${metric.ipv4Count}개`; note = '루프백을 제외한 로컬 인터페이스·IPv4 구성 수입니다. 유선·무선 종류, 인터넷 접속 성공, SDP 연결은 이 값으로 확인하지 않습니다.';
  } else if (key === 'firewall' && Array.isArray(metric.profiles) && metric.profiles.length === 3 && ['Domain', 'Private', 'Public'].every(name => metric.profiles.some(p => p.name === name && typeof p.enabled === 'boolean'))) {
    text = metric.profiles.map(p => `${p.name} ${p.enabled ? '켜짐' : '꺼짐'}`).join(' · '); note = 'Windows 방화벽 설정을 읽었습니다. 읽기 전용 · 앱이 방화벽이나 보안 설정을 바꾸지 않습니다. 보호 전체의 안전 판정은 아닙니다.';
  } else if (key === 'events' && counter(metric.warningCount) && counter(metric.errorCount) && metric.warningCount + metric.errorCount <= 5000 && metric.sampleLimit === 5000 && typeof metric.truncated === 'boolean') {
    text = `최근 24시간 경고 ${metric.warningCount}건 · 오류 ${metric.errorCount}건${metric.truncated ? ' (일부 집계)' : ''}`; note = `System·Application 기록을 최대 5,000건까지 읽습니다. 이 건수는 침해나 공격 탐지 결과가 아닙니다. ${typeof metric.since === 'string' && Number.isFinite(Date.parse(metric.since)) ? '집계 시작: ' + new Date(metric.since).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) + ' KST' : '집계 시작 시각 확인 불가'}`;
  }
  return text ? {text, note, state: 'measured'} : {text: '확인 불가', note: '응답의 값이나 단위를 확인할 수 없습니다. 정상으로 판단하지 마세요.', state: 'unavailable'};
}


export function sdpStatus(result) {
  const at=result?.data?.checkedAt, ms=typeof at==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(at)?Date.parse(at):NaN;
  if(result?.ok!==true||!Number.isFinite(ms)||Math.abs(Date.now()-ms)>60000)return {label:'SDP 확인 불가',reason:'응답 형식 또는 조회 시각을 확인하지 못했습니다.'};
  const engine=result.data.engine;
  if(engine?.mode==='disconnected'&&engine.code==='ENGINE_NOT_CONNECTED')return {label:'SDP 미연결',reason:'앱의 SDP 엔진 연결이 구성되지 않았습니다. PC 실측 성공과 별개입니다.',at};
  if(engine?.mode==='demo'&&engine.code==='DEMO_ONLY')return {label:'예제 자료 · 실제 SDP 연결 미확인',reason:'설명용 모드이며 실제 SDP 연결 결과가 아닙니다.',at};
  if(engine?.code==='ADAPTER_CONFIGURED')return {label:'SDP 확인 불가',reason:'어댑터 설정은 있으나 이 진단 응답만으로 실제 서버 연결 성공을 확인할 수 없습니다.',at};
  return {label:'SDP 확인 불가',reason:'알 수 없거나 서로 맞지 않는 엔진 상태입니다.',at};
}

const TITLES = {cpu:'CPU', memory:'메모리', disk:'디스크', firewall:'Windows 방화벽', network:'네트워크', events:'Windows 기록'};
const kst = at => new Date(at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) + ' KST';
export function comparisonValue(key, metric) {
  if (pcMetricText(key, metric).state !== 'measured') return null;
  if (key === 'cpu') return metric.usagePercent;
  if (key === 'memory') return metric.usedBytes / metric.totalBytes * 100;
  if (key === 'disk') return metric.freeBytes / 1024 ** 3;
  return null;
}
export function comparisonText(key, current, previous) {
  if (!Number.isFinite(current)) return '확인 불가 · 이번 값은 비교에서 제외';
  if (!previous) return '비교할 이전 실측 없음';
  if (!Number.isFinite(previous.value)) return '이전 조회 확인 불가 · 비교할 수 없음';
  const delta = current - previous.value;
  if(delta !== 0 && Math.abs(delta) < 0.05) return `이전 실측(${kst(previous.at)}) 대비 ${delta > 0 ? '증가' : '감소'} 0.1 ${key === 'disk' ? 'GiB' : '%p'} 미만`;
  return `이전 실측(${kst(previous.at)}) 대비 ${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${key === 'disk' ? 'GiB' : '%p'}`;
}
export function mountPcStatus(host, {fetchImpl = globalThis.fetch?.bind(globalThis), intervalMs = 10000, timeoutMs = 10000} = {}) {
  const doc=host.ownerDocument, win=doc.defaultView;
  const make=(tag,text='',cls='')=>{const n=doc.createElement(tag); n.textContent=text; if(cls)n.className=cls; return n;};
  const heading=make('h2','내 PC 상태 · 실측');
  const intro=make('p','제공된 PC 조회를 활용한 화면입니다. 아래 추이·이전 실측 비교·기록은 추가한 표시 기능입니다. 설명용 예시 값은 사용하지 않습니다.','muted');
  const refresh=make('button','내 PC 확인','btn'); refresh.type='button';
  const auto=doc.createElement('input'); auto.type='checkbox';
  const label=make('label','','pc-auto'); label.append(auto,doc.createTextNode(' 10초마다 확인 (탭이 보이는 동안)'));
  const status=make('p','아직 조회하지 않았습니다.','muted'); status.setAttribute('role','status');
  const grid=make('div','','pc-metrics'), rows=new Map();
  for(const [key,title] of Object.entries(TITLES)){
    const article=make('article','','pc-metric'),value=make('p','아직 조회하지 않음','pc-value'),note=make('p','','muted'),time=make('p','실측 시각 없음','pc-time'),compare=make('p','','pc-compare');
    article.append(make('h3',title),value,note,time,compare); grid.append(article);rows.set(key,{article,value,note,time,compare});
  }
  const trend=make('section','','pc-trend'),alerts=make('section','','pc-alerts'),history=make('section','','pc-history');
  const sdp=make('section','','pc-sdp'),sdpButton=make('button','SDP 상태 확인','btn'),sdpResult=make('p','SDP 확인 불가 · 아직 조회하지 않았습니다.');sdpButton.type='button';
  sdp.append(make('h3','SDP 서버 상태 · PC 조회와 별도'),make('p','이 버튼은 앱의 엔진 진단을 읽습니다. 방화벽·보안 설정을 변경하거나 연결을 새로 만들지 않습니다.','muted'),sdpButton,sdpResult);
  host.replaceChildren(heading,intro,refresh,label,status,grid,sdp,trend,alerts,history);
  const samples=[];let previous=null,disposed=false,controller=null,generation=0,timer=null;
  let sdpController=null,sdpGeneration=0;
  async function readSdp(){
    if(disposed||doc.hidden)return;sdpController?.abort();const own=++sdpGeneration,abort=new AbortController();sdpController=abort;sdpButton.disabled=true;sdpResult.textContent='SDP 상태 확인 중…';let timeout=false;
    const timer=win.setTimeout(()=>{timeout=true;abort.abort();},timeoutMs);
    try{const cancelled=new Promise((_,reject)=>abort.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));
      const result=await Promise.race([Promise.resolve().then(async()=>{const r=await fetchImpl('/api/diagnostics',{cache:'no-store',signal:abort.signal});if(!r.ok)throw Error('failed');return r.json();}),cancelled]);
      if(disposed||own!==sdpGeneration)return;const info=sdpStatus(result);sdpResult.textContent=info.label+' · '+info.reason+(info.at?' · 조회 '+kst(info.at):'');
    }catch{if(disposed||own!==sdpGeneration)return;sdpResult.textContent='SDP 확인 불가 · '+(timeout?'조회 시간 초과':'진단 요청 실패')+' · 미연결로 단정하지 않습니다.';}
    finally{win.clearTimeout(timer);if(!disposed&&own===sdpGeneration){sdpController=null;sdpButton.disabled=false;}}
  }
  sdpButton.addEventListener('click',readSdp);
  const stopTimer=()=>{if(timer!==null)win.clearTimeout(timer);timer=null;};
  function next(){stopTimer();if(!disposed&&auto.checked&&!doc.hidden)timer=win.setTimeout(()=>void read(),Math.max(10000,intervalMs));}
  function addRecord(record){samples.push(record);if(samples.length>30)samples.shift();renderRecords();}
  function renderRecords(){
    trend.replaceChildren(make('h3','CPU・메모리 실측 추이 · 최근 30회'),make('p','왼쪽이 오래된 조회입니다. 빈값은 0%로 그리지 않고 확인 불가로 표시합니다.','muted'));
    for(const key of ['cpu','memory']){
      const line=make('div','','pc-trend-row');line.append(make('strong',TITLES[key]));
      for(const sample of samples){const v=sample.values[key],point=make('span','','pc-point');
        if(Number.isFinite(v)){const bar=doc.createElement('meter');bar.min=0;bar.max=100;bar.value=v;bar.setAttribute('aria-label',`${TITLES[key]} ${kst(sample.at)} ${v.toFixed(1)}% 실측`);point.append(bar,make('small',`${v.toFixed(1)}%`));}
        else point.append(make('small','확인 불가'));
        point.title=kst(sample.at);line.append(point);
      }trend.append(line);
    }
    history.replaceChildren(make('h3','조회 기록 · 최근 30회'),make('p','실측은 현재 탭에서만 보관합니다. 새로고침하거나 탭을 닫으면 초기화됩니다.','muted'));
    for(const sample of [...samples].reverse()){
      const item=make('p',`${kst(sample.at)} · ${sample.ok?'실측':'조회 실패'} · ${sample.text}`);history.append(item);
    }
  }
  function unavailable(reason,record=true){
    const at=new Date().toISOString();
    for(const row of rows.values()){row.article.dataset.state='unavailable';row.value.textContent='확인 불가';row.note.textContent=reason;row.time.textContent=`조회 시도 ${kst(at)} · 실측 시각 없음`;row.compare.textContent='이번 값은 비교에서 제외';}
    alerts.replaceChildren(make('h3','주의 근거'),make('p','현재 조회 확인 불가 · 이전 주의 결과를 현재 판정으로 사용하지 않습니다.'));
    previous={at,values:{cpu:null,memory:null,disk:null}};
    if(record)addRecord({at,ok:false,values:{},text:reason});
  }
  function display(data){
    const values={},issues=[],texts=[];
    for(const [key,row] of rows){const metric=data.metrics?.[key],info=pcMetricText(key,metric);row.article.dataset.state=info.state;row.value.textContent=info.text;row.note.textContent=info.note;
      row.time.textContent=info.state==='measured'?`実測 ${kst(data.measuredAt)}`.replace('実測','실측'):`조회 ${kst(data.measuredAt)} · 이 항목의 실측 없음`;
      values[key]=comparisonValue(key,metric);
      row.compare.textContent=['cpu','memory','disk'].includes(key)?comparisonText(key,values[key],previous?{at:previous.at,value:previous.values[key]}:null):'';
      if(info.state!=='measured')issues.push(`${TITLES[key]} 확인 불가: ${info.note}`);
      if(['cpu','memory','disk'].includes(key))texts.push(`${TITLES[key]} ${info.text}${info.state!=='measured'?' ('+info.note+')':''}`);
    }
    if(Number.isFinite(values.memory)&&values.memory>=85)issues.push('메모리 실측 사용률 85% 이상');
    const disk=data.metrics?.disk;
    if(Number.isFinite(values.disk)&&disk.freeBytes/disk.totalBytes<.1)issues.push('디스크 실측 여유 10% 미만');
    alerts.replaceChildren(make('h3','주의 근거'),make('p',issues.length?issues.join(' · '):'이번 실측은 메모리 85% 이상·디스크 여유 10% 미만 기준에 해당하지 않습니다. 종합 안전 판정은 아닙니다.'));
    previous={at:data.measuredAt,values};addRecord({at:data.measuredAt,values,ok:true,text:texts.join(' · ')});
    status.textContent=`마지막 조회 ${kst(data.measuredAt)} · 출처: 이 앱을 실행한 PC · 디스크 범위: 앱이 있는 파일시스템`;
  }
  async function read(){
    if(disposed||doc.hidden)return;stopTimer();controller?.abort();const own=++generation,abort=new AbortController();controller=abort;refresh.disabled=true;status.textContent='이 PC에서 읽는 중…';
    let timedOut=false;const deadline=win.setTimeout(()=>{timedOut=true;abort.abort();},timeoutMs);
    try{
      const stopped=new Promise((_,reject)=>abort.signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));
      const result=await Promise.race([Promise.resolve().then(async()=>{const response=await fetchImpl('/api/pc/status',{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('failed');return response.json();}),stopped]);
      if(disposed||own!==generation)return;
      const data=result?.ok===true?result.data:null,ms=typeof data?.measuredAt==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(data.measuredAt)?Date.parse(data.measuredAt):NaN;
      if(data?.schema!=='aleph.on.pc-status.v1'||data.source!=='local-pc'||!Number.isFinite(ms)||Math.abs(Date.now()-ms)>60000)throw Error('stale');
      display(data);
    }catch{if(disposed||own!==generation)return;const reason=timedOut?'조회 시간 초과 · 새 실측을 받지 못했습니다.':'조회 실패 또는 응답의 출처·시각 확인 불가 · 앱 실행 상태를 확인해 주세요.';unavailable(reason);status.textContent=reason;}
    finally{win.clearTimeout(deadline);if(!disposed&&own===generation){controller=null;refresh.disabled=false;next();}}
  }
  const visibility=()=>{if(doc.hidden){sdpGeneration++;sdpController?.abort();sdpController=null;sdpButton.disabled=false;sdpResult.textContent='SDP 확인 불가 · 화면을 떠난 뒤 현재 연결을 재확인하지 않았습니다.';stopTimer();generation++;controller?.abort();controller=null;refresh.disabled=false;unavailable('탭이 보이지 않아 현재 조회를 중지했습니다.',false);status.textContent='화면을 보지 않는 동안 자동 확인을 멈췄습니다.';}else if(auto.checked)void read();};
  const onAuto=()=>{if(auto.checked)void read();else stopTimer();};
  refresh.addEventListener('click',read);auto.addEventListener('change',onAuto);doc.addEventListener('visibilitychange',visibility);
  const dispose=()=>{if(disposed)return;disposed=true;sdpGeneration++;sdpController?.abort();sdpButton.removeEventListener('click',readSdp);generation++;stopTimer();controller?.abort();refresh.removeEventListener('click',read);auto.removeEventListener('change',onAuto);doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',dispose);};
  win.addEventListener('pagehide',dispose,{once:true});renderRecords();
  return {read,readSdp,dispose};
}
