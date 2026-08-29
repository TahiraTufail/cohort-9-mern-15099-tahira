import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';
import { useAuth } from '../context/AuthContext';
import * as noteService from '../services/noteService';

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock noteService
jest.mock('../services/noteService');

// Mock Tiptap in NoteEditor when Dashboard renders it
jest.mock('@tiptap/react', () => ({
  useEditor: () => ({
    getText: () => 'Mocked note content',
    getHTML: () => '<p>Mocked note content</p>',
    commands: {
      setContent: jest.fn(),
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
  EditorContent: ({ editor }) => <div data-testid="tiptap-mock">Tiptap Content</div>,
}));

describe('Dashboard Component', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: { name: 'Tahira Tufail', email: 'tahira@example.com' },
      logout: mockLogout,
    });
  });

  test('renders loading state initially while fetching notes', async () => {
    noteService.getNotes.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { notes: [] } }), 100))
    );

    render(<Dashboard />);

    expect(screen.getByTestId('notes-loading-skeletons')).toBeInTheDocument();
    expect(screen.getAllByTestId('note-skeleton')).toHaveLength(3);

    await waitFor(() => {
      expect(screen.queryByTestId('notes-loading-skeletons')).not.toBeInTheDocument();
    });
  });

  test('renders empty state when user has no notes', async () => {
    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: [] },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No notes created yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create your first note')).toBeInTheDocument();
  });

  test('renders notes list when notes exist', async () => {
    const mockNotes = [
      {
        _id: '1',
        title: 'Meeting Notes',
        content: 'Discuss sprint roadmap and backlog items.',
        createdAt: '2026-08-25T10:00:00.000Z',
        updatedAt: '2026-08-25T10:00:00.000Z',
      },
      {
        _id: '2',
        title: 'Grocery List',
        content: 'Milk, eggs, sourdough bread, coffee beans.',
        createdAt: '2026-08-24T10:00:00.000Z',
        updatedAt: '2026-08-24T10:00:00.000Z',
      },
    ];

    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: mockNotes },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
      expect(screen.getByText('Grocery List')).toBeInTheDocument();
    });

    expect(screen.getByText('Discuss sprint roadmap and backlog items.')).toBeInTheDocument();
    expect(screen.getByText('Milk, eggs, sourdough bread, coffee beans.')).toBeInTheDocument();
    expect(screen.getByText('2 notes')).toBeInTheDocument();
  });

  test('displays user info and sign-out button in sidebar', async () => {
    noteService.getNotes.mockResolvedValue({ status: 'success', data: { notes: [] } });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Tahira Tufail')).toBeInTheDocument();
    });

    expect(screen.getByText('tahira@example.com')).toBeInTheDocument();

    const signoutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  test('shows inline delete confirmation and deletes note on confirm', async () => {
    const mockNotes = [
      {
        _id: 'note-100',
        title: 'Note to Delete',
        content: 'This note will be deleted.',
        updatedAt: '2026-08-25T10:00:00.000Z',
      },
    ];

    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: mockNotes },
    });
    noteService.deleteNote.mockResolvedValue({
      status: 'success',
      message: 'Note deleted successfully',
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Note to Delete')).toBeInTheDocument();
    });

    // Click delete icon button
    const deleteBtn = screen.getByTitle('Delete note');
    fireEvent.click(deleteBtn);

    // Confirm strip should appear inline
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    const yesBtn = screen.getByRole('button', { name: 'Yes' });

    // Click Yes to confirm deletion
    fireEvent.click(yesBtn);

    await waitFor(() => {
      expect(noteService.deleteNote).toHaveBeenCalledWith('note-100');
    });
  });

  test('opens editor drawer when New Note button is clicked', async () => {
    noteService.getNotes.mockResolvedValue({ status: 'success', data: { notes: [] } });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No notes created yet')).toBeInTheDocument();
    });

    const newNoteBtn = screen.getByRole('button', { name: /new note/i });
    fireEvent.click(newNoteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New Note' })).toBeInTheDocument();
  });

  test('filters notes by title with debounced search input', async () => {
    jest.useFakeTimers();
    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: [] },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(searchInput, { target: { value: 'Sprint' } });

    // Assert getNotes is not immediately called with the value
    expect(noteService.getNotes).not.toHaveBeenCalledWith('Sprint');

    // Fast-forward time to fire debounce
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(noteService.getNotes).toHaveBeenCalledWith('Sprint');
    });

    // Clear search
    const clearBtn = screen.getByTitle('Clear search');
    fireEvent.click(clearBtn);

    expect(searchInput.value).toBe('');
    
    // Fast-forward debounce
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(noteService.getNotes).toHaveBeenLastCalledWith('');
    });

    jest.useRealTimers();
  });

  test('shows distinct empty state when search returns no matching notes', async () => {
    jest.useFakeTimers();
    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: [] },
    });

    render(<Dashboard />);

    const searchInput = screen.getByPlaceholderText('Search notes...');
    fireEvent.change(searchInput, { target: { value: 'MissingNoteTitle' } });
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('No matching notes found')).toBeInTheDocument();
      expect(screen.getByText('Clear Search')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  test('renders pinned and unpinned notes in separate sections', async () => {
    const mockNotes = [
      {
        _id: '1',
        title: 'Pinned Note 1',
        content: 'Pinned content',
        pinned: true,
        updatedAt: '2026-08-25T10:00:00.000Z',
      },
      {
        _id: '2',
        title: 'Unpinned Note 1',
        content: 'Unpinned content',
        pinned: false,
        updatedAt: '2026-08-24T10:00:00.000Z',
      },
    ];

    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: mockNotes },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pinned')).toBeInTheDocument();
      expect(screen.getByText('All Notes')).toBeInTheDocument();
      expect(screen.getByText('Pinned Note 1')).toBeInTheDocument();
      expect(screen.getByText('Unpinned Note 1')).toBeInTheDocument();
    });
  });

  test('toggles pin optimistically and rolls back on failure', async () => {
    const mockNotes = [
      {
        _id: 'note-pin-id',
        title: 'Toggle Note',
        content: 'Content',
        pinned: false,
        updatedAt: '2026-08-25T10:00:00.000Z',
      },
    ];

    noteService.getNotes.mockResolvedValue({
      status: 'success',
      data: { notes: mockNotes },
    });
    noteService.pinNote.mockRejectedValueOnce(new Error('Network error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Toggle Note')).toBeInTheDocument();
    });

    const pinBtn = screen.getByTitle('Pin note');
    
    // Trigger pin toggle
    fireEvent.click(pinBtn);

    // Optimistically becomes pinned (check section header or class/attribute)
    expect(screen.getByText('Pinned')).toBeInTheDocument();

    // After async failure, rolls back to unpinned
    await waitFor(() => {
      expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
      expect(screen.getByText('Failed to update pin status')).toBeInTheDocument();
    });
  });

  test('triggers exportNotes API on Export button click', async () => {
    noteService.getNotes.mockResolvedValue({ status: 'success', data: { notes: [] } });
    noteService.exportNotes.mockResolvedValueOnce(new Blob(['[]'], { type: 'application/json' }));

    // Mock URL object URL creation
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:url-mock');

    render(<Dashboard />);

    const exportBtn = screen.getByTitle('Export notes');
    fireEvent.click(exportBtn);

    expect(noteService.exportNotes).toHaveBeenCalledTimes(1);
  });

  test('imports notes successfully from a valid JSON array file picker upload', async () => {
    noteService.getNotes.mockResolvedValue({ status: 'success', data: { notes: [] } });
    noteService.importNotes.mockResolvedValueOnce({
      status: 'success',
      data: { importedCount: 3, skippedCount: 0, errors: [] },
    });

    // Mock FileReader behavior
    const dummyFile = new File(['[{"title": "Note"}]'], 'import.json', { type: 'application/json' });
    const mockReader = {
      readAsText: jest.fn().mockImplementation(function (file) {
        this.onload({ target: { result: '[{"title": "Note"}]' } });
      }),
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader);

    render(<Dashboard />);

    const fileInput = screen.getByTestId('import-file-input');
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(noteService.importNotes).toHaveBeenCalledWith([{ title: "Note" }]);
      expect(screen.getByText('3 notes imported successfully')).toBeInTheDocument();
    });

    jest.restoreAllMocks();
  });

  test('displays file level warning when parsing invalid non-array JSON', async () => {
    noteService.getNotes.mockResolvedValue({ status: 'success', data: { notes: [] } });
    const dummyFile = new File(['{"not": "an array"}'], 'invalid.json', { type: 'application/json' });
    
    const mockReader = {
      readAsText: jest.fn().mockImplementation(function (file) {
        this.onload({ target: { result: '{"not": "an array"}' } });
      }),
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader);

    render(<Dashboard />);

    const fileInput = screen.getByTestId('import-file-input');
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(screen.getByText('Import failed: Selected JSON must be an array of notes')).toBeInTheDocument();
      expect(noteService.importNotes).not.toHaveBeenCalled();
    });

    jest.restoreAllMocks();
  });
});
