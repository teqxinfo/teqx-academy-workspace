import { dbSelect, dbInsert, dbUpdate, dbDelete, dbUpsert, getSession } from './sb';

export type Founder = { id: string; founder_code: string; full_name: string; role_title: string; department: string; email: string | null; auth_user_id: string | null; is_active: boolean };

export async function loadFounders(): Promise<Founder[]> {
    return dbSelect<Founder>('founders', { order: 'founder_code' });
}


export async function myFounder(): Promise<Founder | null> {
    const s = getSession();
    if (!s?.user?.id) return null;
    const rows = await dbSelect<Founder>('founders', { eq: { auth_user_id: s.user.id }, limit: 1 });
    return rows[0] || null;
}

export type AdminUser = { id: string; auth_user_id: string; email: string | null; full_name: string };

export async function myAdmin(): Promise<AdminUser | null> {
    const s = getSession();
    if (!s?.user?.id) return null;
    const rows = await dbSelect<AdminUser>('admin_users', { eq: { auth_user_id: s.user.id }, limit: 1 });
    return rows[0] || null;
}

export async function logActivity(founderId: string | undefined, entityType: string, entityId: string | undefined, action: string, summary: string, meta: any = {}) {
    try { await dbInsert('activity_log', { actor_id: founderId || null, entity_type: entityType, entity_id: entityId || null, action, summary, meta }); } catch {}
}

async function nextCode(table: string, col: string, prefix: string): Promise<string> {
    const rows = await dbSelect<any>(table, { select: col, order: `${col}.desc`, limit: 1 });
    const last: string = rows[0]?.[col] || '';
    const n = parseInt(last.replace(/\D/g, ''), 10) || 0;
    return `${prefix}-${String(n + 1).padStart(4, '0')}`;
}

