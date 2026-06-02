import type { SessionState, DocumentInfo } from '../types/index.js';

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();

  getOrCreate(sessionId: string): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = { documentHistory: [] };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  setActiveDoc(sessionId: string, doc: DocumentInfo): void {
    const session = this.getOrCreate(sessionId);
    session.activeDoc = doc;
    if (!session.documentHistory.includes(doc.name)) {
      session.documentHistory.push(doc.name);
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getAllSessions(): Map<string, SessionState> {
    return this.sessions;
  }
}
