import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useModal } from './ModalProvider';

const THEMES = [
  { id: 'mint',     name: '민트',   color: '#3DAE89', bg: '#E8F8F3' },
  { id: 'lavender', name: '라벤더', color: '#7A6DB8', bg: '#F0EEF9' },
  { id: 'peach',    name: '피치',   color: '#D4723E', bg: '#FEF2EC' },
  { id: 'sky',      name: '스카이', color: '#4A8DC0', bg: '#EBF4FC' },
  { id: 'butter',   name: '버터',   color: '#C8A030', bg: '#FDF8E8' },
  { id: 'pink',     name: '핑크',   color: '#E88FAA', bg: '#FFF0F5' },
];

// DiceBear thumbs 아바타 — 둥글둥글한 콩 모양
// 스타일 바꾸려면 'thumbs'를 다른 이름으로 (big-ears, big-smile 등)
const AVATAR_STYLE = 'thumbs';
const generateSeed = () => Math.random().toString(36).slice(2, 14);
const buildAvatarUrl = (seed) =>
  `https://api.dicebear.com/7.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
const generateOptions = (count = 6) =>
  Array.from({ length: count }, () => buildAvatarUrl(generateSeed()));

export default function Profile({ userId, onThemeChange, currentTheme }) {
  const modal = useModal();
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarOptions, setAvatarOptions] = useState(() => generateOptions(6));

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setNickname(data?.nickname ?? '');
        setLoading(false);
      });
  }, [userId]);

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      modal.alert('닉네임을 입력해주세요');
      return;
    }
    if (trimmed === profile.nickname) return;

    setSavingNickname(true);
    const { error } = await supabase
      .from('users')
      .update({ nickname: trimmed })
      .eq('id', userId);
    setSavingNickname(false);

    if (error) {
      modal.alert('저장 실패: ' + error.message);
      return;
    }
    setProfile({ ...profile, nickname: trimmed });
    modal.alert('닉네임을 저장했어요');
  };

  // 테마 즉시 변경 + DB 저장
  const handleThemeSelect = async (themeId) => {
    onThemeChange(themeId);  // 즉시 화면 반영
    const { error } = await supabase
      .from('users')
      .update({ theme: themeId })
      .eq('id', userId);
    if (error) {
      modal.alert('테마 저장 실패: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    const ok = await modal.confirm('로그아웃할까요?');
    if (!ok) return;
    await supabase.auth.signOut();
  };

  // 옵션 카드 클릭 → 즉시 적용 + 저장
  const handlePickAvatar = async (url) => {
    setProfile({ ...profile, avatar_url: url });
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: url })
      .eq('id', userId);
    if (error) console.warn('아바타 저장 실패:', error);
  };

  // 새로운 6개 옵션으로 갱신
  const handleRefreshOptions = () => {
    setAvatarOptions(generateOptions(6));
  };

  if (loading) return <div className="page">불러오는 중...</div>;

  return (
    <div className="page">
      <h2 style={{ color: 'var(--color-text)', marginBottom: 20 }}>내 정보 ⚙️</h2>

      {/* 현재 프로필 사진 + 닉네임 + 스트릭 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'var(--color-bg)',
              border: '3px solid var(--color-primary-light)',
              marginBottom: 12,
            }}
          />
        ) : (
          <div
            style={{
              width: 96, height: 96, borderRadius: '50%',
              background: 'var(--color-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
              border: '3px solid var(--color-primary-light)',
              marginBottom: 12,
            }}
          >
            🫘
          </div>
        )}

        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
          {profile?.nickname}
        </div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
          스트릭 🔥 {profile?.streak ?? 0}일
        </div>
      </div>

      {/* 콩이 고르기 — 6개 옵션 + 다른 거 보기 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <label style={{ fontSize: 12, color: '#888' }}>
            콩이 고르기
          </label>
          <button
            onClick={handleRefreshOptions}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', padding: 4,
            }}
          >
            🎲 다른 거 보기
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}>
          {avatarOptions.map((url) => {
            const selected = profile?.avatar_url === url;
            return (
              <button
                key={url}
                onClick={() => handlePickAvatar(url)}
                style={{
                  padding: 8, borderRadius: 12,
                  background: selected ? 'var(--color-bg)' : '#fafafa',
                  border: `2px solid ${selected ? 'var(--color-primary)' : '#eee'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  aspectRatio: '1 / 1',
                  minWidth: 0,
                  transition: 'all 0.15s',
                }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 닉네임 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }}>
          닉네임
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            style={{
              flex: 1, padding: 12,
              border: '1px solid #eee', borderRadius: 12,
              fontSize: 15,
            }}
          />
          <button
            className="btn-primary"
            onClick={handleSaveNickname}
            disabled={savingNickname || nickname.trim() === profile?.nickname}
            style={{ width: 'auto', padding: '0 16px' }}
          >
            저장
          </button>
        </div>
      </div>

      {/* 테마 선택 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#888', marginBottom: 8, display: 'block' }}>
          테마
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {THEMES.map((t) => {
            const selected = currentTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.id)}
                style={{
                  padding: 12, borderRadius: 12,
                  border: `2px solid ${selected ? t.color : '#eee'}`,
                  background: t.bg,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  minWidth: 0,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: t.color,
                    boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${t.color}` : 'none',
                  }}
                />
                <span style={{ fontSize: 12, color: t.color, fontWeight: selected ? 700 : 500 }}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 로그아웃 */}
      <button className="btn-ghost" onClick={handleSignOut} style={{ width: '100%' }}>
        로그아웃
      </button>
    </div>
  );
}
