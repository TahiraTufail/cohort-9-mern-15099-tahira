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
});
