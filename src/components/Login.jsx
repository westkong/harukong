import { useState } from 'react';
import { signInWithToss } from '../lib/tossAuth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithToss();
      // 성공 시 App의 onAuthStateChange가 화면을 전환한다
    } catch (e) {
      setError(e.message || '로그인에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🫘</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>하루콩</h1>
        <p style={{ color: '#888', fontSize: 14 }}>매일 사진 한 장, 오늘의 기록</p>
      </div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? '시작하는 중...' : '토스로 시작하기'}
        </button>
        {error && (
          <p style={{ color: '#D4723E', fontSize: 13, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
