import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useModal } from './ModalProvider';

// 헷갈리는 글자(0,O,1,I,L) 제외한 6자리 코드 생성
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateInviteCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export default function GroupInvite({ userId }) {
  const modal = useModal();
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);

  // 내가 가입한 그룹 목록 불러오기
  const loadMyGroups = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code, owner_id)')
      .eq('user_id', userId);
    if (error) {
      console.error(error);
      setMyGroups([]);
    } else {
      setMyGroups(data?.map((row) => row.groups).filter(Boolean) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMyGroups();
  }, [userId]);

  // 그룹 만들기
  const handleCreate = async () => {
    if (!groupName.trim()) {
      modal.alert('그룹 이름을 입력해주세요');
      return;
    }
    setBusy(true);
    try {
      // 코드 충돌 가능성에 대비해 최대 5번 재시도
      let success = false;
      for (let i = 0; i < 5 && !success; i++) {
        const code = generateInviteCode();
        const { error } = await supabase.from('groups').insert({
          name: groupName.trim(),
          invite_code: code,
          owner_id: userId,
        });
        if (!error) {
          success = true;
        } else if (!error.message.includes('duplicate')) {
          throw error;
        }
      }
      if (!success) throw new Error('초대 코드 생성 실패. 다시 시도해주세요.');

      setGroupName('');
      setMode(null);
      await loadMyGroups();
    } catch (err) {
      modal.alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // 그룹 가입 — 서버 함수로 RLS 우회
  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length !== 6) {
      modal.alert('초대 코드는 6자리예요');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('join_group_by_code', { code });
      if (error) throw error;

      setInviteCode('');
      setMode(null);
      await loadMyGroups();
    } catch (err) {
      modal.alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  // 그룹 탈퇴
  const handleLeave = async (groupId, groupName) => {
    const ok = await modal.confirm(`"${groupName}" 그룹에서 나갈까요?`);
    if (!ok) return;
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) {
      modal.alert(error.message);
      return;
    }
    await loadMyGroups();
  };

  // 초대 코드 복사
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    modal.alert('초대 코드를 복사했어요!');
  };

  if (loading) return <div className="page">불러오는 중...</div>;

  // ====== 그룹 만들기 폼 ======
  if (mode === 'create') {
    return (
      <div className="page">
        <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>그룹 만들기</h2>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="그룹 이름 (예: 우리 가족, 친한친구들)"
          maxLength={20}
          style={{
            width: '100%', padding: 12, border: '1px solid #eee',
            borderRadius: 12, fontSize: 15, marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setMode(null)} disabled={busy} style={{ flex: 1 }}>
            취소
          </button>
          <button className="btn-primary" onClick={handleCreate} disabled={busy} style={{ flex: 2 }}>
            {busy ? '만드는 중...' : '만들기'}
          </button>
        </div>
      </div>
    );
  }

  // ====== 그룹 가입 폼 ======
  if (mode === 'join') {
    return (
      <div className="page">
        <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>초대 코드로 가입</h2>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="6자리 코드 입력"
          maxLength={6}
          style={{
            width: '100%', padding: 12, border: '1px solid #eee',
            borderRadius: 12, fontSize: 20, marginBottom: 16,
            textAlign: 'center', letterSpacing: 4, fontWeight: 600,
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setMode(null)} disabled={busy} style={{ flex: 1 }}>
            취소
          </button>
          <button className="btn-primary" onClick={handleJoin} disabled={busy} style={{ flex: 2 }}>
            {busy ? '가입 중...' : '가입하기'}
          </button>
        </div>
      </div>
    );
  }

  // ====== 메인 화면 ======
  return (
    <div className="page">
      <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>내 그룹</h2>

      {myGroups.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', margin: '40px 0' }}>
          아직 가입한 그룹이 없어요 🫘
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {myGroups.map((g) => (
            <div key={g.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{g.name}</div>
                  {g.owner_id === userId && (
                    <span style={{ fontSize: 11, color: 'var(--color-text)', fontWeight: 500 }}>방장</span>
                  )}
                </div>
                <button
                  onClick={() => handleLeave(g.id, g.name)}
                  style={{
                    background: 'none', border: 'none', color: '#aaa',
                    fontSize: 12, cursor: 'pointer', padding: 4,
                  }}
                >
                  나가기
                </button>
              </div>
              <div
                onClick={() => copyCode(g.invite_code)}
                style={{
                  background: 'var(--color-bg)', borderRadius: 8, padding: '10px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12, color: '#888' }}>초대 코드</span>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--color-text)' }}>
                  {g.invite_code}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 6 }}>
                탭하면 복사돼요
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn-primary" onClick={() => setMode('create')}>
          + 그룹 만들기
        </button>
        <button className="btn-ghost" onClick={() => setMode('join')}>
          초대 코드로 가입하기
        </button>
      </div>
    </div>
  );
}
