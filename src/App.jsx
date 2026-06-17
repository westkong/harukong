import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// 페이지 컴포넌트 (추후 구현)
import Home from './components/Home';
import Feed from './components/Feed';
import Calendar from './components/Calendar';
import GroupInvite from './components/GroupInvite';
import Login from './components/Login';
import Profile from './components/Profile';
import BottomNav from './components/BottomNav';
import { ModalProvider } from './components/ModalProvider';

export default function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState('mint');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로그인한 유저의 테마 불러오기
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('users')
      .select('theme')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme) setTheme(data.theme);
      });
  }, [session]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ fontSize: 40 }}>🫘</span>
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <ModalProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={session ? <Home userId={session.user.id} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/feed"
            element={session ? <Feed userId={session.user.id} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/calendar"
            element={session ? <Calendar userId={session.user.id} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/group"
            element={session ? <GroupInvite userId={session.user.id} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/profile"
            element={
              session
                ? <Profile userId={session.user.id} onThemeChange={setTheme} currentTheme={theme} />
                : <Navigate to="/login" replace />
            }
          />
          {/* 토스 딥링크(intoss://harukong/...) 등 미정의 경로 → 홈으로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {session && <BottomNav onThemeChange={setTheme} currentTheme={theme} userId={session.user.id} />}
      </BrowserRouter>
      </ModalProvider>
    </div>
  );
}
