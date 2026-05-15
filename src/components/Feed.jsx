import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EMOJIS = ['🥹', '👍', '🔥', '🫶'];

// 한국 시간 기준 'YYYY-MM-DD' (UTC 차이 방지)
const getLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Feed({ userId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    const today = getLocalDate();
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users(nickname, avatar_url),
        post_groups!inner(groups(id, name)),
        reactions(id, emoji, user_id)
      `)
      .eq('posted_date', today)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadFeed();
  }, [userId]);

  // 이모지 토글 — 낙관적 업데이트 (먼저 화면 갱신, 그 다음 DB)
  const toggleReaction = async (post, emoji) => {
    const mine = post.reactions?.find((r) => r.user_id === userId && r.emoji === emoji);

    // 화면 즉시 반영
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        const newReactions = mine
          ? p.reactions.filter((r) => r.id !== mine.id)
          : [...(p.reactions ?? []), { id: 'temp-' + Date.now(), emoji, user_id: userId }];
        return { ...p, reactions: newReactions };
      })
    );

    // DB 작업
    if (mine && !mine.id.toString().startsWith('temp-')) {
      await supabase.from('reactions').delete().eq('id', mine.id);
    } else if (!mine) {
      const { data } = await supabase
        .from('reactions')
        .insert({ post_id: post.id, user_id: userId, emoji })
        .select()
        .single();
      // 임시 id를 진짜 id로 교체
      if (data) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== post.id) return p;
            return {
              ...p,
              reactions: p.reactions.map((r) =>
                r.user_id === userId && r.emoji === emoji && r.id.toString().startsWith('temp-')
                  ? data
                  : r
              ),
            };
          })
        );
      }
    }
  };

  if (loading) return <div className="page">불러오는 중...</div>;

  return (
    <div className="page">
      <h2 style={{ color: 'var(--color-text)', marginBottom: 16 }}>오늘의 피드 👥</h2>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 60 }}>
          아직 오늘 올라온 기록이 없어요 🌱
          <br />
          <span style={{ fontSize: 12, color: '#bbb' }}>친구가 글을 올리면 여기 보여요</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post) => {
            const groupNames = post.post_groups?.map((pg) => pg.groups?.name).filter(Boolean) ?? [];
            return (
              <div key={post.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* 작성자 정보 */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {post.users?.avatar_url ? (
                    <img
                      src={post.users.avatar_url}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--color-primary-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}
                    >
                      🫘
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {post.users?.nickname ?? '이름없음'}
                      {post.user_id === userId && (
                        <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, marginLeft: 6 }}>(나)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      📤 {groupNames.join(', ')}
                    </div>
                  </div>
                </div>

                {post.photo_url && (
                  <img src={post.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
                )}

                {post.text && (
                  <p style={{ padding: '12px 14px', fontSize: 14, lineHeight: 1.5 }}>{post.text}</p>
                )}

                {post.ai_comment && (
                  <div
                    style={{
                      margin: '0 14px 12px',
                      padding: '10px 12px',
                      background: 'var(--color-bg)',
                      borderRadius: 10,
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🫘</span>
                    <p style={{ fontSize: 13, lineHeight: 1.4, color: '#444' }}>{post.ai_comment}</p>
                  </div>
                )}

                {/* 이모지 반응 바 */}
                <div
                  style={{
                    display: 'flex', gap: 6,
                    padding: '8px 14px 14px',
                    flexWrap: 'wrap',
                  }}
                >
                  {EMOJIS.map((emoji) => {
                    const count = post.reactions?.filter((r) => r.emoji === emoji).length ?? 0;
                    const mine = post.reactions?.some((r) => r.emoji === emoji && r.user_id === userId);
                    return (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(post, emoji)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px',
                          borderRadius: 18,
                          background: mine ? 'var(--color-bg)' : '#f5f5f5',
                          border: `1px solid ${mine ? 'var(--color-primary)' : 'transparent'}`,
                          cursor: 'pointer',
                          fontSize: 14,
                          color: mine ? 'var(--color-text)' : '#666',
                          fontWeight: mine ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span style={{ fontSize: 12 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
