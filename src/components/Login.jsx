import { supabase } from '../lib/supabase';

export default function Login() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🫘</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>하루콩</h1>
        <p style={{ color: '#888', fontSize: 14 }}>매일 사진 한 장, 오늘의 기록</p>
      </div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={signInWithGoogle}>
          구글로 시작하기
        </button>
      </div>
    </div>
  );
}
