import api from './authService';

/**
 * Fetch all notes for the logged-in user.
 * @returns {Promise<Object>} Backend response { status: 'success', results: number, data: { notes: [] } }
 */
export const getNotes = async () => {
  const response = await api.get('/notes');
  return response.data;
};

/**
 * Fetch a single note by ID.
 * @param {string} id
 * @returns {Promise<Object>} Backend response { status: 'success', data: { note: {} } }
 */
export const getNoteById = async (id) => {
  const response = await api.get(`/notes/${id}`);
  return response.data;
};

/**
 * Create a new note.
 * @param {string} title
 * @param {string} content
 * @returns {Promise<Object>} Backend response { status: 'success', data: { note: {} } }
 */
export const createNote = async (title, content) => {
  const response = await api.post('/notes', { title, content });
  return response.data;
};

/**
 * Update an existing note.
 * @param {string} id
 * @param {string} title
 * @param {string} content
 * @returns {Promise<Object>} Backend response { status: 'success', data: { note: {} } }
 */
export const updateNote = async (id, title, content) => {
  const response = await api.put(`/notes/${id}`, { title, content });
  return response.data;
};

/**
 * Delete a note by ID.
 * @param {string} id
 * @returns {Promise<Object>} Backend response { status: 'success', message: string }
 */
export const deleteNote = async (id) => {
  const response = await api.delete(`/notes/${id}`);
  return response.data;
};

export default {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
};
