import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: '홈' },
  { path: '/feed', icon: '👥', label: '피드' },
  { path: '/calendar', icon: '📅', label: '달력' },
  { path: '/group', icon: '🔗', label: '그룹' },
  { path: '/profile', icon: '⚙️', label: '내 정보' },
];

export default function BottomNav({ onThemeChange, currentTheme, userId }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      display: 'flex',
      borderTop: '1px solid #f0f0f0',
      background: 'var(--color-surface)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(({ path, icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              padding: '10px 0 6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              opacity: active ? 1 : 0.45,
            }}
          >
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 10, color: active ? 'var(--color-primary)' : '#999', fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
