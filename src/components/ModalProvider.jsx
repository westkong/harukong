import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used inside <ModalProvider>');
  return ctx;
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);  // { type, message, resolve }

  // alert 대체 — Promise 반환
  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: 'alert', message, resolve });
    });
  }, []);

  // confirm 대체 — true/false Promise 반환
  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: 'confirm', message, resolve });
    });
  }, []);

  const handleClose = (result) => {
    modal?.resolve(result);
    setModal(null);
  };

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}
      {modal && (
        <div
          onClick={() => modal.type === 'alert' && handleClose()}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16,
              width: '100%', maxWidth: 320,
              padding: '24px 20px 16px',
            }}
          >
            <p style={{
              fontSize: 15, lineHeight: 1.5, color: '#333',
              textAlign: 'center', marginBottom: 20,
              whiteSpace: 'pre-wrap',
            }}>
              {modal.message}
            </p>
            {modal.type === 'alert' ? (
              <button
                onClick={() => handleClose()}
                style={{
                  width: '100%', padding: 12,
                  background: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}
              >
                확인
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleClose(false)}
                  style={{
                    flex: 1, padding: 12,
                    background: '#f3f3f3', color: '#666',
                    border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={() => handleClose(true)}
                  style={{
                    flex: 1, padding: 12,
                    background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 12,
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
