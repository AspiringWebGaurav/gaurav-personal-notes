import { invoke } from '@tauri-apps/api/core';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const collabService = {
  async createBurnNote(content: string): Promise<string> {
    if (isTauri) {
      return await invoke<string>('cmd_create_burn_note', { content });
    }
    const token = 'burn-' + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('burn_' + token, content);
    return token;
  },

  async readAndBurnNote(token: string): Promise<string | null> {
    if (isTauri) {
      return await invoke<string | null>('cmd_read_and_burn_note', { token });
    }
    const content = sessionStorage.getItem('burn_' + token);
    if (content) {
      sessionStorage.removeItem('burn_' + token);
      return content;
    }
    return null;
  },

  async getCollabRoom(roomId: string): Promise<string | null> {
    if (isTauri) {
      return await invoke<string | null>('cmd_get_collab_room', { roomId });
    }
    return null;
  },

  async updateCollabRoom(roomId: string, stateUpdate: string): Promise<void> {
    if (isTauri) {
      return await invoke<void>('cmd_update_collab_room', { roomId, stateUpdate });
    }
  },
};
