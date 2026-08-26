import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from './NoteEditor';
import * as noteService from '../services/noteService';

// Mock noteService
jest.mock('../services/noteService');

// Controlled state mock for Tiptap editor in tests
let mockEditorText = '';

jest.mock('@tiptap/react', () => ({
  useEditor: ({ onUpdate }) => ({
    getText: () => mockEditorText,
    getHTML: () => `<p>${mockEditorText}</p>`,
    commands: {
      setContent: (newContent) => {
        mockEditorText = newContent || '';
      },
    },
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: jest.fn() }),
        toggleItalic: () => ({ run: jest.fn() }),
        toggleBulletList: () => ({ run: jest.fn() }),
        toggleHeading: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: () => false,
  }),
  EditorContent: () => (
    <textarea
      data-testid="mock-tiptap-textarea"
      value={mockEditorText}
      onChange={(e) => {
        mockEditorText = e.target.value;
      }}
    />
  ),
}));

describe('NoteEditor Component', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditorText = '';
  });

  test('does not render when isOpen is false', () => {
    render(
      <NoteEditor
        isOpen={false}
        mode="create"
        note={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders in create mode with empty title', () => {
    render(
      <NoteEditor
        isOpen={true}
        mode="create"
        note={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter note title...')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create Note' })).toBeInTheDocument();
  });

  test('renders in edit mode with pre-filled title and note content', () => {
    const existingNote = {
      _id: 'note-123',
      title: 'Existing Architecture Note',
      content: 'System diagram details',
    };

    render(
      <NoteEditor
        isOpen={true}
        mode="edit"
        note={existingNote}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Edit Note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter note title...')).toHaveValue('Existing Architecture Note');
    expect(screen.getByRole('button', { name: 'Update Note' })).toBeInTheDocument();
  });

  test('shows inline error when saving with an empty title', async () => {
    render(
      <NoteEditor
        isOpen={true}
        mode="create"
        note={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByTestId('mock-tiptap-textarea');
    fireEvent.change(textarea, { target: { value: 'Valid content' } });

    const saveBtn = screen.getByRole('button', { name: 'Create Note' });
    fireEvent.click(saveBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required');
    expect(noteService.createNote).not.toHaveBeenCalled();
  });

  test('calls createNote on save in create mode', async () => {
    noteService.createNote.mockResolvedValue({
      status: 'success',
      data: { note: { _id: 'new-1', title: 'New Note Title', content: 'Brand new content' } },
    });

    render(
      <NoteEditor
        isOpen={true}
        mode="create"
        note={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByPlaceholderText('Enter note title...');
    fireEvent.change(titleInput, { target: { value: 'New Note Title' } });

    const textarea = screen.getByTestId('mock-tiptap-textarea');
    fireEvent.change(textarea, { target: { value: 'Brand new content' } });

    const saveBtn = screen.getByRole('button', { name: 'Create Note' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(noteService.createNote).toHaveBeenCalledWith('New Note Title', 'Brand new content');
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  test('calls updateNote on save in edit mode', async () => {
    const existingNote = {
      _id: 'note-456',
      title: 'Old Title',
      content: 'Some content',
    };

    noteService.updateNote.mockResolvedValue({
      status: 'success',
      data: { note: { _id: 'note-456', title: 'Updated Title', content: 'Updated content' } },
    });

    render(
      <NoteEditor
        isOpen={true}
        mode="edit"
        note={existingNote}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByPlaceholderText('Enter note title...');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const textarea = screen.getByTestId('mock-tiptap-textarea');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    const saveBtn = screen.getByRole('button', { name: 'Update Note' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(noteService.updateNote).toHaveBeenCalledWith('note-456', 'Updated Title', 'Updated content');
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onCancel immediately when clean and cancel clicked', () => {
    const existingNote = {
      _id: 'note-789',
      title: 'Clean Note',
      content: 'Clean content',
    };

    render(
      <NoteEditor
        isOpen={true}
        mode="edit"
        note={existingNote}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('displays backend error message inline when save fails', async () => {
    noteService.createNote.mockRejectedValue({
      response: {
        data: {
          message: 'Title must be at least 3 characters',
        },
      },
    });

    render(
      <NoteEditor
        isOpen={true}
        mode="create"
        note={null}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByPlaceholderText('Enter note title...');
    fireEvent.change(titleInput, { target: { value: 'Ab' } });

    const textarea = screen.getByTestId('mock-tiptap-textarea');
    fireEvent.change(textarea, { target: { value: 'Some content' } });

    const saveBtn = screen.getByRole('button', { name: 'Create Note' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Title must be at least 3 characters');
    });
  });
});
