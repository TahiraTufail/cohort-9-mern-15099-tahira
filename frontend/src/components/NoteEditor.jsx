import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PropTypes from 'prop-types';
import { createNote, updateNote } from '../services/noteService';

const NoteEditor = ({ isOpen, mode = 'create', note = null, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialContent, setInitialContent] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  useEffect(() => {
    if (isOpen) {
      setError('');
      setConfirmDiscard(false);

      const initTitle = mode === 'edit' && note ? note.title : '';
      const initContent = mode === 'edit' && note ? note.content : '';

      setTitle(initTitle);
      setInitialTitle(initTitle);

      setInitialContent(initContent);

      if (editor) {
        editor.commands.setContent(initContent || '');
      }
    }
  }, [isOpen, mode, note?._id]);

  if (!isOpen) return null;

  const currentTextContent = editor ? editor.getText().trim() : '';
  const isDirty = title.trim() !== initialTitle.trim() || currentTextContent !== initialContent.trim();

  const handleSave = async () => {
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    const textContent = editor ? editor.getText().trim() : '';

    if (!textContent) {
      setError('Content is required');
      return;
    }

    setSaving(true);

    try {
      if (mode === 'edit' && note?._id) {
        await updateNote(note._id, trimmedTitle, textContent);
      } else {
        await createNote(trimmedTitle, textContent);
      }
      onSave();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save note';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  };

  return (
    <dialog className="editor-overlay" open aria-labelledby="editor-heading">
      <button type="button" className="editor-scrim" aria-label="Close editor" onClick={handleCancelClick} />

      <div className="editor-drawer">
        <div className="editor-header">
          <h2 id="editor-heading" className="editor-heading">
            {mode === 'edit' ? 'Edit Note' : 'New Note'}
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={handleCancelClick}
            aria-label="Close editor"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="editor-error-banner" role="alert">
            {error}
          </div>
        )}

        {confirmDiscard && (
          <div className="editor-confirm-discard">
            <span>You have unsaved changes. Discard them?</span>
            <div className="discard-actions">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirmDiscard(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={onCancel}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="editor-body">
          <div className="form-group">
            <label htmlFor="note-title-input" className="form-label">
              Title
            </label>
            <input
              id="note-title-input"
              type="text"
              className="form-input editor-title-input"
              placeholder="Enter note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note-content-editor">Content</label>
            {editor && (
              <div className="editor-toolbar">
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  title="Bullet list"
                >
                  List
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  title="Heading 2"
                >
                  H2
                </button>
              </div>
            )}
            <div className="editor-content-wrapper">
              <EditorContent id="note-content-editor" editor={editor} className="tiptap-editor" />
            </div>
          </div>
        </div>

        <div className="editor-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCancelClick}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Note' : 'Create Note'}
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default NoteEditor;

NoteEditor.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']),
  note: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
