// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView({ api, onChange } = {}) {
  // 4일차: 제공 PC API를 재사용하는 학생 설명 영역. 수집·계정·보안 설정은 변경하지 않는다.
  let pcExplanation = {phase:'idle'}, lastPcSample = null, pcRequestId = 0;
  const makeStudentNode = (tag, text='') => { const n=document.createElement(tag); n.textContent=text; return n; };
  const studentTime = at => new Date(at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' KST';
  function studentChanged(){
    const active=document.activeElement, restore=active?.dataset?.studentPcAction==='refresh';
    if(typeof onChange==='function')onChange();
    if(restore&&!active.isConnected&&(!document.activeElement||document.activeElement===document.body)){
      document.querySelector('[data-student-pc-action="refresh"]')?.focus({preventScroll:true});
    }
  }
  const missingReason = reason => ({permission_denied:'일반 권한으로 읽을 수 없습니다. 권한을 높이지 말고 담당자에게 조회 범위를 확인해 주세요.',timeout:'조회 시간이 초과됐습니다. 앱 실행 상태를 확인한 뒤 다시 조회해 주세요.',unsupported:'현재 운영체제에서 지원하지 않는 항목입니다.',query_failed:'읽기 요청이 실패했습니다. 앱이 실행 중인지 확인한 뒤 다시 조회해 주세요.',invalid_response:'응답의 값 또는 단위를 확인하지 못했습니다. 다시 조회해 주세요.'}[reason]||'이번 값을 확인하지 못했습니다. 다시 조회하고 반복되면 담당자에게 알려 주세요.');
  function classifyStudentPc(result){
    const data=result?.ok===true?result.data:null, at=data?.measuredAt;
    if(!data){const code=typeof result?.error?.code==='string'&&/^[A-Z0-9_]{1,60}$/.test(result.error.code)?result.error.code:'QUERY_FAILED';return {phase:'error',code};}
    if(data.schema!=='aleph.on.pc-status.v1'||data.source!=='local-pc'||typeof at!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(at)||!Number.isFinite(Date.parse(at))||Math.abs(Date.now()-Date.parse(at))>60000)return {phase:'error',code:'RESPONSE_UNVERIFIED'};
    const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const metrics=data.metrics||{}, rows=[];
    for(const [key,label] of [['cpu','CPU'],['memory','메모리'],['disk','디스크']]){
      const m=metrics[key];let value=null,description='',unit=key==='disk'?'GiB':'%p';
      if(m?.state==='ok'){
        if(key==='cpu'&&finite(m.usagePercent)&&m.usagePercent<=100){value=m.usagePercent;description=`${value.toFixed(1)}% · 짧은 구간의 CPU 사용률`;}
        if(key==='memory'&&finite(m.usedBytes)&&finite(m.totalBytes)&&m.totalBytes>0&&m.usedBytes<=m.totalBytes){value=m.usedBytes/m.totalBytes*100;description=`${(m.usedBytes/1024**3).toFixed(1)} / ${(m.totalBytes/1024**3).toFixed(1)} GiB · 물리 메모리 사용률 ${value.toFixed(1)}%`;}
        if(key==='disk'&&finite(m.freeBytes)&&finite(m.totalBytes)&&m.totalBytes>0&&m.freeBytes<=m.totalBytes){value=m.freeBytes/1024**3;description=`여유 ${value.toFixed(1)} / ${(m.totalBytes/1024**3).toFixed(1)} GiB · 앱이 있는 파일시스템`;}
      }
      if(value===null){rows.push({key,label,value,description:'확인 불가',reason:missingReason(m?.state==='ok'?'invalid_response':m?.reason)});continue;}
      const before=lastPcSample?.rows.find(row=>row.key===key), delta=before?.value==null?null:value-before.value;
      const comparison=delta===null?'비교할 이전 유효 실측 없음':`이전 성공 조회(${studentTime(lastPcSample.at)}) 대비 `+(delta!==0&&Math.abs(delta)<.05?`${delta>0?'증가':'감소'} 0.1 ${unit} 미만`:`${delta>0?'+':''}${delta.toFixed(1)} ${unit}`);
      rows.push({key,label,value,description,comparison});
    }
    return {phase:'ok',at,rows};
  }
  async function refreshStudentPc(){
    if(pcExplanation.phase==='loading')return;
    const own=++pcRequestId;pcExplanation={phase:'loading'};studentChanged();let timer;
    try{
      const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve({ok:false,error:{code:'TIMEOUT'}}),12000);});
      const request=Promise.resolve().then(()=>api?.get?api.get('/api/pc/status'):{ok:false,error:{code:'STUDENT_API_UNAVAILABLE'}}).catch(()=>({ok:false,error:{code:'QUERY_FAILED'}}));
      const result=await Promise.race([request,timeout]);if(own!==pcRequestId)return;
      pcExplanation=classifyStudentPc(result);if(pcExplanation.phase==='ok')lastPcSample=pcExplanation;
    }finally{clearTimeout(timer);if(own===pcRequestId)studentChanged();}
  }
  function studentOverview(){
    const root=makeStudentNode('section');root.append(makeStudentNode('h3','히득키득 · 먼저 볼 핵심 기능 3가지'));
    const list=makeStudentNode('ol');
    for(const text of ['상태 카드 4개 — 제공 PC 영역에서 CPU·메모리·디스크 여유·방화벽을 확인하세요.','실측 추이와 기록 — 같은 영역 아래의 시각별 변화를 보세요.','주의 근거와 비교 설명 — 아래에서 읽지 못한 항목과 이전 성공 조회 대비 변화를 확인하세요.'])list.append(makeStudentNode('li',text));
    const link=makeStudentNode('a','위쪽 PC 상태·추이·기록으로 이동');link.href='#pc-status';root.append(list,link);return root;
  }
  function studentPcPanel(){
    const root=makeStudentNode('section');root.append(makeStudentNode('h3','내가 추가한 기능 · 실측 비교 설명'),makeStudentNode('p','제공된 학생 API의 PC 조회를 재사용합니다. 카드·그래프·수집기는 새로 만들지 않습니다. 이 영역만 다시 읽으며 제공 화면의 마지막 조회 값은 별도로 유지됩니다.'));
    const button=makeStudentNode('button','다시 조회 · 실측 비교 설명');button.type='button';button.className='btn';button.dataset.studentPcAction='refresh';button.setAttribute('aria-disabled',String(pcExplanation.phase==='loading'));button.addEventListener('click',()=>void refreshStudentPc());root.append(button);
    const status=makeStudentNode('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');root.append(status);root.setAttribute('aria-busy',String(pcExplanation.phase==='loading'));
    if(pcExplanation.phase==='idle')status.textContent='아직 조회하지 않았습니다. 버튼을 누르면 실제 PC 값을 읽습니다. 설명용 예시 값은 사용하지 않습니다.';
    else if(pcExplanation.phase==='loading')status.textContent='새로 읽는 중… 이전 값을 이번 결과로 표시하지 않습니다.';
    else if(pcExplanation.phase==='error'){
      status.textContent='CPU·메모리·디스크 비교 설명을 읽지 못했습니다.';
      root.append(makeStudentNode('p',`확인 불가 · ${pcExplanation.code} · ${pcExplanation.code==='TIMEOUT'?'조회 시간 초과':pcExplanation.code==='NOT_ALLOWED'?'이 앱에서 학생 PC 조회를 지원하지 않음':'요청 또는 응답 확인 실패'}`),makeStudentNode('p','다음 행동: 앱 실행 창과 제공 PC 영역을 확인하고 다시 조회를 누르세요. 권한을 높이거나 보안 설정을 바꾸지 마세요. 예시 값으로 대신 표시하지 않습니다.'));
    }else{
      status.textContent=`실제 PC 조회 · ${studentTime(pcExplanation.at)} · 전체 수집 완료 시각이며 항목별 측정 순간은 다를 수 있습니다.`;
      for(const row of pcExplanation.rows){root.append(makeStudentNode('h4',row.label),makeStudentNode('p',`${row.description} · ${studentTime(pcExplanation.at)}`),makeStudentNode('p',row.value===null?`다음 행동: ${row.reason}`:row.comparison));}
    }
    return root;
  }

  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '로그인 사용자·기기·세션';
      root.appendChild(title);

      const deviceStatus = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionStatus = {
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      };
      const modeStatus = {
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };

      function text(value) {
        return typeof value === 'string' && value.trim() ? value : '확인 불가';
      }

      function statusText(value, labels) {
        const code = typeof value === 'string' && value.trim() ? value : 'unknown';
        return `${labels[code] ?? '확인 불가'} (${code})`;
      }

      function line(parent, message) {
        const paragraph = document.createElement('p');
        paragraph.textContent = message;
        parent.appendChild(paragraph);
      }

      function group(heading, resource) {
        const container = document.createElement('section');
        const label = document.createElement('h4');
        label.textContent = heading;
        container.appendChild(label);
        root.appendChild(container);

        if (Object.hasOwn(modeStatus, resource?.mode)) {
          line(container, `연결 상태: ${modeStatus[resource.mode]}`);
        }
        if (resource?.status === 'loading') {
          line(container, '불러오는 중');
          return { container, ok: false };
        }
        if (resource?.status === 'error') {
          line(container, `연결 실패: ${text(resource.error?.message)}`);
          return { container, ok: false };
        }
        if (resource?.status !== 'ok') {
          line(container, '확인 불가');
          return { container, ok: false };
        }
        return { container, ok: true };
      }

      const current = group('현재 계정·기기·세션', me);
      if (current.ok) {
        line(current.container, `사용자: ${text(me.data?.user?.label)} · ID: ${text(me.data?.user?.id)}`);
        line(current.container, `현재 기기: ${text(me.data?.device?.label)} · ID: ${text(me.data?.device?.id)} · 상태: ${statusText(me.data?.device?.status, deviceStatus)}`);
        line(current.container, `현재 세션: ${text(me.data?.session?.id)} · 상태: ${statusText(me.data?.session?.status, sessionStatus)}`);
      }

      const deviceList = group('기기 목록', devices);
      if (deviceList.ok) {
        if (Array.isArray(devices.data) && devices.data.length) {
          const list = document.createElement('ul');
          for (const device of devices.data) {
            const item = document.createElement('li');
            item.textContent = `${text(device?.label)} · ID: ${text(device?.id)} · 상태: ${statusText(device?.status, deviceStatus)}`;
            list.appendChild(item);
          }
          deviceList.container.appendChild(list);
        } else {
          line(deviceList.container, Array.isArray(devices.data) ? '표시할 기기가 없습니다.' : '확인 불가');
        }
      }

      const sessionList = group('세션 목록', sessions);
      if (sessionList.ok) {
        if (Array.isArray(sessions.data) && sessions.data.length) {
          const list = document.createElement('ul');
          for (const session of sessions.data) {
            const item = document.createElement('li');
            item.textContent = `ID: ${text(session?.id)} · 상태: ${statusText(session?.status, sessionStatus)}`;
            list.appendChild(item);
          }
          sessionList.container.appendChild(list);
        } else {
          line(sessionList.container, Array.isArray(sessions.data) ? '표시할 세션이 없습니다.' : '확인 불가');
        }
      }

      return root;
    },
    renderDecision({ status, mode, data, error, appId } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '업무 앱 접근 판정';
      root.appendChild(title);

      function safeText(value) {
        return typeof value === 'string' && value.trim() ? value : '확인 불가';
      }

      function line(message) {
        const paragraph = document.createElement('p');
        paragraph.textContent = message;
        root.appendChild(paragraph);
      }

      if (status === 'idle') {
        line('업무 앱을 선택한 뒤 접근을 요청하세요.');
        return root;
      }

      if (status === 'loading') {
        line(`판정 확인 중 · 앱 ID: ${safeText(appId)}`);
        return root;
      }

      if (status === 'error') {
        line(`요청 실패: ${safeText(error?.message)}`);
        line('요청 실패는 접근 거부 판정이 아닙니다.');
        return root;
      }

      if (status !== 'ok') {
        line('요청 상태를 확인할 수 없습니다. 접근이 허용된 것으로 볼 수 없습니다.');
        return root;
      }

      const decisionLabels = {
        allow: '접근 허용',
        deny: '접근 거부',
        challenge: '추가 확인 필요',
        unknown: '확인 불가',
      };
      const decision = Object.hasOwn(decisionLabels, data?.decision) ? data.decision : 'unknown';

      line(`앱 ID: ${safeText(data?.appId ?? appId)}`);
      line(`판정: ${decisionLabels[decision]} (${decision})`);
      line(`판정 이유: ${safeText(data?.reason)}`);
      line(`판정 시각: ${safeText(data?.checkedAt)}`);

      if (decision === 'allow') {
        line('정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
      } else if (decision === 'challenge') {
        line('추가 확인이 필요하며 이 화면은 확인 절차를 대신 수행하지 않습니다.');
      } else if (decision === 'unknown') {
        line('판정을 확인할 수 없으며 접근이 허용된 것으로 볼 수 없습니다.');
      }

      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '본인 접속 기록·XDR 경보';
      root.appendChild(title);

      function line(parent, value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        parent.appendChild(paragraph);
      }

      if (mode === 'demo') line(root, '예제 자료');
      if (status === 'loading') {
        line(root, '기록을 불러오는 중입니다.');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.trim() ? error.message : '오류 내용을 확인할 수 없습니다.';
        line(root, error?.code === 'CONTRACT_MISMATCH'
          ? `기록 확인 불가 (CONTRACT_MISMATCH): ${message}`
          : `기록을 불러오지 못했습니다: ${message}`);
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        line(root, '기록을 확인할 수 없습니다.');
        return root;
      }

      const records = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      if (records.length === 0) {
        line(root, '표시할 기록이 없습니다.');
        return root;
      }

      const filters = document.createElement('div');
      root.appendChild(filters);
      function makeFilter(labelText, values, describe) {
        const label = document.createElement('label');
        label.textContent = labelText;
        const select = document.createElement('select');
        for (const value of ['all', ...values]) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value === 'all' ? '전체' : describe(value);
          select.appendChild(option);
        }
        select.addEventListener('change', () => {
          selectedId = null;
          drawRows();
        });
        label.appendChild(select);
        filters.appendChild(label);
        return select;
      }

      const kindFilter = makeFilter('기록 종류', [...new Set(records.map(event => event.kind))],
        value => value === 'access' ? '접속 기록(access)' : 'XDR 경보(xdr)');
      const appFilter = makeFilter('업무 앱', [...new Set(records.map(event => event.appId ?? ''))],
        value => value || '앱 확인 불가');
      const accessFilter = makeFilter('접속 상태', [...new Set(records.map(event => event.state.access))],
        value => ({ allowed: '허용', denied: '거부', unknown: '확인 불가' })[value] + `(${value})`);

      const count = document.createElement('p');
      root.appendChild(count);
      const list = document.createElement('ul');
      root.appendChild(list);
      let selectedId = null;

      const stateLabels = {
        access: { allowed: '허용', denied: '거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      function stateText(value, labels) {
        return `${labels[value] ?? '확인 불가'}(${value ?? 'unknown'})`;
      }

      function appendEntries(parent, heading, entries) {
        const section = document.createElement('section');
        const name = document.createElement('h5');
        name.textContent = heading;
        section.appendChild(name);
        if (entries.length === 0) {
          line(section, `${heading} 없음`);
        } else {
          const entriesList = document.createElement('ul');
          for (const entry of entries) {
            const row = document.createElement('li');
            row.textContent = `ID: ${entry.id} · 내용: ${entry.text}`;
            entriesList.appendChild(row);
          }
          section.appendChild(entriesList);
        }
        parent.appendChild(section);
      }

      function appendDetail(parent, event) {
        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', event.id);
        const heading = document.createElement('h4');
        heading.textContent = `기록 ${event.id} 상세`;
        detail.appendChild(heading);
        line(detail, `기록 ID: ${event.id} · 앱 ID: ${event.appId ?? '앱 확인 불가'}`);
        appendEntries(detail, '근거', event.evidence);
        appendEntries(detail, '규칙', event.rules);
        line(detail, `접속 상태: ${stateText(event.state.access, stateLabels.access)}`);
        line(detail, `세션 상태: ${stateText(event.state.session, stateLabels.session)}`);
        line(detail, `기기 상태: ${stateText(event.state.device, stateLabels.device)}`);
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          line(detail, '조치 실행 연결은 준비 중입니다. 아래 미지원 버튼은 요청을 보내지 않습니다.');
          for (const action of event.supportedActions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${action} 미지원`;
            button.disabled = true;
            detail.appendChild(button);
          }
        }
        parent.appendChild(detail);
      }

      function drawRows(focusId = null) {
        const filtered = records.filter(event =>
          (kindFilter.value === 'all' || event.kind === kindFilter.value)
          && (appFilter.value === 'all' || (event.appId ?? '') === appFilter.value)
          && (accessFilter.value === 'all' || event.state.access === accessFilter.value));
        count.textContent = `표시 ${filtered.length}건 / 받은 기록 ${records.length}건`;
        list.replaceChildren();
        if (filtered.length === 0) {
          const empty = document.createElement('li');
          empty.textContent = '선택한 조건에 맞는 기록이 없습니다.';
          list.appendChild(empty);
          return;
        }
        let focusButton = null;
        for (const event of filtered) {
          const item = document.createElement('li');
          item.setAttribute('data-student-event-id', event.id);
          line(item, `기록 ID: ${event.id} · 시각: ${event.at} · 종류: ${event.kind === 'access' ? '접속 기록(access)' : 'XDR 경보(xdr)'} · 앱 ID: ${event.appId ?? '앱 확인 불가'} · 요약: ${event.summary}`);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${event.id} 상세`;
          button.setAttribute('aria-expanded', String(selectedId === event.id));
          button.addEventListener('click', () => {
            selectedId = selectedId === event.id ? null : event.id;
            drawRows(event.id);
          });
          item.appendChild(button);
          if (selectedId === event.id) appendDetail(item, event);
          list.appendChild(item);
          if (focusId === event.id) focusButton = button;
        }
        if (focusButton) focusButton.focus();
      }
      drawRows();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '기기·세션·알림 상태';
      root.appendChild(title);

      function line(parent, value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        parent.appendChild(paragraph);
      }
      function section(heading) {
        const area = document.createElement('section');
        const name = document.createElement('h4');
        name.textContent = heading;
        area.appendChild(name);
        root.appendChild(area);
        return area;
      }
      function readable(value) {
        return typeof value === 'string' && value.trim() ? value : '확인 불가';
      }
      function failure(area, heading, resource, retry) {
        const code = readable(resource?.error?.code);
        const message = readable(resource?.error?.message);
        const timedOut = code.includes('TIMEOUT') || message.includes('시간 초과');
        line(area, `${heading} 불러오지 못했습니다${timedOut ? ' (시간 초과)' : ''}: ${message}`);
        line(area, retry);
      }
      function status(value, labels) {
        return `${labels[value] ?? '확인 불가'}(${value ?? 'unknown'})`;
      }

      if (mode === 'demo') line(root, '예제 자료입니다. 실제 연결 상태가 아닙니다.');
      const deviceArea = section('등록 기기');
      if (devices?.status === 'loading') {
        line(deviceArea, '등록 기기를 불러오는 중입니다.');
      } else if (devices?.status === 'error') {
        failure(deviceArea, '등록 기기를', devices, '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.');
      } else if (devices?.status === 'ok' && Array.isArray(devices.data)) {
        if (devices.data.length === 0) line(deviceArea, '등록된 기기가 없습니다.');
        else {
          const list = document.createElement('ul');
          const labels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
          for (const device of devices.data) {
            const item = document.createElement('li');
            item.textContent = `${readable(device?.label)} · 상태: ${status(device?.status, labels)}`;
            list.appendChild(item);
          }
          deviceArea.appendChild(list);
        }
      } else line(deviceArea, '등록 기기 상태를 확인할 수 없습니다.');

      const sessionArea = section('현재 세션');
      line(sessionArea, '조회 범위는 현재 검증된 연결 한 개입니다. 과거 세션 목록은 아닙니다.');
      if (sessions?.status === 'loading') {
        line(sessionArea, '현재 세션을 불러오는 중입니다.');
      } else if (sessions?.status === 'error') {
        failure(sessionArea, '현재 세션을', sessions, '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.');
      } else if (sessions?.status === 'ok' && Array.isArray(sessions.data)) {
        if (sessions.data.length === 0) line(sessionArea, '현재 연결이 없습니다.');
        else {
          const list = document.createElement('ul');
          const labels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
          for (const session of sessions.data) {
            const item = document.createElement('li');
            item.textContent = `세션 ID: ${readable(session?.id)} · 상태: ${status(session?.status, labels)}`;
            list.appendChild(item);
          }
          sessionArea.appendChild(list);
        }
      } else line(sessionArea, '현재 세션 상태를 확인할 수 없습니다.');

      const notificationArea = section('주의 알림');
      if (!Array.isArray(notifications)) {
        line(notificationArea, '알림 상태를 확인할 수 없습니다.');
      } else if (notifications.length === 0) {
        line(notificationArea, '주의할 알림이 없습니다.');
      } else {
        const list = document.createElement('ul');
        for (const notification of notifications) {
          const item = document.createElement('li');
          const code = typeof notification?.code === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(notification.code)
            ? notification.code : '확인 불가';
          item.textContent = `자료: ${readable(notification?.resource)} · 코드: ${code} · 내용: ${readable(notification?.message)}`;
          list.appendChild(item);
        }
        notificationArea.appendChild(list);
      }

      const diagnosticArea = section('진단 정보');
      let copyText = '';
      if (diagnostics?.status === 'loading') {
        line(diagnosticArea, '진단 정보를 불러오는 중입니다.');
      } else if (diagnostics?.status === 'error') {
        failure(diagnosticArea, '진단 정보를', diagnostics,
          '다시 시도는 제공 화면의 도움정보 불러오기 버튼을 직접 누르세요.');
      } else if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object') {
        const info = diagnostics.data;
        function safeField(value, pattern) {
          return typeof value === 'string' && pattern.test(value) ? value : '확인 불가';
        }
        const checkedAt = typeof info.checkedAt === 'string'
          && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(info.checkedAt)
          && Number.isFinite(Date.parse(info.checkedAt)) ? info.checkedAt : '확인 불가';
        const values = [
          ['requestId', safeField(info.requestId, /^[0-9a-f-]{36}$/i)],
          ['component', safeField(info.component, /^[a-z][a-z0-9-]{0,39}$/)],
          ['version', safeField(info.version, /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/)],
          ['checkedAt', checkedAt],
          ['engine.mode', ['connected', 'demo', 'disconnected'].includes(info.engine?.mode) ? info.engine.mode : '확인 불가'],
          ['engine.code', safeField(info.engine?.code, /^[A-Z][A-Z0-9_]{0,79}$/)],
        ];
        for (const [key, value] of values) line(diagnosticArea, `${key}: ${value}`);
        copyText = values.map(([key, value]) => `${key}: ${value}`).join('\n');
      } else if (diagnostics?.status === 'idle') {
        line(diagnosticArea, '진단 정보를 아직 불러오지 않았습니다. 제공 화면의 도움정보 불러오기 버튼을 누르세요.');
      } else {
        line(diagnosticArea, '진단 정보를 확인할 수 없습니다.');
      }
      line(diagnosticArea, '도움정보는 문제를 문의할 때 사용합니다. 아래 버튼을 누르면 표시된 여섯 항목만 복사합니다.');
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '도움정보 복사';
      copyButton.disabled = !copyText;
      diagnosticArea.appendChild(copyButton);
      const copyResult = document.createElement('p');
      copyResult.setAttribute('aria-live', 'polite');
      diagnosticArea.appendChild(copyResult);
      copyButton.addEventListener('click', async () => {
        if (!copyText) return;
        try {
          await navigator.clipboard.writeText(copyText);
          copyResult.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          copyResult.textContent = '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인한 뒤 다시 누르세요.';
        }
      });

      const legacy=document.createElement('details');
      const legacyTitle=document.createElement('summary');legacyTitle.textContent='기존 기기·세션·알림·도움정보 펼치기';legacy.appendChild(legacyTitle);
      for(const child of [...root.childNodes])legacy.appendChild(child);
      root.replaceChildren(studentOverview(),studentPcPanel(),legacy);
      return root;
    },
    renderVulnerabilities({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '설치 패키지와 OSV 조회 결과';
      root.appendChild(title);

      function line(parent, value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        parent.appendChild(paragraph);
      }
      function safeMessage(value) {
        if (typeof value !== 'string' || !value.trim() || value.length > 300
          || /(?:Bearer\s+\S+|(?:api[_ -]?key|token|password|secret)\s*[:=]\s*\S+|sk-[A-Za-z0-9_-]{8,})/i.test(value)) {
          return '오류 내용을 확인할 수 없습니다.';
        }
        return value;
      }

      if (mode === 'demo') line(root, '예제 자료(demo)입니다. 실제 설치 패키지 조회 결과가 아닙니다.');
      if (status === 'idle') {
        line(root, '조회 전(idle)입니다. 제공 화면의 「설치 패키지 조회」를 눌러 확인하세요.');
        return root;
      }
      if (status === 'loading') {
        line(root, '조회 중(loading)입니다. 이전 표는 현재 조회 결과가 아닙니다.');
        return root;
      }
      if (status === 'error') {
        const code = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)
          ? ` (${error.code})` : '';
        line(root, `조회 실패(error)${code}: ${safeMessage(error?.message)}`);
        line(root, '이전 결과를 현재 결과로 보지 않습니다. 필요하면 제공 화면에서 직접 다시 조회하세요.');
        return root;
      }
      if (status !== 'ok') {
        line(root, '조회 상태를 확인할 수 없습니다. 취약점이 없다는 뜻이 아닙니다.');
        return root;
      }

      const scanLabels = {
        complete: '모두 조회',
        partial: '일부 조회 실패',
        not_checked: '아직 조회 안 함',
        not_configured: '조회 대상 프로젝트 설정 없음',
        unverifiable: 'lock 파일 확인 불가',
      };
      if (!data || typeof data !== 'object' || Array.isArray(data)
        || !Object.hasOwn(scanLabels, data.status)) {
        line(root, '조회 결과의 전체 상태를 확인할 수 없습니다. 취약점이 없다는 뜻이 아닙니다.');
        return root;
      }

      line(root, `전체 조회 상태: ${scanLabels[data.status]}(${data.status})`);
      if (data.status === 'not_configured') {
        line(root, '조회 대상 프로젝트 설정이 필요합니다. 운영자가 대상 경로와 허용 패키지를 준비해야 합니다.');
      } else if (data.status === 'not_checked') {
        line(root, '승인된 공개 조회 대상이 없어 아직 조회하지 않았습니다. 취약점 없음으로 판단할 수 없습니다.');
      } else if (data.status === 'unverifiable') {
        line(root, '설치 목록의 lock 파일을 확인할 수 없어 취약점 조회 결과를 판단할 수 없습니다.');
      } else if (data.status === 'partial') {
        line(root, '일부 패키지의 조회를 끝까지 확인하지 못했습니다. 이미 받은 취약점 항목은 아래에 유지합니다.');
      }

      if (data.lockfileVersion != null) line(root, `package-lock.json 잠금 파일 버전: ${data.lockfileVersion}`);
      if (typeof data.lockfileHash === 'string' && data.lockfileHash) line(root, `잠금 파일 해시: ${data.lockfileHash}`);
      if (typeof data.checkedAt === 'string' && data.checkedAt) line(root, `전체 확인 시각: ${data.checkedAt}`);
      line(root, 'OSV 조회는 해당 시각에 알려진 항목을 확인합니다. 결과가 없다는 사실만으로 패키지나 앱 전체가 안전하다고 보장할 수 없습니다.');

      if (!Array.isArray(data.packages)) {
        line(root, '패키지별 결과를 확인할 수 없습니다.');
        return root;
      }
      if (data.packages.length === 0) {
        line(root, '표시할 패키지 조회 결과가 없습니다. 미조회와 조회 실패는 취약점 없음이 아닙니다.');
        return root;
      }

      const table = document.createElement('table');
      const caption = document.createElement('caption');
      caption.textContent = '설치 패키지별 OSV 조회 결과';
      table.appendChild(caption);
      const header = document.createElement('thead');
      const headingRow = document.createElement('tr');
      for (const heading of ['패키지 이름', '설치 버전', '조회 상태', '출처', '패키지 확인 시각', '취약점 항목']) {
        const cell = document.createElement('th');
        cell.setAttribute('scope', 'col');
        cell.textContent = heading;
        headingRow.appendChild(cell);
      }
      header.appendChild(headingRow);
      table.appendChild(header);
      const body = document.createElement('tbody');
      table.appendChild(body);

      const exactVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
      const packageLabels = {
        known_vulnerabilities: '알려진 항목 있음',
        none_found: '조회 범위에서 알려진 항목 없음',
        unverifiable: '조회 확인 불가',
      };
      function readable(value) {
        return typeof value === 'string' && value.trim() ? value : '확인 불가';
      }
      function cell(row, value) {
        const item = document.createElement('td');
        item.textContent = value;
        row.appendChild(item);
        return item;
      }

      for (const pkg of data.packages) {
        const row = document.createElement('tr');
        const name = readable(pkg?.name);
        const version = typeof pkg?.version === 'string' && exactVersion.test(pkg.version)
          ? pkg.version : '정확한 설치 버전 확인 불가';
        const findings = Array.isArray(pkg?.vulnerabilities) ? pkg.vulnerabilities : null;
        if (name !== '확인 불가' && version !== '정확한 설치 버전 확인 불가') {
          row.setAttribute('data-student-package-name', name);
          row.setAttribute('data-student-package-version', version);
        }
        cell(row, name);
        cell(row, version);
        const packageStatus = pkg?.status === 'unverifiable' && findings?.length
          ? '일부 확인·전체 조회 확인 불가' : packageLabels[pkg?.status] ?? '확인 불가';
        cell(row, `${packageStatus}(${readable(pkg?.status)})`);
        cell(row, readable(pkg?.source));
        cell(row, readable(pkg?.checkedAt));
        const findingsCell = cell(row, '');
        if (!findings) {
          findingsCell.textContent = '취약점 목록 확인 불가. 취약점이 없다는 뜻이 아닙니다.';
        } else if (findings.length > 0) {
          const list = document.createElement('ul');
          for (const finding of findings) {
            const item = document.createElement('li');
            item.textContent = `취약점 ID: ${readable(finding?.id)} · 수정 시각(modified): ${readable(finding?.modified)}`;
            list.appendChild(item);
          }
          findingsCell.appendChild(list);
        } else if (pkg?.status === 'none_found') {
          findingsCell.textContent = '조회 범위에서 알려진 취약점 항목이 없습니다. 안전 보장은 아닙니다.';
        } else if (pkg?.status === 'unverifiable') {
          findingsCell.textContent = '전체 조회 확인 불가. 취약점이 없다고 판단할 수 없습니다.';
        } else {
          findingsCell.textContent = '취약점 항목을 확인할 수 없습니다.';
        }
        body.appendChild(row);
      }
      root.appendChild(table);
      return root;
    },
    renderAiConnection({ status, mode, data, error, checkedAt } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '수업용 AI 연결 점검';
      root.appendChild(title);

      function line(value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        root.appendChild(paragraph);
      }
      function safeMessage(value) {
        if (typeof value !== 'string' || !value.trim() || value.length > 300
          || /(?:Bearer\s+\S+|(?:api[_ -]?key|token|password|secret)\s*[:=]\s*\S+|sk-[A-Za-z0-9_-]{8,})/i.test(value)) {
          return '오류 내용을 확인할 수 없습니다.';
        }
        return value;
      }

      if (mode === 'demo') line('앱 자료 연결 모드: 예제(demo). 이 표시만으로 실제 AI 이용 권한이 확인되지는 않습니다.');
      if (mode === 'disconnected') line('앱 자료 연결 모드: 미연결(disconnected). AI 연결 점검 결과는 아래에 별도로 표시합니다.');

      if (status === 'idle') {
        line('AI 연결 점검 전입니다.');
      } else if (status === 'loading') {
        line('AI 연결 점검 중입니다.');
      } else if (status === 'ok') {
        if (data?.transportChecked !== true || !['test', 'verified'].includes(data?.audienceAuthorization)
          || !Number.isSafeInteger(data?.modelCount) || data.modelCount < 0) {
          line('AI 연결 점검 결과를 확인할 수 없습니다.');
        } else {
          line(data.audienceAuthorization === 'test'
            ? '시험 연결 점검(test): 실제 앱 이용 권한 확인은 아닙니다.'
            : '앱 권한 확인 후 점검(verified)');
          line(`응답 모델 수: ${data.modelCount}`);
          line(`점검 시각: ${typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt)) ? checkedAt : '확인 불가'}`);
          line('이 점검은 모델 목록 응답을 확인한 것입니다. 사건 설명은 아직 실행하지 않았습니다.');
          line('사건 설명은 보안 기록에서 별도로 요청하고 결과를 확인하세요.');
        }
      } else if (status === 'error') {
        const guidance = {
          ON_AI_PROVISIONING_PENDING: '앱 계정 연결과 이용 권한이 준비 중입니다. 담당자에게 확인하세요.',
          ON_AI_TRANSPORT_PENDING: '공통 AI 연결 준비 상태를 담당자에게 확인하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '현재 계정과 앱 권한을 담당자에게 다시 확인하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사건·프로젝트 연결을 담당자에게 확인하세요.',
          WB_CLCO_AUTH_REQUIRED: '계정 연결과 앱 인증 상태를 다시 확인하고 담당자에게 문의하세요.',
          WB_CLCO_INVALID_TOKEN: '앱 인증 상태를 담당자에게 확인하세요.',
          WB_CLCO_ACCESS_BLOCKED: '접근 제한과 앱 이용 권한을 담당자에게 확인하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량을 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: 'AI 이용 한도를 담당자에게 확인하세요.',
          WB_CLCO_SESSION_CLOSED: 'AI 이용 가능 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청 제한 중입니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버 응답을 확인할 수 없습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: 'AI 서버 연결을 확인한 뒤 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: 'AI 요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: 'AI 점검 요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          TIMEOUT: 'AI 요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 응답은 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 응답은 현재 결과가 아닙니다.',
          CANCELLED: '점검이 취소됐습니다. 이전 응답은 현재 결과가 아닙니다.',
          ON_AI_MODEL_LIST_EMPTY: '사용 가능한 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
          MODEL_NOT_CONFIGURED: '담당자에게 앱 서버의 모델 설정을 확인하세요.',
          ON_AI_INVALID_INPUT: '점검 입력을 확인할 수 없습니다. 담당자에게 문의하세요.',
          ON_AI_INVALID_OUTPUT: 'AI 응답을 확인할 수 없습니다. 담당자에게 문의하세요.',
          AI_REQUEST_UNVERIFIED: '연결 또는 응답을 확인할 수 없습니다. 담당자에게 앱 권한을 확인하세요.',
        };
        const code = Object.hasOwn(guidance, error?.code) ? error.code : 'AI_REQUEST_UNVERIFIED';
        line(`AI 연결 점검 실패 · 코드: ${code} · 내용: ${code === error?.code ? safeMessage(error.message) : '연결 또는 응답을 확인할 수 없습니다.'}`);
        line(guidance[code]);
      } else {
        line('AI 연결 점검 상태를 확인할 수 없습니다.');
      }
      line('재점검은 제공 화면의 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = 'AI 사건 설명';
      root.appendChild(title);

      function line(value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        root.appendChild(paragraph);
      }
      function list(heading, entries, describe) {
        const label = document.createElement('h4');
        label.textContent = heading;
        root.appendChild(label);
        const items = document.createElement('ul');
        for (const entry of entries) {
          const item = document.createElement('li');
          item.textContent = describe(entry);
          items.appendChild(item);
        }
        root.appendChild(items);
      }

      if (explanation?.status === 'error') {
        const code = typeof explanation.error?.code === 'string'
          && /^[A-Z][A-Z0-9_]{0,79}$/.test(explanation.error.code)
          ? explanation.error.code : 'AI_REQUEST_UNVERIFIED';
        const message = explanation.error?.message;
        const safeMessage = typeof message === 'string' && message.trim() && message.length <= 300
          && !/(?:Bearer\s+\S+|(?:api[_ -]?key|authorization|password|secret|비밀번호|토큰)\s*[:=]\s*\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(message)
          ? message : '오류 내용을 확인할 수 없습니다.';
        line(`AI 설명 실패 · 코드: ${code} · 내용: ${safeMessage}`);
        if (code === 'ON_AI_INVALID_OUTPUT') {
          line('설명 응답의 형식이나 인용 근거를 확인할 수 없어 결과를 사용하지 않습니다.');
        }
        line('보안 기록과 업무 앱 판정은 그대로 유지됩니다. AI 설명 실패는 과제 실패를 뜻하지 않습니다.');
        return root;
      }

      if (!event || typeof event.id !== 'string' || !event.id.trim()) {
        line('보안 기록에서 사건을 먼저 고르세요.');
        return root;
      }
      if (explanation?.status === 'loading') {
        line(`사건 ${event.id}의 AI 설명을 요청하는 중입니다.`);
        return root;
      }
      if (explanation?.status === 'idle' || explanation == null) {
        line(`사건 ${event.id}의 AI 설명은 아직 요청하지 않았습니다.`);
        return root;
      }
      if (explanation?.status !== 'ok') {
        line('AI 설명 상태를 확인할 수 없습니다. 기존 보안 기록은 그대로 유지됩니다.');
        return root;
      }

      const data = explanation.data;
      if (data?.executed !== false || data?.requiresHumanConfirmation !== true
        || typeof data?.summary !== 'string' || !data.summary.trim()) {
        line(data?.executed === true
          ? 'AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.'
          : 'AI 설명 내용을 확인할 수 없어 사용하지 않습니다.');
        line('기존 보안 기록은 그대로 유지됩니다.');
        return root;
      }

      if (!Array.isArray(event.evidence) || event.evidence.length === 0
        || event.evidence.some(row => typeof row?.id !== 'string' || !row.id
          || typeof row.text !== 'string' || !row.text.trim())
        || !Array.isArray(event.rules) || event.rules.some(row => typeof row?.id !== 'string'
          || !row.id || typeof row.text !== 'string' || !row.text.trim())) {
        line('AI 설명을 사용할 수 없습니다: 선택한 사건의 근거 또는 규칙 자료를 확인할 수 없습니다.');
        line('기존 보안 기록은 그대로 유지됩니다.');
        return root;
      }
      const evidenceById = new Map(event.evidence.map(row => [row.id, row.text]));
      const cited = data.evidenceIds;
      if (!Array.isArray(cited) || cited.length !== event.evidence.length
        || evidenceById.size !== event.evidence.length || new Set(cited).size !== cited.length
        || cited.some(id => typeof id !== 'string' || !evidenceById.has(id))) {
        line('AI 설명을 사용할 수 없습니다: 인용한 근거 ID가 선택한 사건의 근거와 맞지 않거나 근거가 부족합니다.');
        line('없는 근거를 만들어 보충하지 않습니다. 기존 보안 기록은 그대로 유지됩니다.');
        return root;
      }
      if (!event.state || !['access', 'session', 'device'].every(key => typeof event.state[key] === 'string')
        || !Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)
        || data.proposals.some(proposal => typeof proposal?.action !== 'string'
          || !event.supportedActions.includes(proposal.action)
          || typeof proposal.reason !== 'string' || !proposal.reason.trim()
          || !Array.isArray(proposal.evidenceIds) || proposal.evidenceIds.length === 0
          || new Set(proposal.evidenceIds).size !== proposal.evidenceIds.length
          || proposal.evidenceIds.some(id => !evidenceById.has(id)))) {
        line('AI 설명을 사용할 수 없습니다: 현재 상태 또는 조치 제안의 근거를 확인할 수 없습니다.');
        line('기존 보안 기록은 그대로 유지되며 조치는 실행되지 않았습니다.');
        return root;
      }

      line(`사건 ID: ${event.id}`);
      line(`AI 설명(참고용): ${data.summary}`);
      list('인용한 근거', cited, id => `${id} — ${evidenceById.get(id)}`);
      list('현재 규칙', event.rules, rule => `${rule.id} — ${rule.text}`);
      const unknownStates = [
        ['접속', event.state.access], ['세션', event.state.session], ['기기', event.state.device],
      ].filter(([, value]) => value === 'unknown');
      if (unknownStates.length) {
        list('확인 불가 상태', unknownStates, ([label]) => `${label}: 확인 불가(unknown)`);
      } else {
        line('확인 불가 상태: 없음');
      }
      if (data.proposals.length === 0) {
        line(event.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다.');
      } else {
        list('조치 제안(미실행)', data.proposals, proposal =>
          `${proposal.action} — ${proposal.reason} · 근거 ID: ${proposal.evidenceIds.join(', ')} · 사람이 확인해야 실행할 수 있으며 아직 실행되지 않았습니다.`);
      }
      line('AI 설명과 조치 제안만으로 보안 조치는 실행되지 않습니다.');
      root.setAttribute('data-student-explanation-event', event.id);
      return root;
    },
    renderAction({ status = 'idle', event = null, actionId = null, target = null,
      receipt = null, observation = null, message = '', confirmationExpiresAt = null, error = null } = {}) {
      const root = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = '보안 조치 요청 상태와 실제 결과';
      root.appendChild(title);

      function line(value) {
        const paragraph = document.createElement('p');
        paragraph.textContent = value;
        root.appendChild(paragraph);
      }
      function safeMessage(value) {
        return typeof value === 'string' && value.trim() && value.length <= 300
          && !/(?:Bearer\s+\S+|(?:api[_ -]?key|authorization|password|secret|비밀번호|토큰)\s*[:=]\s*\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i.test(value)
          ? value : null;
      }
      function safeId(value) {
        return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(value)
          ? value : null;
      }
      function safeTime(value) {
        return typeof value === 'string'
          && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
          && Number.isFinite(Date.parse(value)) ? value : null;
      }
      function showError() {
        const code = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code)
          ? error.code : 'ACTION_RESULT_UNVERIFIED';
        line(`오류 코드: ${code} · 내용: ${safeMessage(error?.message) ?? '오류 내용을 확인할 수 없습니다.'}`);
      }

      const descriptions = {
        idle: '현재 조치 화면은 아직 미실행(idle) 상태입니다. 화면 취소는 이전에 전달된 조치의 효과를 되돌리지 않습니다.',
        loading: '조치 준비 또는 연동 시스템 결과 조회 중(loading). 처리 결과는 아직 확인되지 않았습니다.',
        prepared: '준비됨·미실행(prepared). 사람 확인 전이며 조치가 실행되지 않았습니다.',
        executing: '서버에 전달 중(executing). 원천 처리 결과는 아직 확인되지 않았습니다.',
        pending: '서버 접수·처리 중(pending). 접수 응답(ACK)은 실제 효과 확인이 아닙니다.',
        denied: '연동 시스템이 조치를 거절했습니다(denied).',
        failed: '연동 시스템의 조치 처리가 실패했습니다(failed).',
        unknown: '결과 불명(unknown). 성공이나 효과 없음으로 판단하지 말고 제공 화면의 「연동 시스템 결과만 재조회」를 사용하세요.',
        expired: '사람 확인 기한이 지났습니다(expired). 조치를 다시 준비해야 합니다.',
        error: '요청 처리 안 됨(error).',
      };
      const currentEventId = safeId(event?.id);
      const currentActionId = safeId(actionId);
      if (status !== 'idle' && receipt
        && ((receipt.eventId != null && receipt.eventId !== currentEventId)
          || (receipt.actionId != null && receipt.actionId !== currentActionId))) {
        if (status === 'error') {
          line('요청 처리 안 됨(error).');
          showError();
        }
        line('영수증 연결 확인 불가: 사건 또는 조치가 현재 입력과 일치하지 않습니다. 결과 불명(unknown)입니다.');
        line('이전 요청 결과를 현재 사건에 붙이지 않습니다. 제공 화면의 「연동 시스템 결과만 재조회」로 확인하세요.');
        return root;
      }
      let effectConfirmed = false;
      if (status === 'succeeded') {
        const requestId = safeId(receipt?.requestId);
        const receiptId = safeId(receipt?.receiptId);
        const observedAt = safeTime(observation?.observedAt);
        if (observation?.effectApplied === true && currentEventId && currentActionId
          && receipt?.eventId === currentEventId && receipt?.actionId === currentActionId
          && requestId && receiptId && observedAt) {
          effectConfirmed = true;
          line('연동 시스템의 효과 확인(succeeded). 접수 응답이 아닌 관측 결과입니다.');
          line(`관측 시각: ${observedAt} · effectApplied: true · receiptId: ${receiptId}`);
          root.setAttribute('data-student-action-event', currentEventId);
          root.setAttribute('data-student-action-request', requestId);
        } else {
          line('결과 불명(unknown). 효과가 적용됐거나 적용되지 않았다고 판단할 수 없습니다.');
          line('제공 화면의 「연동 시스템 결과만 재조회」로 현재 요청의 결과를 확인하세요.');
        }
      } else {
        line(descriptions[status] ?? '조치 상태를 확인할 수 없습니다.');
      }
      if (status === 'error') {
        showError();
      }
      if (status === 'prepared') {
        const expiresAt = safeTime(confirmationExpiresAt);
        line(`사람 확인 기한: ${expiresAt ?? '확인 불가'}`);
        line('대상과 조치를 확인한 뒤에만 제공 화면의 사람 확인 절차를 진행할 수 있습니다. 현재는 미실행입니다.');
      }
      if (['denied', 'failed'].includes(status)) {
        line(`사유: ${safeMessage(message) ?? safeMessage(error?.message) ?? '확인 불가'}`);
      } else if (['idle', 'loading', 'prepared', 'expired'].includes(status)) {
        const detail = safeMessage(message);
        if (detail) line(`안내: ${detail}`);
      }
      if (status !== 'idle') {
        if (currentEventId) line(`사건 ID: ${currentEventId}`);
        if (Array.isArray(event?.evidence)) {
          const evidenceIds = event.evidence.map(row => safeId(row?.id)).filter(Boolean);
          if (evidenceIds.length) line(`근거 ID: ${evidenceIds.join(', ')}`);
        }
        if (currentActionId) line(`조치 ID: ${currentActionId}`);
        const targetId = safeId(target?.id);
        if (targetId) line(`실제 대상 ID: ${targetId}`);
        if (Number.isSafeInteger(target?.generation) && target.generation > 0) {
          line(`대상 세대(generation): ${target.generation}`);
        }
        const requestId = safeId(receipt?.requestId);
        const receiptId = safeId(receipt?.receiptId);
        if (requestId) line(`요청 ID(requestId): ${requestId}`);
        if (receiptId && !effectConfirmed) line(`영수증 ID(receiptId): ${receiptId}`);
        if (Number.isSafeInteger(receipt?.version) && receipt.version > 0) {
          line(`영수증 버전(version): ${receipt.version}`);
        }
        if (receipt?.replayed === true) {
          line('같은 요청의 기존 영수증을 다시 확인했습니다(replayed: true). 새 집행으로 세지 않습니다.');
        }
        if (receipt?.superseded === true) {
          line('이전 조회 결과는 현재 결과를 대신하지 않습니다(superseded).');
        }
      }
      return root;
    },
  };
}
