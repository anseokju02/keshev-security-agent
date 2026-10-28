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

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
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
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
