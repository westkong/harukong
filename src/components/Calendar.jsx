import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 한국 시간 기준 'YYYY-MM-DD'
const getLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatMonth = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월`;

export default function Calendar({ userId }) {
  const [cursor, setCursor] = useState(() => new Date());  // 보고 있는 달
  const [postedDates, setPostedDates] = useState(new Set());  // 기록한 날짜
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // 현재 보는 달의 시작/끝 날짜
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();  // 0(일)~6(토)
  const daysInMonth = monthEnd.getDate();

  // 그 달의 posts 가져오기
  useEffect(() => {
    const from = getLocalDate(monthStart);
    const to = getLocalDate(monthEnd);
    supabase
      .from('posts')
      .select('posted_date')
      .eq('user_id', userId)
      .gte('posted_date', from)
      .lte('posted_date', to)
      .then(({ data }) => {
        setPostedDates(new Set(data?.map((p) => p.posted_date) ?? []));
        setLoading(false);
      });
  }, [userId, cursor]);

  const today = getLocalDate();

  // 날짜 클릭 → 해당 날짜 글 상세보기
  const handleDateClick = async (dateStr) => {
    if (!postedDates.has(dateStr)) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('posted_date', dateStr)
      .maybeSingle();
    setSelectedPost(data);
  };

  // 그리드 셀 만들기 (앞 빈칸 + 날짜들)
  const cells = [
    ...Array.from({ length: startWeekday }, (_, i) => ({ key: `pad-${i}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        key: dateStr,
        day,
        dateStr,
        posted: postedDates.has(dateStr),
        isToday: dateStr === today,
      };
    }),
  ];

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  // 이번 달 기록 통계
  const recordCount = postedDates.size;
  const monthName = formatMonth(cursor);

  return (
    <div className="page">
      <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>달력 📅</h2>

      {/* 월 네비게이션 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
      }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 8, color: 'var(--color-text)' }}
        >
          ◀
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
          {monthName}
        </div>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 8, color: 'var(--color-text)' }}
        >
          ▶
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 16 }}>
        이번 달 {recordCount}일 기록 ✨
      </p>

      {/* 요일 헤더 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4, marginBottom: 6,
      }}>
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            style={{
              fontSize: 11, textAlign: 'center', color: i === 0 ? '#e88' : i === 6 ? '#88a' : '#888',
              fontWeight: 600,
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {cells.map((cell) =>
          cell.empty ? (
            <div key={cell.key} />
          ) : (
            <button
              key={cell.key}
              onClick={() => handleDateClick(cell.dateStr)}
              disabled={!cell.posted}
              style={{
                aspectRatio: '1 / 1',
                border: cell.isToday ? '2px solid var(--color-primary)' : '1px solid #eee',
                borderRadius: 8,
                background: cell.posted ? 'var(--color-primary)' : '#fafafa',
                color: cell.posted ? '#fff' : '#888',
                fontSize: 13,
                fontWeight: cell.posted ? 700 : 400,
                cursor: cell.posted ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
                transition: 'transform 0.1s',
              }}
            >
              {cell.day}
            </button>
          )
        )}
      </div>

      {/* 선택한 날 미리보기 모달 */}
      {selectedPost && (
        <div
          onClick={() => setSelectedPost(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16,
              width: '100%', maxWidth: 340,
              maxHeight: '80vh', overflow: 'auto',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                {selectedPost.posted_date}
              </span>
              <button
                onClick={() => setSelectedPost(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4, color: '#888' }}
              >
                ✕
              </button>
            </div>
            {selectedPost.photo_url && (
              <img src={selectedPost.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
            )}
            {selectedPost.text && (
              <p style={{ padding: 14, fontSize: 14, lineHeight: 1.5 }}>{selectedPost.text}</p>
            )}
            {selectedPost.ai_comment && (
              <div style={{
                margin: '0 14px 14px', padding: '10px 12px',
                background: 'var(--color-bg)', borderRadius: 10,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18 }}>🫘</span>
                <p style={{ fontSize: 13, lineHeight: 1.4, color: '#444' }}>{selectedPost.ai_comment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
