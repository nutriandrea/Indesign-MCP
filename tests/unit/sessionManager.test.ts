import { describe, it, expect } from 'vitest';
import { SessionManager } from '../../src/core/SessionManager.js';

describe('SessionManager', () => {
  it('should start with empty sessions map', () => {
    const sm = new SessionManager();
    expect(sm.getAllSessions().size).toBe(0);
  });

  it('should getOrCreate a new session', () => {
    const sm = new SessionManager();
    const session = sm.getOrCreate('session-1');
    expect(session).toBeDefined();
    expect(session.documentHistory).toEqual([]);
    expect(session.activeDoc).toBeUndefined();
  });

  it('should return same session on repeated getOrCreate', () => {
    const sm = new SessionManager();
    const s1 = sm.getOrCreate('same-id');
    const s2 = sm.getOrCreate('same-id');
    expect(s1).toBe(s2);
  });

  it('should set active document for a session', () => {
    const sm = new SessionManager();
    sm.getOrCreate('session-1');
    sm.setActiveDoc('session-1', {
      name: 'test.indd',
      pages: 10,
      pageWidth: 300,
      pageHeight: 400,
    });
    const session = sm.getOrCreate('session-1');
    expect(session.activeDoc).toBeDefined();
    expect(session.activeDoc?.name).toBe('test.indd');
    expect(session.activeDoc?.pages).toBe(10);
  });

  it('should track document history', () => {
    const sm = new SessionManager();
    const doc1 = { name: 'doc1.indd', pages: 1, pageWidth: 300, pageHeight: 400 };
    const doc2 = { name: 'doc2.indd', pages: 5, pageWidth: 600, pageHeight: 800 };

    sm.setActiveDoc('session-1', doc1);
    expect(sm.getOrCreate('session-1').documentHistory).toEqual(['doc1.indd']);

    sm.setActiveDoc('session-1', doc2);
    expect(sm.getOrCreate('session-1').documentHistory).toEqual(['doc1.indd', 'doc2.indd']);
  });

  it('should not duplicate document names in history', () => {
    const sm = new SessionManager();
    const doc = { name: 'doc.indd', pages: 1, pageWidth: 300, pageHeight: 400 };
    sm.setActiveDoc('session-1', doc);
    sm.setActiveDoc('session-1', doc);
    expect(sm.getOrCreate('session-1').documentHistory).toEqual(['doc.indd']);
  });

  it('should clear a session', () => {
    const sm = new SessionManager();
    sm.getOrCreate('session-1');
    sm.getOrCreate('session-2');
    expect(sm.getAllSessions().size).toBe(2);
    sm.clearSession('session-1');
    expect(sm.getAllSessions().size).toBe(1);
    expect(sm.getAllSessions().has('session-1')).toBe(false);
  });
});
