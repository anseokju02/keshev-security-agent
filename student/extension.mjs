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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
