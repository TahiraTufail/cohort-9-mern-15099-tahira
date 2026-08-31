import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNotes, deleteNote, pinNote, exportNotes, importNotes } from '../services/noteService';
import NoteEditor from '../components/NoteEditor';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search States
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Import / Export Feedback
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Note editor drawer state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [selectedNote, setSelectedNote] = useState(null);

  const fetchNotes = async (searchVal) => {
    setLoading(true);
    setError('');
    try {
      const res = await getNotes(searchVal);
      const fetchedNotes = res.data?.notes || res.notes || [];
      setNotes(fetchedNotes);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(searchQuery);
  }, [searchQuery]);

  // Debounced search logic
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInputValue(value);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSearchQuery('');
  };

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
    fetchNotes(searchQuery);
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
      fetchNotes(searchQuery);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Pin Toggle with Optimistic UI update
  const handlePinToggle = async (note, e) => {
    e.stopPropagation();
    const previousNotes = [...notes];

    // Optimistic Update
    setNotes(prevNotes =>
      prevNotes.map(n =>
        n._id === note._id ? { ...n, pinned: !n.pinned } : n
      )
    );

    try {
      await pinNote(note._id);
    } catch (err) {
      // Rollback on failure
      setNotes(previousNotes);
      setError(err.response?.data?.message || 'Failed to update pin status');
    }
  };

  // Export Notes Handler
  const handleExport = async () => {
    setError('');
    setImportMessage('');
    setImportError('');
    try {
      const blob = await exportNotes();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `notes-export-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      setError('Failed to export notes');
    }
  };

  // Trigger file input click
  const handleImportClick = () => {
    setError('');
    setImportMessage('');
    setImportError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle selected file for import
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = event.target.result;
        const parsed = JSON.parse(rawContent);

        if (!Array.isArray(parsed)) {
          setImportError('Import failed: Selected JSON must be an array of notes');
          return;
        }

        const res = await importNotes(parsed);
        const { importedCount, skippedCount } = res.data || res;
        
        setImportMessage(
          `${importedCount} notes imported successfully${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`
        );
        
        fetchNotes(searchQuery);
      } catch (err) {
        setImportError(err.message?.includes('JSON') 
          ? 'Import failed: File is not valid JSON' 
          : (err.response?.data?.message || 'Failed to import notes')
        );
      }
    };
    reader.readAsText(file);
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

  // Split notes into pinned and unpinned lists
  const pinnedNotes = notes.filter(note => note.pinned);
  const otherNotes = notes.filter(note => !note.pinned);

  // Render Note Card Helper
  const renderNoteCard = (note) => {
    const isConfirmingDelete = deletingId === note._id;
    const cardClasses = [
      'note-card',
      note.pinned && 'note-card--pinned',
      isConfirmingDelete && 'note-card--confirming',
    ].filter(Boolean).join(' ');
    return (
      <div
        key={note._id}
        className={cardClasses}
        data-testid="note-card"
      >
        <div className="note-card__header">
          <h3 className="note-card__title">{note.title}</h3>
          <button
            type="button"
            className={`btn-icon btn-icon-sm btn-pin ${note.pinned ? 'btn-pin--active' : ''}`}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
            onClick={(e) => handlePinToggle(note, e)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="17" x2="12" y2="22" />
              <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.24V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.24c0 .43-.14.85-.4 1.18l-2.78 3.5A2 2 0 0 0 5 15.24z" />
            </svg>
          </button>
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

          {/* Search Box */}
          <div className="search-wrapper">
            <svg className="search-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search notes..."
              value={searchInputValue}
              onChange={handleSearchChange}
            />
            {searchInputValue && (
              <button type="button" className="search-clear-btn" onClick={handleClearSearch} title="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="header-actions">
            <button
              type="button"
              className="btn-secondary btn-export"
              onClick={handleExport}
              title="Export notes"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Export</span>
            </button>
            <button
              type="button"
              className="btn-secondary btn-import"
              onClick={handleImportClick}
              title="Import notes"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Import</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleFileChange}
              data-testid="import-file-input"
            />
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
          </div>
        </header>

        {error && (
          <div className="form-error-banner dashboard-error" role="alert">
            {error}
          </div>
        )}

        {importError && (
          <div className="form-error-banner dashboard-error" role="alert">
            {importError}
          </div>
        )}

        {importMessage && (
          <output className="import-message">
            {importMessage}
          </output>
        )}

        {/* Notes Content */}
        {loading && (
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
        )}
        {!loading && notes.length === 0 && searchQuery && (
            <div className="note-empty-state">
              <div className="empty-illustration-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="empty-title">No matching notes found</h3>
              <p className="empty-subtitle">
                Try checking the spelling or query something else.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearSearch}
              >
                Clear Search
              </button>
            </div>
        )}
        {!loading && notes.length === 0 && !searchQuery && (
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
        )}
        {!loading && notes.length > 0 && (
          <div className="notes-sections-wrapper">
            {/* Pinned Notes Grid Section */}
            {pinnedNotes.length > 0 && (
              <div className="notes-section">
                <p className="section-label">Pinned</p>
                <div className="notes-grid">
                  {pinnedNotes.map(renderNoteCard)}
                </div>
              </div>
            )}

            {/* Unpinned Notes Grid Section */}
            {otherNotes.length > 0 && (
              <div className="notes-section" style={{ marginTop: pinnedNotes.length > 0 ? '2.5rem' : '0' }}>
                {pinnedNotes.length > 0 && <p className="section-label">All Notes</p>}
                <div className="notes-grid">
                  {otherNotes.map(renderNoteCard)}
                </div>
              </div>
            )}
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
