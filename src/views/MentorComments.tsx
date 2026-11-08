import React, { useEffect, useState } from 'react';
import { repo, fmtDate, label } from '../lib/data';

export function MentorCommentsBlock({ entityType, entityId }: { entityType: string; entityId: string }) {
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => { repo.mComments.list(entityType, entityId).then(setRows).catch(() => setRows([])); }, [entityType, entityId]);
    if (!rows.length) return null;
    return <>
        <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Mentor comments</h3>
        {rows.map(c => <div key={c.id} className="small" style={{ padding: '5px 0', borderBottom: '1px solid var(--line)' }}>
            {c.body}<div className="mut small">Mentor - {fmtDate(c.created_at)}</div>
        </div>)}
    </>;
}

export function MentorReviewBlock({ docId }: { docId: string }) {
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => { repo.mReviews.list('document', docId).then(setRows).catch(() => setRows([])); }, [docId]);
    if (!rows.length) return null;
    const r = rows[0];
    return <>
        <h3 style={{ fontSize: 13, margin: '14px 0 6px' }}>Mentor review</h3>
        <div className="small" style={{ marginBottom: 4 }}><span className={`pill p-${r.status === 'reviewed' ? 'approved' : 'under_review'}`}>{label(r.status)}</span> <span className="mut small">{fmtDate(r.reviewed_at || r.updated_at)}</span></div>
        {r.comments && <div className="small" style={{ marginTop: 4 }}><b>Comments:</b> {r.comments}</div>}
        {r.suggestions && <div className="small" style={{ marginTop: 4 }}><b>Suggestions:</b> {r.suggestions}</div>}
        {r.issues && <div className="small" style={{ marginTop: 4, color: 'var(--red)' }}><b>Issues:</b> {r.issues}</div>}
    </>;
}
