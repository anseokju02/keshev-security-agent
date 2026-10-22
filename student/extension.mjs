// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
