import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity, fmtDate, label } from '../lib/data';
import { CommentPanel } from './Comments';

const REVIEW_STATUSES = ['under_review', 'feedback_provided', 'revision_requested', 'reviewed'];

export function DocumentReview() {
    const { me, founders } = useMentor();
    const [docs, setDocs] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [detail, setDetail] = useState<any | null>(null);
    const [form, setForm] = useState({ status: 'reviewed', comments: '', suggestions: '', issues: '' });
    const [filter, setFilter] = useState('all');
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const load = () => Promise.all([repo.documents.list(), repo.mReviews.list('document').catch(() => [])])
        .then(([d, r]) => { setDocs(d); setReviews(r); }).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const myReview = (docId: string) => reviews.find(r => r.entity_id === docId && r.mentor_id === me.id);
    const shown = docs.filter(d => filter === 'all' || d.status === filter);

    const submitReview = async () => {
        if (!detail) return;
        setMsg(''); setErr('');
        try {
            await repo.mReviews.upsert({ mentor_id: me.id, entity_type: 'document', entity_id: detail.id, status: form.status, comments: form.comments || null, suggestions: form.suggestions || null, issues: form.issues || null, reviewed_at: new Date().toISOString() });
            await logMentorActivity(me.id, 'document_reviewed', 'document', detail.id, `Reviewed document ${detail.doc_code || detail.title}: ${label(form.status)}`);
            setMsg(`Review saved for ${detail.title}`); await load();
        } catch (e: any) { setErr(e.message); }
    };

    return <>
        <div className="topbar"><div><h1>Document Review</h1><p>Read founder documents and leave structured review feedback</p></div></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        <div className="chips" style={{ marginBottom: 12 }}>
            {['all', 'not_started', 'draft', 'under_review', 'approved', 'published', 'archived'].map(s => <button key={s} className={`chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s === 'all' ? 'All' : label(s)}</button>)}
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>Code</th><th>Document</th><th>Category</th><th>Owner</th><th>Status</th><th>Mentor Review</th></tr></thead><tbody>
                {shown.map(d => { const rv = myReview(d.id); return <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => { setDetail(detail?.id === d.id ? null : d); setForm({ status: rv?.status || 'reviewed', comments: rv?.comments || '', suggestions: rv?.suggestions || '', issues: rv?.issues || '' }); }}>
                    <td className="mut">{d.doc_code}</td><td>{d.title}</td><td>{d.category ? label(d.category) : '-'}</td><td>{nameOf(d.responsible_founder)}</td>
                    <td><span className={`pill p-${d.status}`}>{label(d.status)}</span></td>
                    <td>{rv ? <span className={`pill p-${rv.status === 'reviewed' ? 'approved' : 'under_review'}`}>{label(rv.status)}</span> : <span className="mut small">not reviewed</span>}</td>
                </tr>; })}
            </tbody></table> : <div className="empty">No documents in this state.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{detail.doc_code} - {detail.title}</h3>
            {detail.description && <p className="mut small" style={{ marginBottom: 8 }}>{detail.description}</p>}
            <div className="mut small" style={{ marginBottom: 10 }}>Owner: {nameOf(detail.responsible_founder)}{detail.file_name ? ` - File: ${detail.file_name}` : ''}</div>
            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Your Review</h4>
            <div className="grid cards2">
                <label>Review status
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        {REVIEW_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                </label>
                <label>Issues<textarea rows={2} value={form.issues} onChange={e => setForm({ ...form, issues: e.target.value })} placeholder="Problems that must be fixed" /></label>
                <label>Comments<textarea rows={2} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} /></label>
                <label>Suggestions<textarea rows={2} value={form.suggestions} onChange={e => setForm({ ...form, suggestions: e.target.value })} /></label>
            </div>
            <button className="btn" style={{ marginTop: 8 }} onClick={submitReview}>Save review</button>
            <CommentPanel entityType="document" entityId={detail.id} />
        </div>}
    </>;
}
