import React, { useEffect, useState } from 'react';
import { dbSelect, dbInsert, dbUpdate, dbDelete, getSession } from '../lib/sb';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'bool' | 'fk';
export type Field = {
    k: string; label: string; type: FieldType; required?: boolean;
    options?: string[]; fk?: { table: string; label: string };
    hideInTable?: boolean; readonly?: boolean; hint?: string;
};
export type Entity = {
    key: string; table: string; label: string; group: string;
    fields: Field[]; order?: string; softDelete?: boolean;
    protectDelete?: (row: any) => string | null;
};

const F = (k: string, label: string, type: FieldType = 'text', extra: Partial<Field> = {}): Field => ({ k, label, type, ...extra });
const FOUNDER_FK = { table: 'founders', label: 'full_name' };
const MENTOR_FK = { table: 'mentors', label: 'full_name' };

export const ENTITIES: Entity[] = [
    // People
    { key: 'founders', table: 'founders', label: 'Founders', group: 'People', order: 'founder_code',
      protectDelete: (r) => r.founder_code === 'FDR-001' ? 'Owner founder record is protected and cannot be deleted.' : null,
      fields: [F('founder_code', 'Code', 'text', { required: true }), F('full_name', 'Full name', 'text', { required: true }), F('role_title', 'Role title', 'text', { required: true }), F('department', 'Department', 'text', { required: true }), F('email', 'Email'), F('auth_user_id', 'Auth user ID', 'text', { hint: 'UUID of the linked login (Supabase auth user). Set by the secure provisioning flow.' }), F('is_active', 'Active', 'bool')] },
    { key: 'mentors', table: 'mentors', label: 'Mentors', group: 'People', order: 'mentor_code', softDelete: true,
      fields: [F('mentor_code', 'Code', 'text', { required: true }), F('full_name', 'Full name', 'text', { required: true }), F('designation', 'Designation'), F('specialization', 'Specialization'), F('email', 'Email'), F('phone', 'Phone'), F('bio', 'Bio', 'textarea', { hideInTable: true }), F('auth_user_id', 'Auth user ID'), F('is_active', 'Active', 'bool')] },
    { key: 'admin_users', table: 'admin_users', label: 'Admin Users', group: 'People', order: 'created_at',
      protectDelete: (r) => r.auth_user_id === getSession()?.user?.id ? 'You cannot delete your own admin account while signed in.' : null,
      fields: [F('email', 'Email', 'text', { readonly: true }), F('full_name', 'Full name', 'text', { required: true }), F('auth_user_id', 'Auth user ID', 'text', { readonly: true, hint: 'New admin logins are created through the secure provisioning flow, not here.' })] },
    // Work
    { key: 'tasks', table: 'tasks', label: 'Tasks', group: 'Work', order: 'task_code', softDelete: true,
      fields: [F('task_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('status', 'Status', 'select', { options: ['backlog', 'to_do', 'in_progress', 'under_review', 'completed', 'on_hold'] }), F('priority', 'Priority', 'select', { options: ['low', 'medium', 'high', 'urgent'] }), F('progress_pct', 'Progress %', 'number'), F('department', 'Department'), F('assigned_to', 'Assigned to', 'fk', { fk: FOUNDER_FK }), F('created_by', 'Created by', 'fk', { fk: FOUNDER_FK, hideInTable: true }), F('deadline', 'Deadline', 'datetime'), F('completed_at', 'Completed at', 'datetime', { hideInTable: true }), F('description', 'Description', 'textarea', { hideInTable: true }), F('remarks', 'Remarks', 'textarea', { hideInTable: true })] },
    { key: 'documents', table: 'documents', label: 'Documents', group: 'Work', order: 'doc_code', softDelete: true,
      fields: [F('doc_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('category', 'Category', 'select', { options: ['business', 'legal', 'branding', 'finance', 'academic', 'courses', 'marketing'] }), F('status', 'Status', 'select', { options: ['not_started', 'draft', 'under_review', 'approved', 'published', 'archived'] }), F('access', 'Access', 'select', { options: ['shared', 'restricted'] }), F('responsible_founder', 'Responsible founder', 'fk', { fk: FOUNDER_FK }), F('file_name', 'File name', 'text', { readonly: true }), F('description', 'Description', 'textarea', { hideInTable: true })] },
    { key: 'weekly_reports', table: 'weekly_reports', label: 'Weekly Reports', group: 'Work', order: 'report_code',
      fields: [F('report_code', 'Code', 'text', { required: true }), F('founder_id', 'Founder', 'fk', { fk: FOUNDER_FK, required: true }), F('week_start', 'Week start', 'date', { required: true }), F('week_end', 'Week end', 'date', { required: true }), F('completed_tasks', 'Completed', 'textarea', { hideInTable: true }), F('pending_tasks', 'Pending', 'textarea', { hideInTable: true }), F('study_progress', 'Study progress', 'textarea', { hideInTable: true }), F('achievements', 'Achievements', 'textarea', { hideInTable: true }), F('challenges', 'Challenges', 'textarea', { hideInTable: true }), F('next_week_plan', 'Next week plan', 'textarea', { hideInTable: true })] },
    { key: 'meetings', table: 'meetings', label: 'Founder Meetings', group: 'Work', order: 'meeting_code', softDelete: true,
      fields: [F('meeting_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('scheduled_at', 'Scheduled at', 'datetime', { required: true }), F('mode', 'Mode', 'select', { options: ['online', 'in_person', 'phone'] }), F('status', 'Status', 'select', { options: ['scheduled', 'completed', 'cancelled'] }), F('agenda', 'Agenda', 'textarea', { hideInTable: true }), F('discussion_notes', 'Discussion notes', 'textarea', { hideInTable: true })] },
    { key: 'courses', table: 'courses', label: 'Courses', group: 'Work', order: 'course_code', softDelete: true,
      fields: [F('course_code', 'Code', 'text', { required: true }), F('name', 'Name', 'text', { required: true }), F('category', 'Category'), F('development_status', 'Status', 'select', { options: ['proposed', 'in_development', 'review', 'launched', 'on_hold'] }), F('duration', 'Duration'), F('proposed_fee', 'Proposed fee', 'number'), F('target_audience', 'Target audience', 'textarea', { hideInTable: true }), F('syllabus', 'Syllabus', 'textarea', { hideInTable: true })] },
    { key: 'course_modules', table: 'course_modules', label: 'Course Modules', group: 'Work', order: 'course_id', softDelete: true,
      fields: [F('course_id', 'Course', 'fk', { fk: { table: 'courses', label: 'name' }, required: true }), F('module_order', 'Order', 'number', { required: true }), F('title', 'Title', 'text', { required: true }), F('status', 'Status', 'select', { options: ['not_started', 'in_progress', 'done'] }), F('description', 'Description', 'textarea', { hideInTable: true }), F('learning_materials', 'Learning materials', 'textarea', { hideInTable: true }), F('practical_projects', 'Practical projects', 'textarea', { hideInTable: true })] },
    { key: 'study_items', table: 'study_items', label: 'Study Items', group: 'Work', order: 'study_code', softDelete: true,
      fields: [F('study_code', 'Code', 'text', { required: true }), F('founder_id', 'Founder', 'fk', { fk: FOUNDER_FK, required: true }), F('topic', 'Topic', 'text', { required: true }), F('category', 'Category'), F('learning_status', 'Status', 'select', { options: ['not_started', 'learning', 'completed', 'on_hold'] }), F('start_date', 'Start date', 'date'), F('target_date', 'Target date', 'date'), F('resource_link', 'Resource link'), F('visibility', 'Visibility', 'select', { options: ['individual', 'shared'] }), F('key_learnings', 'Key learnings', 'textarea', { hideInTable: true }), F('practical_applications', 'Practical applications', 'textarea', { hideInTable: true })] },
    { key: 'decisions', table: 'decisions', label: 'Decisions', group: 'Work', order: 'decision_code', softDelete: true,
      fields: [F('decision_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('decision_date', 'Decision date', 'date'), F('status', 'Status', 'select', { options: ['proposed', 'decided', 'implemented'] }), F('proposed_by', 'Proposed by', 'fk', { fk: FOUNDER_FK }), F('details', 'Details', 'textarea', { hideInTable: true })] },
    { key: 'knowledge_items', table: 'knowledge_items', label: 'Knowledge Hub', group: 'Work', order: 'item_code', softDelete: true,
      fields: [F('item_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('category', 'Category', 'select', { options: ['shared_notes', 'learning_resources', 'research_materials', 'founder_presentations', 'training_materials', 'recorded_sessions', 'shared_documents'] }), F('link', 'Link'), F('body', 'Body', 'textarea', { hideInTable: true })] },
    // Marketing
    { key: 'campaigns', table: 'campaigns', label: 'Campaigns', group: 'Marketing', order: 'campaign_code', softDelete: true,
      fields: [F('campaign_code', 'Code', 'text', { required: true }), F('name', 'Name', 'text', { required: true }), F('platform', 'Platform'), F('status', 'Status', 'select', { options: ['planned', 'active', 'completed', 'paused'] }), F('budget', 'Budget', 'number'), F('start_date', 'Start date', 'date'), F('end_date', 'End date', 'date'), F('objective', 'Objective', 'textarea', { hideInTable: true }), F('target_audience', 'Target audience', 'textarea', { hideInTable: true }), F('results', 'Results', 'textarea', { hideInTable: true })] },
    { key: 'leads', table: 'leads', label: 'Leads', group: 'Marketing', order: 'lead_code', softDelete: true,
      fields: [F('lead_code', 'Code', 'text', { required: true }), F('student_name', 'Student name', 'text', { required: true }), F('contact_number', 'Contact number'), F('interested_course', 'Interested course'), F('source', 'Source'), F('status', 'Status', 'select', { options: ['new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'not_interested'] }), F('enquiry_date', 'Enquiry date', 'date'), F('followup_date', 'Follow-up date', 'date'), F('assigned_to', 'Assigned to', 'fk', { fk: FOUNDER_FK }), F('remarks', 'Remarks', 'textarea', { hideInTable: true })] },
    { key: 'content_calendar', table: 'content_calendar', label: 'Content Calendar', group: 'Marketing', order: 'content_code', softDelete: true,
      fields: [F('content_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('platform', 'Platform'), F('content_type', 'Content type'), F('status', 'Status', 'select', { options: ['idea', 'draft', 'scheduled', 'published'] }), F('publish_date', 'Publish date', 'date'), F('assigned_to', 'Assigned to', 'fk', { fk: FOUNDER_FK }), F('published_url', 'Published URL'), F('caption', 'Caption', 'textarea', { hideInTable: true })] },
    { key: 'competitors', table: 'competitors', label: 'Competitors', group: 'Marketing', order: 'competitor_code', softDelete: true,
      fields: [F('competitor_code', 'Code', 'text', { required: true }), F('name', 'Name', 'text', { required: true }), F('location', 'Location'), F('course_categories', 'Course categories'), F('pricing_notes', 'Pricing notes', 'textarea', { hideInTable: true }), F('marketing_strategies', 'Marketing strategies', 'textarea', { hideInTable: true }), F('strengths', 'Strengths', 'textarea', { hideInTable: true }), F('weaknesses', 'Weaknesses', 'textarea', { hideInTable: true }), F('notes', 'Notes', 'textarea', { hideInTable: true })] },
    { key: 'market_research', table: 'market_research', label: 'Market Research', group: 'Marketing', order: 'research_code', softDelete: true,
      fields: [F('research_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('kind', 'Kind', 'select', { options: ['research', 'survey'] }), F('status', 'Status', 'select', { options: ['planned', 'in_progress', 'completed'] }), F('target_audience', 'Target audience', 'textarea', { hideInTable: true }), F('findings', 'Findings', 'textarea', { hideInTable: true }), F('report_notes', 'Report notes', 'textarea', { hideInTable: true })] },
    { key: 'brand_assets', table: 'brand_assets', label: 'Brand Assets', group: 'Marketing', order: 'asset_code', softDelete: true,
      fields: [F('asset_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('asset_type', 'Type', 'select', { options: ['guideline', 'logo', 'color', 'typography', 'positioning', 'document'] }), F('file_name', 'File name', 'text', { readonly: true }), F('details', 'Details', 'textarea', { hideInTable: true })] },
    // Finance
    { key: 'income', table: 'income', label: 'Income', group: 'Finance', order: 'income_code', softDelete: true,
      fields: [F('income_code', 'Code', 'text', { required: true }), F('received_on', 'Received on', 'date', { required: true }), F('category', 'Category', 'select', { options: ['course_fee', 'admission_fee', 'service', 'consulting', 'other'] }), F('amount', 'Amount', 'number', { required: true }), F('course_name', 'Course name'), F('received_from', 'Received from'), F('payment_method', 'Payment method'), F('reference_number', 'Reference'), F('logged_by', 'Logged by', 'fk', { fk: FOUNDER_FK }), F('description', 'Description', 'textarea', { hideInTable: true })] },
    { key: 'expenses', table: 'expenses', label: 'Expenses', group: 'Finance', order: 'expense_code', softDelete: true,
      fields: [F('expense_code', 'Code', 'text', { required: true }), F('spent_on', 'Spent on', 'date', { required: true }), F('category', 'Category', 'select', { options: ['travel', 'food', 'software', 'marketing', 'operations', 'other'] }), F('amount', 'Amount', 'number', { required: true }), F('payment_method', 'Payment method'), F('logged_by', 'Logged by', 'fk', { fk: FOUNDER_FK, required: true }), F('description', 'Description', 'textarea', { hideInTable: true })] },
    { key: 'budgets', table: 'budgets', label: 'Budgets', group: 'Finance', order: 'budget_code', softDelete: true,
      fields: [F('budget_code', 'Code', 'text', { required: true }), F('category', 'Category', 'text', { required: true }), F('period_month', 'Month (first day)', 'date', { required: true }), F('planned_amount', 'Planned amount', 'number', { required: true }), F('notes', 'Notes', 'textarea', { hideInTable: true })] },
    { key: 'outstanding_payments', table: 'outstanding_payments', label: 'Outstanding Payments', group: 'Finance', order: 'outstanding_code', softDelete: true,
      fields: [F('outstanding_code', 'Code', 'text', { required: true }), F('payer', 'Payer', 'text', { required: true }), F('amount_due', 'Amount due', 'number', { required: true }), F('due_date', 'Due date', 'date'), F('status', 'Status', 'select', { options: ['pending', 'partial', 'paid'] }), F('description', 'Description', 'textarea', { hideInTable: true })] },
    { key: 'founder_contributions', table: 'founder_contributions', label: 'Founder Contributions', group: 'Finance', order: 'contribution_code', softDelete: true,
      fields: [F('contribution_code', 'Code', 'text', { required: true }), F('founder_id', 'Founder', 'fk', { fk: FOUNDER_FK, required: true }), F('contribution_date', 'Date', 'date', { required: true }), F('amount', 'Amount', 'number', { required: true }), F('contribution_type', 'Type', 'select', { options: ['capital', 'loan', 'expense_cover', 'other'] }), F('reference', 'Reference'), F('remarks', 'Remarks', 'textarea', { hideInTable: true })] },
    // Mentor data
    { key: 'recommendations', table: 'recommendations', label: 'Recommendations', group: 'Mentor Data', order: 'rec_code', softDelete: true,
      fields: [F('rec_code', 'Code', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('priority', 'Priority', 'select', { options: ['low', 'medium', 'high', 'urgent'] }), F('status', 'Status', 'select', { options: ['suggested', 'under_discussion', 'accepted', 'in_progress', 'implemented', 'rejected'] }), F('department', 'Department'), F('suggested_by', 'Suggested by (mentor)', 'fk', { fk: MENTOR_FK }), F('assigned_founder', 'Assigned founder', 'fk', { fk: FOUNDER_FK }), F('description', 'Description', 'textarea', { hideInTable: true }), F('founder_response', 'Founder response', 'textarea', { hideInTable: true })] },
    { key: 'mentor_comments', table: 'mentor_comments', label: 'Mentor Comments', group: 'Mentor Data', order: 'created_at.desc',
      fields: [F('mentor_id', 'Mentor', 'fk', { fk: MENTOR_FK, required: true }), F('entity_type', 'Entity type', 'select', { options: ['task', 'report', 'document', 'milestone', 'course', 'general'] }), F('entity_id', 'Entity ID', 'text', { required: true }), F('body', 'Comment', 'textarea', { required: true }), F('created_at', 'Created', 'datetime', { readonly: true })] },
    { key: 'mentor_reviews', table: 'mentor_reviews', label: 'Doc Reviews', group: 'Mentor Data', order: 'review_code',
      fields: [F('review_code', 'Code', 'text', { required: true }), F('mentor_id', 'Mentor', 'fk', { fk: MENTOR_FK, required: true }), F('entity_type', 'Entity type', 'select', { options: ['document', 'course', 'business_area'] }), F('entity_id', 'Entity ID', 'text', { required: true }), F('status', 'Status', 'select', { options: ['pending_review', 'under_review', 'feedback_provided', 'revision_requested', 'reviewed'] }), F('comments', 'Comments', 'textarea', { hideInTable: true }), F('suggestions', 'Suggestions', 'textarea', { hideInTable: true }), F('issues', 'Issues', 'textarea', { hideInTable: true })] },
    { key: 'milestones', table: 'milestones', label: 'Milestones', group: 'Mentor Data', order: 'milestone_order',
      fields: [F('milestone_code', 'Code', 'text', { required: true }), F('name', 'Name', 'text', { required: true }), F('status', 'Status', 'select', { options: ['not_started', 'in_progress', 'completed', 'delayed', 'on_hold'] }), F('progress_pct', 'Progress %', 'number'), F('milestone_order', 'Order', 'number'), F('responsible_founder', 'Responsible founder', 'fk', { fk: FOUNDER_FK }), F('start_date', 'Start date', 'date'), F('target_date', 'Target date', 'date'), F('description', 'Description', 'textarea', { hideInTable: true })] },
    { key: 'academy_progress', table: 'academy_progress', label: 'Academy Progress', group: 'Mentor Data', order: 'area_order',
      fields: [F('area_key', 'Area key', 'text', { required: true }), F('area_group', 'Group', 'select', { options: ['dashboard', 'business'] }), F('label', 'Label', 'text', { required: true }), F('pct', 'Progress %', 'number'), F('area_order', 'Order', 'number'), F('mentor_note', 'Mentor note', 'textarea', { hideInTable: true }), F('founder_note', 'Founder note', 'textarea', { hideInTable: true })] },
    // System
    { key: 'notifications', table: 'notifications', label: 'Notifications', group: 'System', order: 'created_at.desc',
      fields: [F('founder_id', 'Recipient', 'fk', { fk: FOUNDER_FK, required: true }), F('type', 'Type', 'text', { required: true }), F('title', 'Title', 'text', { required: true }), F('body', 'Body', 'textarea', { hideInTable: true }), F('link', 'Link'), F('read', 'Read', 'bool'), F('created_at', 'Created', 'datetime', { readonly: true })] },
];

const FK_TABLES = ['founders', 'mentors', 'courses'];

function fmt(v: any, f: Field, fkMaps: Record<string, Record<string, string>>): string {
    if (v === null || v === undefined) return '';
    if (f.type === 'bool') return v ? 'Yes' : 'No';
    if (f.type === 'fk') return (f.fk && fkMaps[f.fk.table]?.[v]) || String(v).slice(0, 8);
    if (f.type === 'datetime') { try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return String(v); } }
    return String(v);
}

function toInput(v: any, f: Field): any {
    if (v === null || v === undefined) return f.type === 'bool' ? false : '';
    if (f.type === 'datetime') return String(v).slice(0, 16);
    if (f.type === 'date') return String(v).slice(0, 10);
    return v;
}

export function AdminEntity({ entity }: { entity: Entity }) {
    const [rows, setRows] = useState<any[]>([]);
    const [fkMaps, setFkMaps] = useState<Record<string, Record<string, string>>>({});
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [editing, setEditing] = useState<any | null>(null); // null = closed, {} = new, row = edit
    const [form, setForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState<any | null>(null);

    const load = async () => {
        try {
            setErr('');
            const query: any = { order: entity.order || 'created_at', limit: 500 };
            if (entity.softDelete) query.is = { deleted_at: 'null' };
            setRows(await dbSelect(entity.table, query));
            const maps: Record<string, Record<string, string>> = {};
            for (const t of FK_TABLES) {
                const labelKey = t === 'courses' ? 'name' : 'full_name';
                const rs = await dbSelect(t, { select: `id,${labelKey}`, limit: 200 });
                maps[t] = Object.fromEntries(rs.map((r: any) => [r.id, r[labelKey]]));
            }
            setFkMaps(maps);
        } catch (e: any) { setErr(e.message); }
    };
    useEffect(() => { load(); }, [entity.key]);

    const tableFields = entity.fields.filter(f => !f.hideInTable).slice(0, 5);
    const filtered = rows.filter(r => !q || tableFields.some(f => fmt(r[f.k], f, fkMaps).toLowerCase().includes(q.toLowerCase())));

    const openNew = () => { const init: any = {}; entity.fields.forEach(f => { init[f.k] = f.type === 'bool' ? false : ''; }); setForm(init); setEditing({}); };
    const openEdit = (r: any) => { const init: any = {}; entity.fields.forEach(f => { init[f.k] = toInput(r[f.k], f); }); setForm(init); setEditing(r); };

    const save = async () => {
        setSaving(true); setErr('');
        try {
            const payload: any = {};
            for (const f of entity.fields) {
                if (f.readonly) continue;
                let v = form[f.k];
                if (f.type === 'bool') { payload[f.k] = !!v; continue; }
                if (v === '' || v === undefined || v === null) { if (!editing?.id && f.required) throw new Error(`${f.label} is required`); payload[f.k] = null; continue; }
                if (f.type === 'number') v = Number(v);
                if (f.type === 'datetime') v = new Date(v).toISOString();
                payload[f.k] = v;
            }
            if (editing?.id) await dbUpdate(entity.table, editing.id, payload);
            else await dbInsert(entity.table, payload);
            setEditing(null); await load();
        } catch (e: any) { setErr(e.message); }
        setSaving(false);
    };

    const doDelete = async () => {
        if (!confirmDel) return;
        setSaving(true); setErr('');
        try { await dbDelete(entity.table, confirmDel.id); setConfirmDel(null); await load(); }
        catch (e: any) { setErr(e.message); setConfirmDel(null); }
        setSaving(false);
    };

    return <div>
        <div className="topbar">
            <div><h1>{entity.label}</h1><p>{rows.length} record{rows.length === 1 ? '' : 's'} - full admin access (add / edit / delete)</p></div>
            <button className="btn" onClick={openNew}>+ Add {entity.label.replace(/s$/, '')}</button>
        </div>
        {err && <div className="card" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>{err}</div>}
        <input className="search" placeholder={`Search ${entity.label.toLowerCase()}...`} value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12, maxWidth: 320 }} />
        <div className="card" style={{ overflowX: 'auto' }}>
            <table>
                <thead><tr>{tableFields.map(f => <th key={f.k}>{f.label}</th>)}<th>Actions</th></tr></thead>
                <tbody>
                    {filtered.map(r => <tr key={r.id}>
                        {tableFields.map(f => <td key={f.k}>{fmt(r[f.k], f, fkMaps)}</td>)}
                        <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn ghost sm" onClick={() => openEdit(r)}>Edit</button>{' '}
                            {entity.protectDelete?.(r)
                                ? <span className="pill p-restricted" title={entity.protectDelete(r)!}>Protected</span>
                                : <button className="btn danger sm" onClick={() => setConfirmDel(r)}>Delete</button>}
                        </td>
                    </tr>)}
                    {!filtered.length && <tr><td colSpan={tableFields.length + 1} className="mut">No records</td></tr>}
                </tbody>
            </table>
        </div>

        {editing && <div className="modal-bg" onClick={() => setEditing(null)}>
            <div className="card modal" style={{ maxWidth: 640, width: '100%', maxHeight: '86vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginBottom: 8 }}>{editing.id ? 'Edit' : 'Add'} {entity.label.replace(/s$/, '')}</h3>
                {entity.fields.map(f => <div key={f.k}>
                    <label>{f.label}{f.required ? ' *' : ''}</label>
                    {f.readonly ? <input value={editing[f.k] ?? ''} disabled />
                        : f.type === 'textarea' ? <textarea value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />
                        : f.type === 'select' ? <select value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })}>
                            <option value="">-</option>{f.options!.map(o => <option key={o} value={o}>{o}</option>)}</select>
                        : f.type === 'bool' ? <select value={form[f.k] ? 'yes' : 'no'} onChange={e => setForm({ ...form, [f.k]: e.target.value === 'yes' })}>
                            <option value="yes">Yes</option><option value="no">No</option></select>
                        : f.type === 'fk' ? <select value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })}>
                            <option value="">-</option>{Object.entries(fkMaps[f.fk!.table] || {}).map(([id, lbl]) => <option key={id} value={id}>{lbl}</option>)}</select>
                        : <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : 'text'}
                            step={f.type === 'number' ? 'any' : undefined} value={form[f.k] ?? ''} onChange={e => setForm({ ...form, [f.k]: e.target.value })} />}
                    {f.hint && <div className="mut" style={{ fontSize: 11, marginTop: 3 }}>{f.hint}</div>}
                </div>)}
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button className="btn" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button>
                    <button className="btn ghost" onClick={() => setEditing(null)}>Cancel</button>
                </div>
            </div>
        </div>}

        {confirmDel && <div className="modal-bg" onClick={() => setConfirmDel(null)}>
            <div className="card modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <h3>Delete this record?</h3>
                <p className="mut" style={{ margin: '10px 0 16px' }}>
                    {fmt(confirmDel[entity.fields[0].k], entity.fields[0], fkMaps)} {fmt(confirmDel[entity.fields[1]?.k], entity.fields[1], fkMaps)} - this is permanent and cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn danger" disabled={saving} onClick={doDelete}>{saving ? 'Deleting...' : 'Delete permanently'}</button>
                    <button className="btn ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
                </div>
            </div>
        </div>}
    </div>;
}

export function AdminHome() {
    const [counts, setCounts] = useState<Record<string, number>>({});
    useEffect(() => {
        (async () => {
            const out: Record<string, number> = {};
            for (const e of ENTITIES) {
                try {
                    const q: any = { select: 'id', limit: 1000 };
                    if (e.softDelete) q.is = { deleted_at: 'null' };
                    out[e.key] = (await dbSelect(e.table, q)).length;
                } catch { out[e.key] = -1; }
            }
            setCounts(out);
        })();
    }, []);
    const groups = [...new Set(ENTITIES.map(e => e.group))];
    return <div>
        <div className="topbar"><div><h1>Admin Panel</h1><p>Full control over every workspace record. Add, edit or delete anything from the sections on the left.</p></div></div>
        {groups.map(g => <div key={g} className="card">
            <h3 style={{ marginBottom: 10 }}>{g}</h3>
            <div className="grid cards4">
                {ENTITIES.filter(e => e.group === g).map(e => <div key={e.key} className="stat">
                    <div className="lbl">{e.label}</div>
                    <div className="num">{counts[e.key] === undefined ? '...' : counts[e.key] < 0 ? '!' : counts[e.key]}</div>
                </div>)}
            </div>
        </div>)}
        <div className="card">
            <h3>Safety rails</h3>
            <p className="mut" style={{ marginTop: 8, lineHeight: 1.7 }}>
                The owner founder record (FDR-001, Afvan) and your own admin account are protected from deletion, and the last remaining admin account can never be removed - enforced in the database, not just the UI.
                New login accounts (founders, mentors, extra admins) are created through the secure provisioning flow, never with passwords in chat.
            </p>
        </div>
    </div>;
}
