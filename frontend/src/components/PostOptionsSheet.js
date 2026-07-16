import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Archive, Trash2 } from 'lucide-react';
import api from '../utils/api';

export default function PostOptionsSheet({ post, onClose, onUpdated, onDeleted, onArchived }) {
  const [mode, setMode] = useState('menu'); // 'menu' | 'edit' | 'confirmArchive' | 'confirmDelete'
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleEdit() {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    try {
      const res = await api.patch(`/posts/${post.id}`, { content: editContent.trim() });
      onUpdated?.(res.data);
      onClose();
    } catch {
      showToast('Failed to save — try again');
    }
    setSaving(false);
  }

  async function handleArchive() {
    setSaving(true);
    try {
      await api.patch(`/posts/${post.id}`, { isArchived: true });
      onArchived?.(post.id);
      onClose();
    } catch {
      showToast('Failed to archive — try again');
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/posts/${post.id}`);
      onDeleted?.(post.id);
      onClose();
    } catch {
      showToast('Failed to delete — try again');
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="w-full max-w-md pb-8 px-4"
          onClick={e => e.stopPropagation()}
        >
          {mode === 'menu' && (
            <>
              <div className="bg-white rounded-2xl overflow-hidden mb-3">
                <ActionRow
                  icon={<Edit2 size={18} strokeWidth={1.8} color="#374151" />}
                  label="Edit Post"
                  onClick={() => setMode('edit')}
                />
                <div className="h-px bg-gray-100 mx-4" />
                <ActionRow
                  icon={<Archive size={18} strokeWidth={1.8} color="#374151" />}
                  label="Archive"
                  onClick={() => setMode('confirmArchive')}
                />
                <div className="h-px bg-gray-100 mx-4" />
                <ActionRow
                  icon={<Trash2 size={18} strokeWidth={1.8} color="#ef4444" />}
                  label="Delete"
                  labelColor="text-red-500"
                  onClick={() => setMode('confirmDelete')}
                />
              </div>
              <button
                onClick={onClose}
                className="w-full bg-white rounded-2xl text-gray-500 font-semibold text-base text-center py-4"
              >
                Cancel
              </button>
            </>
          )}

          {mode === 'edit' && (
            <div className="bg-white rounded-2xl p-5">
              <p className="text-base font-semibold text-gray-900 mb-4">Edit Post</p>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={5}
                autoFocus
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none leading-relaxed border border-gray-100"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setMode('menu')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={saving || !editContent.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: editContent.trim() ? '#2C4055' : '#d1d5db' }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {mode === 'confirmArchive' && (
            <div className="bg-white rounded-2xl p-5">
              <p className="text-base font-semibold text-gray-900 mb-1">Archive this post?</p>
              <p className="text-sm text-gray-500 mb-5">Only you can see archived posts.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#2C4055' }}
                >
                  {saving ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            </div>
          )}

          {mode === 'confirmDelete' && (
            <div className="bg-white rounded-2xl p-5">
              <p className="text-base font-semibold text-gray-900 mb-1">Delete this post?</p>
              <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('menu')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500"
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {toast && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
            {toast}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ActionRow({ icon, label, labelColor = 'text-gray-900', onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 w-full px-5 active:bg-gray-50 transition-colors"
      style={{ height: 56 }}
    >
      {icon}
      <span className={`text-base font-medium ${labelColor}`}>{label}</span>
    </button>
  );
}
