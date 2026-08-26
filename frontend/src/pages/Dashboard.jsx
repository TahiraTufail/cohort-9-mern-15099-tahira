import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotes, deleteNote } from '../services/noteService';
import NoteEditor from '../components/NoteEditor';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Note editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [selectedNote, setSelectedNote] = useState(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotes();
      // res.data.notes from backend response envelope
      const fetchedNotes = res.data?.notes || res.notes || [];
      setNotes(fetchedNotes);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleOpenCreate = () => {
    setSelectedNote(null);
    setEditorMode('create');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (note) => {
    setSelectedNote(note);
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedNote(null);
  };

  const handleSaveSuccess = () => {
    setIsEditorOpen(false);
    setSelectedNote(null);
    fetchNotes();
  };

  const handleDeletePrompt = (noteId, e) => {
    e.stopPropagation();
    setDeletingId(noteId);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleConfirmDelete = async (noteId, e) => {
    e.stopPropagation();
    setDeleteLoading(true);
    try {
      await deleteNote(noteId);
      setDeletingId(null);
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="dashboard-layout">
      {/* Left Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-top">
          <div className="brand-badge">
            <span className="brand-icon">N</span>
            <span className="brand-name">Notes</span>
          </div>

          <div className="user-profile-card">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email || ''}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button type="button" className="btn-signout" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dash-main">
        <header className="dash-header">
          <div className="header-title-area">
            <h1 className="dash-title">My Notes</h1>
            <span className="notes-count-badge">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>

          <button
            type="button"
            className="btn-primary btn-new-note"
            onClick={handleOpenCreate}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Note</span>
          </button>
        </header>

        {error && (
          <div className="form-error-banner dashboard-error" role="alert">
            {error}
          </div>
        )}

        {/* Notes Content */}
        {loading ? (
          <div className="notes-grid" data-testid="notes-loading-skeletons">
            {[1, 2, 3].map((i) => (
              <div key={i} className="note-skeleton" data-testid="note-skeleton">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-body" />
                <div className="skeleton-line skeleton-body short" />
                <div className="skeleton-line skeleton-date" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="note-empty-state">
            <div className="empty-illustration-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="empty-title">No notes created yet</h3>
            <p className="empty-subtitle">
              Capture your ideas, meeting notes, and reminders in one place.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreate}
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => {
              const isConfirmingDelete = deletingId === note._id;
              return (
                <div
                  key={note._id}
                  className={`note-card ${isConfirmingDelete ? 'note-card--confirming' : ''}`}
                  onClick={() => !isConfirmingDelete && handleOpenEdit(note)}
                >
                  <div className="note-card__header">
                    <h3 className="note-card__title">{note.title}</h3>
                  </div>

                  <p className="note-card__preview">
                    {note.content}
                  </p>

                  <div className="note-card__footer">
                    <span className="note-card__date">
                      {formatDate(note.updatedAt || note.createdAt)}
                    </span>

                    {isConfirmingDelete ? (
                      <div className="confirm-strip" onClick={(e) => e.stopPropagation()}>
                        <span className="confirm-label">Delete?</span>
                        <button
                          type="button"
                          className="btn-danger btn-xs"
                          onClick={(e) => handleConfirmDelete(note._id, e)}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? '...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-xs"
                          onClick={handleCancelDelete}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="note-card__actions">
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm"
                          title="Edit note"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(note);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-sm btn-icon-danger"
                          title="Delete note"
                          onClick={(e) => handleDeletePrompt(note._id, e)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Note Editor Drawer */}
      <NoteEditor
        isOpen={isEditorOpen}
        mode={editorMode}
        note={selectedNote}
        onSave={handleSaveSuccess}
        onCancel={handleCloseEditor}
      />
    </div>
  );
};

export default Dashboard;
