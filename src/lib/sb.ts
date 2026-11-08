
// localStorage can be unavailable in sandboxed iframes; fall back to memory.
const mem: Record<string, string> = {};
export const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
  del(k: string) { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
};
// Supabase client - anon key only, all authorization enforced by Postgres RLS.
const URL = 'https://dizdotnqrabzoujszqjo.supabase.co';
const ANON = 'sb_publishable_24SCuXcsh6Hbxg-tTNfAeg_LkT7OXsl';
const KEY = 'teqx_session';

export type Session = { access_token: string; refresh_token: string; expires_at: number; user: any };

export function getSession(): Session | null {
    try { const s = store.get(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function setSession(s: Session | null) {
    if (s) store.set(KEY, JSON.stringify(s)); else store.del(KEY);
}

async function authFetch(path: string, body: any): Promise<any> {
    const r = await fetch(`${URL}/auth/v1/${path}`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || `Auth error ${r.status}`);
    return j;
}

export async function signIn(email: string, password: string): Promise<Session> {
    const j = await authFetch('token?grant_type=password', { email, password });
    const s: Session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() / 1000 + (j.expires_in || 3600), user: j.user };
    setSession(s);
    return s;
}

export async function changePassword(newPassword: string): Promise<void> {
    const t = await token();
    const r = await fetch(`${URL}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || `Password change failed ${r.status}`);
}

export async function signOut() {
    const s = getSession();
    if (s) { try { await fetch(`${URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` } }); } catch {} }
    setSession(null);
}

async function token(): Promise<string> {
    let s = getSession();
    if (!s) throw new Error('Not signed in');
    if (s.expires_at - Date.now() / 1000 < 60) {
        const j = await authFetch('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
        s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() / 1000 + (j.expires_in || 3600), user: j.user };
        setSession(s);
    }
    return s!.access_token;
}

export type Q = { select?: string; eq?: Record<string, any>; order?: string; limit?: number; is?: Record<string, string> };

function qs(q: Q): string {
    const p = new URLSearchParams();
    p.set('select', q.select || '*');
    if (q.eq) for (const [k, v] of Object.entries(q.eq)) p.set(k, `eq.${v}`);
    if (q.is) for (const [k, v] of Object.entries(q.is)) p.set(k, `is.${v}`);
    if (q.order) p.set('order', q.order);
    if (q.limit) p.set('limit', String(q.limit));
    return p.toString();
}

export async function dbSelect<T = any>(table: string, q: Q = {}): Promise<T[]> {
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${table}?${qs(q)}`, { headers: { apikey: ANON, Authorization: `Bearer ${t}` } });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Read failed ${r.status}`);
    return j as T[];
}

export async function dbInsert<T = any>(table: string, row: any): Promise<T> {
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(row),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Insert failed ${r.status}`);
    return Array.isArray(j) ? j[0] : j;
}

export async function dbUpdate<T = any>(table: string, id: string, patch: any): Promise<T> {
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(patch),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Update failed ${r.status}`);
    return Array.isArray(j) ? j[0] : j;
}

export async function dbDelete(table: string, id: string): Promise<void> {
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: { apikey: ANON, Authorization: `Bearer ${t}` } });
    if (!r.ok) { const j = await r.json().catch(() => null); throw new Error((j && j.message) || `Delete failed ${r.status}`); }
}

export async function dbUpsert<T = any>(table: string, row: any, onConflict: string): Promise<T> {
    const t = await token();
    const r = await fetch(`${URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(row),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || `Save failed ${r.status}`);
    return Array.isArray(j) ? j[0] : j;
}

export async function uploadDoc(file: File, path: string): Promise<void> {
    const t = await token();
    const r = await fetch(`${URL}/storage/v1/object/documents/${path}`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
    });
    if (!r.ok) { const j = await r.json().catch(() => null); throw new Error((j && j.message) || `Upload failed ${r.status}`); }
}

export async function docSignedUrl(path: string): Promise<string> {
    const t = await token();
    const r = await fetch(`${URL}/storage/v1/object/sign/documents/${path}`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 300 }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.signedURL) throw new Error((j && j.message) || 'Could not get file link');
    return `${URL}/storage/v1${j.signedURL}`;
}
