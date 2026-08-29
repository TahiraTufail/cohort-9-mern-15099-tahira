import api from './authService';

/**
 * Fetch all notes for the logged-in user.
 * @param {string} [search] Optional search query
 * @returns {Promise<Object>} Backend response { status: 'success', results: number, data: { notes: [] } }
 */
export const getNotes = async (search) => {
  const url = search ? `/notes?search=${encodeURIComponent(search)}` : '/notes';
  const response = await api.get(url);
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

/**
 * Toggle the pinned status of a note.
 * @param {string} id
 * @returns {Promise<Object>} Backend response { status: 'success', data: { note: {} } }
 */
export const pinNote = async (id) => {
  const response = await api.patch(`/notes/${id}/pin`);
  return response.data;
};

/**
 * Export notes as a downloadable JSON blob.
 * @returns {Promise<Blob>} Note content blob
 */
export const exportNotes = async () => {
  const response = await api.get('/notes/export', { responseType: 'blob' });
  return response.data;
};

/**
 * Import notes array.
 * @param {Array<Object>} notesArray
 * @returns {Promise<Object>} Summary { status: 'success', data: { importedCount, skippedCount, errors } }
 */
export const importNotes = async (notesArray) => {
  const response = await api.post('/notes/import', notesArray);
  return response.data;
};

export default {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
  exportNotes,
  importNotes,
};
