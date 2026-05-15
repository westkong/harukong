import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { generateComment } from '../lib/claude';
import { useModal } from './ModalProvider';

// 사용자 로컬(한국 시간) 기준 'YYYY-MM-DD'
// new Date().toISOString() 은 UTC라서 한국이랑 9시간 차이 → 사용 금지
const getLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Home({ userId }) {
  const modal = useModal();
  const [todayPost, setTodayPost] = useState(null);
  const [postSharedGroups, setPostSharedGroups] = useState([]);  // 오늘 글이 공유된 그룹 목록
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);  // 체크된 그룹 id들
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [streak, setStreak] = useState({ count: 0, lastDate: null });
  const fileInputRef = useRef(null);

  // 초기 로딩
  useEffect(() => {
    const today = getLocalDate();

    Promise.all([
      supabase
        .from('posts')
        .select('*, post_groups(group_id, groups(id, name))')
        .eq('user_id', userId)
        .eq('posted_date', today)
        .maybeSingle(),
      supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('user_id', userId),
      supabase
        .from('users')
        .select('streak, last_posted_at')
        .eq('id', userId)
        .single(),
    ]).then(([postRes, groupsRes, userRes]) => {
      if (postRes.data) {
        setTodayPost(postRes.data);
        setPostSharedGroups(postRes.data.post_groups?.map((pg) => pg.groups).filter(Boolean) ?? []);
      }
      if (groupsRes.data) {
        setMyGroups(groupsRes.data.map((r) => r.groups).filter(Boolean));
      }
      if (userRes.data) {
        setStreak({ count: userRes.data.streak ?? 0, lastDate: userRes.data.last_posted_at });
      }
      setLoading(false);
    });
  }, [userId]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const enterEditMode = () => {
    setText(todayPost.text ?? '');
    setPhotoFile(null);
    setPhotoPreview(todayPost.photo_url);
    setSelectedGroupIds(postSharedGroups.map((g) => g.id));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setText('');
    setSelectedGroupIds([]);
  };

  const toggleGroup = (gid) => {
    setSelectedGroupIds((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]
    );
  };

  const uploadPhoto = async (file) => {
    const ext = file.name.split('.').pop();
    const today = getLocalDate().replace(/-/g, '');
    const filename = `${userId}/${today}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('posts').upload(filename, file);
    if (error) throw error;
    const { data } = supabase.storage.from('posts').getPublicUrl(filename);
    return { publicUrl: data.publicUrl, path: filename };
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fetchAiComment = async (file) => {
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';
      return await generateComment(base64, mediaType);
    } catch (err) {
      console.warn('콩이 한마디 생성 실패:', err);
      return null;
    }
  };

  // 게시물 ↔ 그룹 매핑 저장 (insert만, 기존 다 지운 후 새로 생성)
  const setPostGroups = async (postId, groupIds) => {
    // 기존 매핑 모두 삭제
    await supabase.from('post_groups').delete().eq('post_id', postId);
    // 새 매핑 추가
    if (groupIds.length > 0) {
      const rows = groupIds.map((gid) => ({ post_id: postId, group_id: gid }));
      await supabase.from('post_groups').insert(rows);
    }
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      modal.alert('사진을 선택해주세요');
      return;
    }
    setUploading(true);
    try {
      const [{ publicUrl }, aiComment] = await Promise.all([
        uploadPhoto(photoFile),
        fetchAiComment(photoFile),
      ]);

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          photo_url: publicUrl,
          text: text.trim() || null,
          ai_comment: aiComment,
          posted_date: getLocalDate(),  // 한국 시간 기준 명시
        })
        .select()
        .single();
      if (error) throw error;

      // 선택한 그룹들에 공유
      await setPostGroups(newPost.id, selectedGroupIds);

      // 다시 조회 (공유 그룹 정보 포함)
      const { data: full } = await supabase
        .from('posts')
        .select('*, post_groups(group_id, groups(id, name))')
        .eq('id', newPost.id)
        .single();

      setTodayPost(full);
      setPostSharedGroups(full?.post_groups?.map((pg) => pg.groups).filter(Boolean) ?? []);
      setPhotoFile(null);
      setPhotoPreview(null);
      setText('');
      setSelectedGroupIds([]);

      // 트리거가 갱신한 streak 다시 가져오기
      const { data: userRow } = await supabase
        .from('users')
        .select('streak, last_posted_at')
        .eq('id', userId)
        .single();
      if (userRow) setStreak({ count: userRow.streak ?? 0, lastDate: userRow.last_posted_at });
    } catch (err) {
      console.error(err);
      modal.alert('업로드 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    setUploading(true);
    try {
      let newPhotoUrl = todayPost.photo_url;
      let newAiComment = todayPost.ai_comment;

      if (photoFile && photoPreview !== todayPost.photo_url) {
        const [{ publicUrl }, aiComment] = await Promise.all([
          uploadPhoto(photoFile),
          fetchAiComment(photoFile),
        ]);
        newPhotoUrl = publicUrl;
        newAiComment = aiComment;

        const oldPath = todayPost.photo_url.split('/posts/').pop();
        if (oldPath) await supabase.storage.from('posts').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          photo_url: newPhotoUrl,
          text: text.trim() || null,
          ai_comment: newAiComment,
          edited_at: new Date().toISOString(),
        })
        .eq('id', todayPost.id);
      if (updateError) throw updateError;

      // 그룹 공유 매핑 갱신
      await setPostGroups(todayPost.id, selectedGroupIds);

      const { data: full } = await supabase
        .from('posts')
        .select('*, post_groups(group_id, groups(id, name))')
        .eq('id', todayPost.id)
        .single();

      setTodayPost(full);
      setPostSharedGroups(full?.post_groups?.map((pg) => pg.groups).filter(Boolean) ?? []);
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setText('');
      setSelectedGroupIds([]);
    } catch (err) {
      console.error(err);
      modal.alert('수정 실패: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="page">불러오는 중...</div>;

  // 스트릭 상태별 메시지 (한국 시간 기준)
  const today = getLocalDate();
  const yesterday = getLocalDate(new Date(Date.now() - 86400000));
  let streakMessage = null;
  if (streak.count === 0) {
    streakMessage = '오늘 첫 기록을 시작해보세요 🌱';
  } else if (streak.lastDate === today) {
    streakMessage = `🔥 ${streak.count}일 연속 — 오늘도 잘했어요!`;
  } else if (streak.lastDate === yesterday) {
    streakMessage = `🔥 ${streak.count}일 연속 — 오늘 올리면 ${streak.count + 1}일!`;
  } else {
    streakMessage = '연속 기록이 끊겼어요 🌱 오늘 다시 시작해요!';
  }

  // ====== 오늘 글 표시 ======
  if (todayPost && !editMode) {
    const alreadyEdited = todayPost.edited_at !== null;
    const sharedText = postSharedGroups.length === 0
      ? '🔒 혼자만 보는 기록'
      : `📤 ${postSharedGroups.map((g) => g.name).join(', ')} 에 공유됨`;

    return (
      <div className="page">
        <h2 style={{ color: 'var(--color-text)', marginBottom: 8 }}>오늘의 기록 🫘</h2>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{sharedText}</p>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
          background: 'var(--color-bg)', padding: '8px 12px',
          borderRadius: 10, marginBottom: 16, textAlign: 'center',
        }}>
          {streakMessage}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {todayPost.photo_url && (
            <img src={todayPost.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
          )}
          {todayPost.text && (
            <p style={{ padding: 16, fontSize: 15, lineHeight: 1.5 }}>{todayPost.text}</p>
          )}
        </div>

        {todayPost.ai_comment && (
          <div
            style={{
              marginTop: 12, padding: '12px 16px',
              background: 'var(--color-bg)', borderRadius: 12,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>🫘</span>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text)', fontWeight: 600, marginBottom: 2 }}>
                콩이 한마디
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: '#444' }}>{todayPost.ai_comment}</p>
            </div>
          </div>
        )}

        {alreadyEdited ? (
          <p style={{ color: '#aaa', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
            오늘 기록은 잠겼어요 🔒
          </p>
        ) : (
          <button className="btn-ghost" onClick={enterEditMode} style={{ marginTop: 16, width: '100%' }}>
            수정하기 (1회 가능)
          </button>
        )}
      </div>
    );
  }

  // ====== 새 글 / 수정 폼 ======
  const isEditing = editMode;
  return (
    <div className="page">
      <h2 style={{ color: 'var(--color-text)', marginBottom: 8 }}>
        {isEditing ? '오늘의 기록 수정' : '오늘의 기록 🫘'}
      </h2>
      {!isEditing && (
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
          background: 'var(--color-bg)', padding: '8px 12px',
          borderRadius: 10, marginBottom: 16, textAlign: 'center',
        }}>
          {streakMessage}
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: '100%', aspectRatio: '1 / 1',
          background: 'var(--color-bg)',
          border: '2px dashed var(--color-primary-light)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: 16, overflow: 'hidden',
        }}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text)' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14 }}>사진 선택하기</div>
          </div>
        )}
      </div>

      {isEditing && (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12, textAlign: 'center' }}>
          사진을 다시 선택하지 않으면 기존 사진이 유지돼요
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘은 어땠어요?"
        maxLength={140}
        style={{
          width: '100%', minHeight: 80, padding: 12,
          border: '1px solid #eee', borderRadius: 12,
          fontSize: 15, fontFamily: 'inherit', resize: 'none',
          marginBottom: 16,
        }}
      />

      {/* 공유할 그룹 체크박스 */}
      {myGroups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            어디에 공유할까요? <span style={{ color: '#bbb' }}>(체크 안 하면 혼자만 봐요)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {myGroups.map((g) => {
              const checked = selectedGroupIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: checked ? 'var(--color-bg)' : '#fafafa',
                    border: `1px solid ${checked ? 'var(--color-primary-light)' : '#eee'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGroup(g.id)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 14, color: checked ? 'var(--color-text)' : '#666', fontWeight: checked ? 600 : 400 }}>
                    📤 {g.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={cancelEdit} disabled={uploading} style={{ flex: 1 }}>
            취소
          </button>
          <button className="btn-primary" onClick={handleEdit} disabled={uploading} style={{ flex: 2 }}>
            {uploading ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      ) : (
        <button className="btn-primary" onClick={handleSubmit} disabled={uploading || !photoFile}>
          {uploading ? '올리는 중...' : '기록하기'}
        </button>
      )}
    </div>
  );
}
