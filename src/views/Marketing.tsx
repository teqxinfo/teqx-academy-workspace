import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, fmtMoney, label } from '../lib/data';
import { Field, FieldInput, CrudSection } from '../lib/crud';

const TABS = ['Analytics', 'Leads', 'Campaigns', 'Content Calendar', 'Market Research', 'Competitors', 'Brand Assets'];
const LEAD_STATUSES = ['new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'not_interested'];
const PLATFORMS = ['Instagram', 'Facebook', 'YouTube', 'WhatsApp', 'Google Ads', 'LinkedIn', 'Other'];

function Leads({ canWrite, nameOf }: { canWrite: boolean; nameOf: (id?: string) => string }) {
    const { me, founders } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [q, setQ] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [form, setForm] = useState<any>(null);
    const [fu, setFu] = useState<any>(null);
    const [fuList, setFuList] = useState<any[]>([]);
    const [fuNote, setFuNote] = useState('');
    const [fuDate, setFuDate] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    const load = async () => { try { setRows(await repo.leads.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);
    const shown = useMemo(() => rows.filter(r =>
        (!fStatus || r.status === fStatus) &&
        (!q || (r.student_name + (r.interested_course || '') + r.lead_code).toLowerCase().includes(q.toLowerCase()))
    ), [rows, q, fStatus]);

    const fields: Field[] = [
        { key: 'student_name', label: 'Student name', required: true },
        { key: 'contact_number', label: 'Contact number' },
        { key: 'interested_course', label: 'Interested course' },
        { key: 'source', label: 'Lead source', type: 'select', options: ['instagram', 'facebook', 'whatsapp', 'referral', 'walk_in', 'website', 'other'] },
        { key: 'enquiry_date', label: 'Enquiry date', type: 'date' },
        { key: 'assigned_to', label: 'Assigned person', type: 'founder' },
        { key: 'followup_date', label: 'Next follow-up date', type: 'date' },
        { key: 'status', label: 'Lead status', type: 'select', options: LEAD_STATUSES },
        { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ];

    const save = async () => {
        if (!form.student_name) { setErr('Student name is required.'); return; }
        setBusy(true); setErr('');
        try {
            const row: any = {};
            for (const f of fields) { let v = form[f.key]; if (v === '' || v === undefined) v = null; row[f.key] = v; }
            if (form.id) { await repo.leads.update(form.id, row); await logActivity(me.id, 'lead', form.id, 'update', `updated lead ${form.lead_code} (${row.student_name})`); }
            else { const r = await repo.leads.create({ ...row, created_by: me.id }); await logActivity(me.id, 'lead', r.id, 'create', `new lead: ${row.student_name}`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (r: any) => {
        if (!confirm(`Delete lead ${r.lead_code} (${r.student_name})?`)) return;
        await repo.leads.remove(r.id); await logActivity(me.id, 'lead', r.id, 'delete', `deleted lead ${r.lead_code}`); await load();
    };
    const openFu = async (r: any) => { setFu(r); setFuNote(''); setFuDate(''); try { setFuList(await repo.leadFollowups.list(r.id)); } catch { setFuList([]); } };
    const addFu = async () => {
        if (!fuNote.trim()) return;
        setBusy(true);
        try {
            await repo.leadFollowups.add({ lead_id: fu.id, founder_id: me.id, note: fuNote.trim(), followup_date: fuDate || null });
            await logActivity(me.id, 'lead', fu.id, 'update', `follow-up on lead ${fu.lead_code}`);
            setFuNote(''); setFuDate(''); setFuList(await repo.leadFollowups.list(fu.id));
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };

    return <>
        <div className="row" style={{ marginBottom: 12 }}>
            <input className="search" style={{ maxWidth: 260 }} placeholder="Search leads..." value={q} onChange={e => setQ(e.target.value)} />
            <select style={{ maxWidth: 180 }} value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
            {canWrite && <button className="btn" onClick={() => setForm({ status: 'new', source: 'instagram', enquiry_date: new Date().toISOString().slice(0, 10) })}>+ Add Lead</button>}
        </div>
        {err && <div className="err">{err}</div>}
        {!rows.length && <div className="empty">No leads yet.{canWrite ? ' Click "+ Add Lead" to add the first enquiry.' : ''}</div>}
        {!!rows.length && <div className="card" style={{ padding: 6, overflowX: 'auto' }}><table>
            <thead><tr><th>ID</th><th>Student</th><th>Course</th><th>Source</th><th>Enquiry</th><th>Follow-up</th><th>Assigned</th><th>Status</th><th></th></tr></thead>
            <tbody>{shown.map(r => <tr key={r.id}>
                <td className="mut">{r.lead_code}</td>
                <td>{r.student_name}{r.contact_number ? <div className="mut small">{r.contact_number}</div> : null}</td>
                <td>{r.interested_course || '-'}</td>
                <td>{r.source ? label(r.source) : '-'}</td>
                <td className="mut">{fmtDate(r.enquiry_date)}</td>
                <td className="mut">{fmtDate(r.followup_date)}</td>
                <td>{nameOf(r.assigned_to)}</td>
                <td><span className={`pill p-${r.status === 'converted' ? 'completed' : r.status === 'not_interested' ? 'on_hold' : r.status === 'new' ? 'to_do' : 'in_progress'}`}>{label(r.status)}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => openFu(r)}>Follow-ups</button>{' '}
                    {canWrite && <><button className="btn ghost sm" onClick={() => setForm({ ...r })}>Edit</button>{' '}
                    <button className="btn danger sm" onClick={() => remove(r)}>Delete</button></>}
                </td>
            </tr>)}</tbody>
        </table></div>}
        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit Lead ${form.lead_code}` : 'Add Lead'}</h2>
            {fields.map(f => <div key={f.key}><label>{f.label}</label><FieldInput f={f} form={form} setForm={setForm} founders={founders} /></div>)}
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
        {fu && <div className="modal-bg" onClick={() => setFu(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Follow-ups - {fu.student_name} ({fu.lead_code})</h2>
            {!fuList.length && <p className="mut small" style={{ marginTop: 8 }}>No follow-ups logged yet.</p>}
            {fuList.map(x => <div key={x.id} className="note" style={{ marginTop: 8 }}>
                <div className="small"><b>{nameOf(x.founder_id)}</b> <span className="mut">- {fmtDate(x.created_at)}</span></div>
                <div className="small" style={{ marginTop: 3 }}>{x.note}</div>
                {x.followup_date && <div className="mut small" style={{ marginTop: 3 }}>Next follow-up: {fmtDate(x.followup_date)}</div>}
            </div>)}
            {canWrite && <>
                <label>Add follow-up note</label>
                <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="What happened on this contact?" />
                <label>Next follow-up date</label>
                <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} />
                <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                    <button className="btn ghost" onClick={() => setFu(null)}>Close</button>
                    <button className="btn" disabled={busy || !fuNote.trim()} onClick={addFu}>Add</button>
                </div>
            </>}
            {!canWrite && <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setFu(null)}>Close</button></div>}
        </div></div>}
    </>;
}

export function Marketing() {
    const { me, founders } = useApp();
    const [tab, setTab] = useState('Analytics');
    const [leads, setLeads] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [content, setContent] = useState<any[]>([]);
    const canWrite = me.department === 'Marketing & Students';
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';

    useEffect(() => {
        (async () => {
            try { setLeads(await repo.leads.list()); } catch {}
            try { setCampaigns(await repo.campaigns.list()); } catch {}
            try { setContent(await repo.contentCalendar.list()); } catch {}
        })();
    }, [tab]);

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 8) + '01';
    const open = leads.filter(l => !['converted', 'not_interested'].includes(l.status));
    const followupsDue = open.filter(l => l.followup_date && l.followup_date <= today);
    const demos = leads.filter(l => l.status === 'demo_scheduled');
    const converted = leads.filter(l => l.status === 'converted');
    const convRate = leads.length ? Math.round((converted.length / leads.length) * 100) : 0;
    const totalBudget = campaigns.reduce((a, c) => a + Number(c.budget || 0), 0);
    const cpl = leads.length && totalBudget ? Math.round(totalBudget / leads.length) : null;
    const newThisMonth = leads.filter(l => l.enquiry_date >= monthStart);
    const publishedThisMonth = content.filter(c => c.status === 'published' && c.publish_date >= monthStart);
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const byStatus = LEAD_STATUSES.map(s => ({ s, n: leads.filter(l => l.status === s).length }));
    const maxN = Math.max(1, ...byStatus.map(x => x.n));

    return <>
        <div className="topbar"><div><h1>Marketing Progress</h1><p>Marketing &amp; student acquisition - managed by Afvan (CMO){canWrite ? '' : ' - view only for your role'}</p></div></div>
        <div className="chips">{TABS.map(t => <button key={t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>

        {tab === 'Analytics' && <>
            <div className="grid cards4">
                <div className="card stat"><div className="lbl">Total leads</div><div className="num">{leads.length}</div><div className="trend mut">{newThisMonth.length} new this month</div></div>
                <div className="card stat"><div className="lbl">Follow-ups due</div><div className="num">{followupsDue.length}</div><div className="trend mut">open leads past/today</div></div>
                <div className="card stat"><div className="lbl">Demo scheduled</div><div className="num">{demos.length}</div><div className="trend mut">awaiting demo</div></div>
                <div className="card stat"><div className="lbl">Conversions</div><div className="num">{converted.length}</div><div className="trend mut">{convRate}% conversion rate</div></div>
            </div>
            <div className="grid cards3">
                <div className="card stat"><div className="lbl">Cost per lead</div><div className="num">{cpl != null ? fmtMoney(cpl) : '-'}</div><div className="trend mut">{fmtMoney(totalBudget)} total campaign budget</div></div>
                <div className="card stat"><div className="lbl">Active campaigns</div><div className="num">{activeCampaigns.length}</div><div className="trend mut">{campaigns.length} total</div></div>
                <div className="card stat"><div className="lbl">Content published</div><div className="num">{publishedThisMonth.length}</div><div className="trend mut">this month</div></div>
            </div>
            <div className="card"><h3 style={{ fontSize: 14, marginBottom: 10 }}>Leads by status</h3>
                {byStatus.map(x => <div key={x.s} style={{ marginBottom: 9 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}><span className="small">{label(x.s)}</span><span className="small mut">{x.n}</span></div>
                    <div className="bar"><i style={{ width: `${(x.n / maxN) * 100}%` }} /></div>
                </div>)}
                {!leads.length && <p className="mut small">No lead data yet - analytics fill in as leads are added.</p>}
            </div>
        </>}

        {tab === 'Leads' && <Leads canWrite={canWrite} nameOf={nameOf} />}

        {tab === 'Campaigns' && <CrudSection title="Campaigns" addLabel="+ New Campaign" entity="campaign" repoApi={repo.campaigns} canWrite={canWrite} nameOf={nameOf} searchKeys={['name', 'platform', 'campaign_code']}
            fields={[
                { key: 'name', label: 'Campaign name', required: true },
                { key: 'objective', label: 'Objective', type: 'textarea' },
                { key: 'platform', label: 'Platform', type: 'select', options: PLATFORMS },
                { key: 'budget', label: 'Budget (INR)', type: 'number' },
                { key: 'start_date', label: 'Start date', type: 'date' },
                { key: 'end_date', label: 'End date', type: 'date' },
                { key: 'target_audience', label: 'Target audience' },
                { key: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'completed', 'paused'] },
                { key: 'results', label: 'Campaign results', type: 'textarea' },
            ]}
            columns={[
                { key: 'campaign_code', label: 'ID', render: r => <span className="mut">{r.campaign_code}</span> },
                { key: 'name', label: 'Campaign' },
                { key: 'platform', label: 'Platform' },
                { key: 'budget', label: 'Budget', render: r => fmtMoney(r.budget) },
                { key: 'start_date', label: 'Dates', render: r => <span className="mut">{fmtDate(r.start_date)} - {fmtDate(r.end_date)}</span> },
                { key: 'status', label: 'Status', render: r => <span className={`pill p-${r.status === 'active' ? 'in_progress' : r.status === 'completed' ? 'completed' : r.status === 'paused' ? 'on_hold' : 'to_do'}`}>{label(r.status)}</span> },
            ]} />}

        {tab === 'Content Calendar' && <CrudSection title="Content Calendar" addLabel="+ New Content" entity="content" repoApi={repo.contentCalendar} canWrite={canWrite} nameOf={nameOf} searchKeys={['title', 'platform', 'content_code']}
            fields={[
                { key: 'title', label: 'Content title', required: true },
                { key: 'platform', label: 'Platform', type: 'select', options: PLATFORMS },
                { key: 'content_type', label: 'Content type', type: 'select', options: ['reel', 'post', 'story', 'video', 'blog', 'ad', 'other'] },
                { key: 'caption', label: 'Caption', type: 'textarea' },
                { key: 'assigned_to', label: 'Assigned person', type: 'founder' },
                { key: 'publish_date', label: 'Publishing date', type: 'date' },
                { key: 'status', label: 'Status', type: 'select', options: ['idea', 'draft', 'scheduled', 'published'] },
                { key: 'published_url', label: 'Published URL' },
            ]}
            columns={[
                { key: 'content_code', label: 'ID', render: r => <span className="mut">{r.content_code}</span> },
                { key: 'title', label: 'Title' },
                { key: 'platform', label: 'Platform' },
                { key: 'content_type', label: 'Type', render: r => r.content_type ? label(r.content_type) : '-' },
                { key: 'assigned_to', label: 'Assigned', render: r => nameOf(r.assigned_to) },
                { key: 'publish_date', label: 'Publish date', render: r => <span className="mut">{fmtDate(r.publish_date)}</span> },
                { key: 'status', label: 'Status', render: r => <span className={`pill p-${r.status === 'published' ? 'completed' : r.status === 'scheduled' ? 'in_progress' : r.status === 'draft' ? 'review' : 'to_do'}`}>{label(r.status)}</span> },
            ]} />}

        {tab === 'Market Research' && <CrudSection title="Market Research" addLabel="+ New Research" entity="research" repoApi={repo.research} canWrite={canWrite} nameOf={nameOf} searchKeys={['title', 'research_code']}
            fields={[
                { key: 'title', label: 'Research project', required: true },
                { key: 'kind', label: 'Type', type: 'select', options: ['research', 'survey'] },
                { key: 'target_audience', label: 'Target audience' },
                { key: 'status', label: 'Status', type: 'select', options: ['planned', 'in_progress', 'completed'] },
                { key: 'findings', label: 'Market findings', type: 'textarea' },
                { key: 'report_notes', label: 'Research report notes', type: 'textarea' },
            ]}
            columns={[
                { key: 'research_code', label: 'ID', render: r => <span className="mut">{r.research_code}</span> },
                { key: 'title', label: 'Project' },
                { key: 'kind', label: 'Type', render: r => label(r.kind) },
                { key: 'target_audience', label: 'Audience' },
                { key: 'status', label: 'Status', render: r => <span className={`pill p-${r.status === 'completed' ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'to_do'}`}>{label(r.status)}</span> },
            ]} />}

        {tab === 'Competitors' && <CrudSection title="Competitor Analysis" addLabel="+ New Competitor" entity="competitor" repoApi={repo.competitors} canWrite={canWrite} nameOf={nameOf} searchKeys={['name', 'location', 'competitor_code']}
            fields={[
                { key: 'name', label: 'Competitor name', required: true },
                { key: 'location', label: 'Location' },
                { key: 'course_categories', label: 'Course categories' },
                { key: 'pricing_notes', label: 'Pricing', type: 'textarea' },
                { key: 'marketing_strategies', label: 'Marketing strategies', type: 'textarea' },
                { key: 'strengths', label: 'Strengths', type: 'textarea' },
                { key: 'weaknesses', label: 'Weaknesses', type: 'textarea' },
                { key: 'notes', label: 'Research notes', type: 'textarea' },
            ]}
            columns={[
                { key: 'competitor_code', label: 'ID', render: r => <span className="mut">{r.competitor_code}</span> },
                { key: 'name', label: 'Competitor' },
                { key: 'location', label: 'Location' },
                { key: 'course_categories', label: 'Courses' },
                { key: 'strengths', label: 'Strengths', render: r => <span className="small">{(r.strengths || '-').slice(0, 60)}{(r.strengths || '').length > 60 ? '...' : ''}</span> },
                { key: 'weaknesses', label: 'Weaknesses', render: r => <span className="small">{(r.weaknesses || '-').slice(0, 60)}{(r.weaknesses || '').length > 60 ? '...' : ''}</span> },
            ]} />}

        {tab === 'Brand Assets' && <CrudSection title="Brand Management" addLabel="+ New Brand Asset" entity="brand asset" repoApi={repo.brandAssets} canWrite={canWrite} nameOf={nameOf} searchKeys={['title', 'asset_code']}
            fields={[
                { key: 'title', label: 'Title', required: true },
                { key: 'asset_type', label: 'Asset type', type: 'select', options: ['guideline', 'logo', 'color', 'typography', 'positioning', 'document'] },
                { key: 'details', label: 'Details (values, codes, notes)', type: 'textarea' },
            ]}
            columns={[
                { key: 'asset_code', label: 'ID', render: r => <span className="mut">{r.asset_code}</span> },
                { key: 'title', label: 'Title' },
                { key: 'asset_type', label: 'Type', render: r => <span className="pill p-shared">{label(r.asset_type)}</span> },
                { key: 'details', label: 'Details', render: r => <span className="small">{(r.details || '-').slice(0, 80)}{(r.details || '').length > 80 ? '...' : ''}</span> },
            ]} />}
    </>;
}