export const repo = {
    tasks: {
        list: () => dbSelect('tasks', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('tasks', { ...r, task_code: await nextCode('tasks', 'task_code', 'TSK') }),
        update: (id: string, p: any) => dbUpdate('tasks', id, p),
        remove: (id: string) => dbUpdate('tasks', id, { deleted_at: new Date().toISOString() }),
    },
    taskUpdates: {
        list: (taskId: string) => dbSelect('task_updates', { eq: { task_id: taskId }, order: 'created_at.desc' }),
        add: (r: any) => dbInsert('task_updates', r),
    },
    study: {
        list: () => dbSelect('study_items', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('study_items', { ...r, study_code: await nextCode('study_items', 'study_code', 'STD') }),
        update: (id: string, p: any) => dbUpdate('study_items', id, p),
        remove: (id: string) => dbUpdate('study_items', id, { deleted_at: new Date().toISOString() }),
    },
    documents: {
        list: () => dbSelect('documents', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('documents', { ...r, doc_code: await nextCode('documents', 'doc_code', 'DOC') }),
        update: (id: string, p: any) => dbUpdate('documents', id, p),
        remove: (id: string) => dbUpdate('documents', id, { deleted_at: new Date().toISOString() }),
    },
    courses: {
        list: () => dbSelect('courses', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('courses', { ...r, course_code: await nextCode('courses', 'course_code', 'CRS') }),
        update: (id: string, p: any) => dbUpdate('courses', id, p),
        remove: (id: string) => dbUpdate('courses', id, { deleted_at: new Date().toISOString() }),
    },
    courseModules: {
        list: (courseId: string) => dbSelect('course_modules', { eq: { course_id: courseId }, is: { deleted_at: 'null' }, order: 'module_order' }),
        create: (r: any) => dbInsert('course_modules', r),
        update: (id: string, p: any) => dbUpdate('course_modules', id, p),
        remove: (id: string) => dbUpdate('course_modules', id, { deleted_at: new Date().toISOString() }),
    },
    reports: {
        list: () => dbSelect('weekly_reports', { order: 'week_start.desc' }),
        create: async (r: any) => dbInsert('weekly_reports', { ...r, report_code: await nextCode('weekly_reports', 'report_code', 'RPT') }),
        update: (id: string, p: any) => dbUpdate('weekly_reports', id, p),
        remove: (id: string) => dbDelete('weekly_reports', id),
    },
    reportComments: {
        list: (reportId: string) => dbSelect('report_comments', { eq: { report_id: reportId }, order: 'created_at.asc' }),
        add: (r: any) => dbInsert('report_comments', r),
        remove: (id: string) => dbDelete('report_comments', id),
    },
    decisions: {
        list: () => dbSelect('decisions', { is: { deleted_at: 'null' }, order: 'decision_date.desc' }),
        create: async (r: any) => dbInsert('decisions', { ...r, decision_code: await nextCode('decisions', 'decision_code', 'DCN') }),
        update: (id: string, p: any) => dbUpdate('decisions', id, p),
        remove: (id: string) => dbUpdate('decisions', id, { deleted_at: new Date().toISOString() }),
    },
    expenses: {
        list: () => dbSelect('expenses', { is: { deleted_at: 'null' }, order: 'spent_on.desc' }),
        create: async (r: any) => dbInsert('expenses', { ...r, expense_code: await nextCode('expenses', 'expense_code', 'EXP') }),
        update: (id: string, p: any) => dbUpdate('expenses', id, p),
        remove: (id: string) => dbUpdate('expenses', id, { deleted_at: new Date().toISOString() }),
    },
    research: {
        list: () => dbSelect('market_research', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('market_research', { ...r, research_code: await nextCode('market_research', 'research_code', 'MRR') }),
        update: (id: string, p: any) => dbUpdate('market_research', id, p),
        remove: (id: string) => dbUpdate('market_research', id, { deleted_at: new Date().toISOString() }),
    },
    competitors: {
        list: () => dbSelect('competitors', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('competitors', { ...r, competitor_code: await nextCode('competitors', 'competitor_code', 'CPT') }),
        update: (id: string, p: any) => dbUpdate('competitors', id, p),
        remove: (id: string) => dbUpdate('competitors', id, { deleted_at: new Date().toISOString() }),
    },
    brandAssets: {
        list: () => dbSelect('brand_assets', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('brand_assets', { ...r, asset_code: await nextCode('brand_assets', 'asset_code', 'BRD') }),
        update: (id: string, p: any) => dbUpdate('brand_assets', id, p),
        remove: (id: string) => dbUpdate('brand_assets', id, { deleted_at: new Date().toISOString() }),
    },
    contentCalendar: {
        list: () => dbSelect('content_calendar', { is: { deleted_at: 'null' }, order: 'publish_date.asc' }),
        create: async (r: any) => dbInsert('content_calendar', { ...r, content_code: await nextCode('content_calendar', 'content_code', 'CNT') }),
        update: (id: string, p: any) => dbUpdate('content_calendar', id, p),
        remove: (id: string) => dbUpdate('content_calendar', id, { deleted_at: new Date().toISOString() }),
    },
    campaigns: {
        list: () => dbSelect('campaigns', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('campaigns', { ...r, campaign_code: await nextCode('campaigns', 'campaign_code', 'CAM') }),
        update: (id: string, p: any) => dbUpdate('campaigns', id, p),
        remove: (id: string) => dbUpdate('campaigns', id, { deleted_at: new Date().toISOString() }),
    },
    leads: {
        list: () => dbSelect('leads', { is: { deleted_at: 'null' }, order: 'enquiry_date.desc' }),
        create: async (r: any) => dbInsert('leads', { ...r, lead_code: await nextCode('leads', 'lead_code', 'LED') }),
        update: (id: string, p: any) => dbUpdate('leads', id, p),
        remove: (id: string) => dbUpdate('leads', id, { deleted_at: new Date().toISOString() }),
    },
    leadFollowups: {
        list: (leadId: string) => dbSelect('lead_followups', { eq: { lead_id: leadId }, order: 'created_at.desc' }),
        add: (r: any) => dbInsert('lead_followups', r),
    },
    income: {
        list: () => dbSelect('income', { is: { deleted_at: 'null' }, order: 'received_on.desc' }),
        create: async (r: any) => dbInsert('income', { ...r, income_code: await nextCode('income', 'income_code', 'INC') }),
        update: (id: string, p: any) => dbUpdate('income', id, p),
        remove: (id: string) => dbUpdate('income', id, { deleted_at: new Date().toISOString() }),
    },
    budgets: {
        list: () => dbSelect('budgets', { is: { deleted_at: 'null' }, order: 'period_month.desc' }),
        create: async (r: any) => dbInsert('budgets', { ...r, budget_code: await nextCode('budgets', 'budget_code', 'BDG') }),
        update: (id: string, p: any) => dbUpdate('budgets', id, p),
        remove: (id: string) => dbUpdate('budgets', id, { deleted_at: new Date().toISOString() }),
    },
    contributions: {
        list: () => dbSelect('founder_contributions', { is: { deleted_at: 'null' }, order: 'contribution_date.desc' }),
        create: async (r: any) => dbInsert('founder_contributions', { ...r, contribution_code: await nextCode('founder_contributions', 'contribution_code', 'CTB') }),
        update: (id: string, p: any) => dbUpdate('founder_contributions', id, p),
        remove: (id: string) => dbUpdate('founder_contributions', id, { deleted_at: new Date().toISOString() }),
    },
    outstanding: {
        list: () => dbSelect('outstanding_payments', { is: { deleted_at: 'null' }, order: 'due_date.asc' }),
        create: async (r: any) => dbInsert('outstanding_payments', { ...r, outstanding_code: await nextCode('outstanding_payments', 'outstanding_code', 'OST') }),
        update: (id: string, p: any) => dbUpdate('outstanding_payments', id, p),
        remove: (id: string) => dbUpdate('outstanding_payments', id, { deleted_at: new Date().toISOString() }),
    },
    txEdits: {
        list: (limit = 50) => dbSelect('transaction_edits', { order: 'created_at.desc', limit }),
    },
    meetings: {
        list: () => dbSelect('meetings', { is: { deleted_at: 'null' }, order: 'scheduled_at.desc' }),
        create: async (r: any) => dbInsert('meetings', { ...r, meeting_code: await nextCode('meetings', 'meeting_code', 'MTG') }),
        update: (id: string, p: any) => dbUpdate('meetings', id, p),
        remove: (id: string) => dbUpdate('meetings', id, { deleted_at: new Date().toISOString() }),
    },
    actionItems: {
        list: (meetingId: string) => dbSelect('meeting_action_items', { eq: { meeting_id: meetingId }, order: 'created_at.asc' }),
        add: (r: any) => dbInsert('meeting_action_items', r),
        update: (id: string, p: any) => dbUpdate('meeting_action_items', id, p),
        remove: (id: string) => dbDelete('meeting_action_items', id),
    },
    acks: {
        list: () => dbSelect('decision_acknowledgements', {}),
        add: (decisionId: string, founderId: string) => dbInsert('decision_acknowledgements', { decision_id: decisionId, founder_id: founderId }),
        remove: async (decisionId: string, founderId: string) => {
            const rows: any[] = await dbSelect('decision_acknowledgements', { eq: { decision_id: decisionId, founder_id: founderId }, limit: 1 });
            if (rows[0]) await dbDelete('decision_acknowledgements', rows[0].id);
        },
    },
    knowledge: {
        list: () => dbSelect('knowledge_items', { is: { deleted_at: 'null' }, order: 'created_at.desc' }),
        create: async (r: any) => dbInsert('knowledge_items', { ...r, item_code: await nextCode('knowledge_items', 'item_code', 'KNW') }),
        update: (id: string, p: any) => dbUpdate('knowledge_items', id, p),
        remove: (id: string) => dbUpdate('knowledge_items', id, { deleted_at: new Date().toISOString() }),
    },
    kComments: {
        list: (itemId: string) => dbSelect('knowledge_comments', { eq: { item_id: itemId }, order: 'created_at.asc' }),
        add: (r: any) => dbInsert('knowledge_comments', r),
        remove: (id: string) => dbDelete('knowledge_comments', id),
    },
    kSessions: {
        list: () => dbSelect('knowledge_sessions', { is: { deleted_at: 'null' }, order: 'month.desc' }),
        create: async (r: any) => dbInsert('knowledge_sessions', { ...r, session_code: await nextCode('knowledge_sessions', 'session_code', 'KNS') }),
        update: (id: string, p: any) => dbUpdate('knowledge_sessions', id, p),
        remove: (id: string) => dbUpdate('knowledge_sessions', id, { deleted_at: new Date().toISOString() }),
    },
    notifications: {
        list: () => dbSelect('notifications', { order: 'created_at.desc', limit: 100 }),
        markRead: (id: string) => dbUpdate('notifications', id, { read: true }),
        markAllRead: async () => {
            const rows: any[] = await dbSelect('notifications', { eq: { read: 'false' }, select: 'id', limit: 200 });
            for (const r of rows) await dbUpdate('notifications', r.id, { read: true });
        },
        remove: (id: string) => dbDelete('notifications', id),
    },
    activity: {
        list: (limit = 12) => dbSelect('activity_log', { order: 'created_at.desc', limit }),
    },
    settings: {
        all: () => dbSelect('app_settings', {}),
        set: (key: string, value: any, founderId?: string) =>
            dbUpsert('app_settings', { key, value, updated_by: founderId || null, updated_at: new Date().toISOString() }, 'key'),
    },
};

export const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
export const fmtMoney = (n?: number | null) => n == null ? '-' : `₹${Number(n).toLocaleString('en-IN')}`;
export const initials = (name: string) => name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
