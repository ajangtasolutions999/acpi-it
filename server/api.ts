import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  db,
  generateNextFormNumber,
  generateNextTicketNumber,
  generateNextAssetNumber,
  addAuditLog,
  createNotification
} from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'acpi_super_secret_jwt_key_2026';

export const apiRouter = Router();

// ==========================================
// AUTH MIDDLEWARE & TYPES
// ==========================================
export interface AuthUser {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  username: string;
  department: string;
  job_title: string;
  role_id: string;
  role_name: string;
  status: string;
  permissions: string[];
}

export function getUserWithPermissions(userId: string): AuthUser | null {
  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) return null;

  const perms = db.prepare(`
    SELECT permission_id FROM role_permissions WHERE role_id = ?
  `).all(user.role_id) as { permission_id: string }[];

  return {
    id: user.id,
    employee_id: user.employee_id,
    full_name: user.full_name,
    email: user.email,
    username: user.username,
    department: user.department,
    job_title: user.job_title,
    role_id: user.role_id,
    role_name: user.role_name,
    status: user.status,
    permissions: perms.map(p => p.permission_id)
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = getUserWithPermissions(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account has been deactivated. Please contact System Administrator.' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function requirePermission(permissionId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser;
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });
    if (!user.permissions.includes(permissionId)) {
      return res.status(403).json({ error: `Permission denied: action requires permission [${permissionId}].` });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE username = ? OR email = ?
  `).get(username.trim().toLowerCase(), username.trim().toLowerCase()) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account deactivated. Contact System Administrator.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    addAuditLog(user.id, user.full_name, 'LOGIN_FAILED', 'Auth', user.id, null, null, 'Incorrect password entered', req.ip);
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const fullUser = getUserWithPermissions(user.id);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

  addAuditLog(user.id, user.full_name, 'LOGIN_SUCCESS', 'Auth', user.id, null, null, 'User authenticated successfully', req.ip);

  res.json({ token, user: fullUser });
});

apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  res.json({ user });
});

apiRouter.post('/auth/logout', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  addAuditLog(user.id, user.full_name, 'LOGOUT', 'Auth', user.id, null, null, 'User logged out', req.ip);
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/reset-password', requireAuth, (req: Request, res: Response) => {
  const currentUser = (req as any).user as AuthUser;
  const { targetUserId, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const userIdToChange = targetUserId || currentUser.id;
  if (userIdToChange !== currentUser.id && !currentUser.permissions.includes('perm_manage_users')) {
    return res.status(403).json({ error: 'You do not have permission to reset passwords for other users.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userIdToChange);

  addAuditLog(currentUser.id, currentUser.full_name, 'PASSWORD_RESET', 'Users', userIdToChange, null, null, 'Password successfully reset', req.ip);

  res.json({ success: true, message: 'Password updated successfully.' });
});

// Quick switch user endpoint for instant testing in demo environment
apiRouter.post('/auth/switch-demo-user', (req: Request, res: Response) => {
  const { username } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) return res.status(404).json({ error: 'Demo user not found.' });

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const fullUser = getUserWithPermissions(user.id);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

  res.json({ token, user: fullUser });
});

// ==========================================
// 2. DASHBOARD STATS & ANALYTICS
// ==========================================
apiRouter.get('/dashboard/stats', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const isIT = user.permissions.includes('perm_view_all_tickets');
  const isManagerOrAbove = ['role_manager', 'role_gm', 'role_vp', 'role_headit', 'role_admin'].includes(user.role_id);

  // Tickets
  let totalOpenTickets = 0;
  let inProgressTickets = 0;
  let pendingTickets = 0;
  let solvedTickets = 0;
  let closedTickets = 0;

  if (isIT) {
    totalOpenTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open'").get() as any).count;
    inProgressTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress'").get() as any).count;
    pendingTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Pending'").get() as any).count;
    solvedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Solved'").get() as any).count;
    closedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed'").get() as any).count;
  } else {
    totalOpenTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Open' AND requester_id = ?").get(user.id) as any).count;
    inProgressTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'In Progress' AND requester_id = ?").get(user.id) as any).count;
    pendingTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Pending' AND requester_id = ?").get(user.id) as any).count;
    solvedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Solved' AND requester_id = ?").get(user.id) as any).count;
    closedTickets = (db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'Closed' AND requester_id = ?").get(user.id) as any).count;
  }

  // Pending Approvals
  let pendingApprovalsCount = 0;
  if (isManagerOrAbove) {
    // approvals needed for current role
    pendingApprovalsCount = (db.prepare(`
      SELECT COUNT(*) as count FROM form_submissions 
      WHERE status = 'Pending Approval' AND current_approver_role = ?
    `).get(user.role_name) as any).count;
  }

  // Recent Requests submitted by user or company
  let myRequestsCount = (db.prepare("SELECT COUNT(*) as count FROM form_submissions WHERE requester_id = ?").get(user.id) as any).count;
  let totalAssetsCount = (db.prepare("SELECT COUNT(*) as count FROM assets").get() as any).count;
  let totalSopsCount = (db.prepare("SELECT COUNT(*) as count FROM sop_documents WHERE status = 'published'").get() as any).count;

  // Recent tickets
  const recentTicketsQuery = isIT
    ? db.prepare("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 5").all()
    : db.prepare("SELECT * FROM tickets WHERE requester_id = ? ORDER BY created_at DESC LIMIT 5").all(user.id);

  // Recent forms
  const recentFormsQuery = isIT || isManagerOrAbove
    ? db.prepare("SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT 5").all()
    : db.prepare("SELECT * FROM form_submissions WHERE requester_id = ? ORDER BY created_at DESC LIMIT 5").all(user.id);

  // Category distribution for charts
  const ticketCategoryStats = db.prepare(`
    SELECT category, COUNT(*) as count FROM tickets GROUP BY category
  `).all();

  const ticketStatusStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM tickets GROUP BY status
  `).all();

  const assetCategoryStats = db.prepare(`
    SELECT category, COUNT(*) as count FROM assets GROUP BY category
  `).all();

  const assetDeptStats = db.prepare(`
    SELECT department, COUNT(*) as count FROM assets WHERE department IS NOT NULL GROUP BY department
  `).all();

  res.json({
    summary: {
      openTickets: totalOpenTickets,
      inProgressTickets,
      pendingTickets,
      solvedTickets,
      closedTickets,
      pendingApprovals: pendingApprovalsCount,
      myRequests: myRequestsCount,
      totalAssets: totalAssetsCount,
      totalSops: totalSopsCount
    },
    recentTickets: recentTicketsQuery,
    recentForms: recentFormsQuery,
    charts: {
      ticketCategories: ticketCategoryStats,
      ticketStatuses: ticketStatusStats,
      assetCategories: assetCategoryStats,
      assetDepartments: assetDeptStats
    }
  });
});

// ==========================================
// 3. SOP & IT POLICY REPOSITORY
// ==========================================
apiRouter.get('/sops', requireAuth, (req: Request, res: Response) => {
  const { category, search, status } = req.query;
  let query = 'SELECT * FROM sop_documents WHERE 1=1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  } else {
    query += " AND status = 'published'";
  }
  if (search) {
    query += ' AND (title LIKE ? OR document_number LIKE ? OR description LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const docs = db.prepare(query).all(...params);
  res.json({ sops: docs });
});

apiRouter.get('/sops/:id', requireAuth, (req: Request, res: Response) => {
  const doc = db.prepare('SELECT * FROM sop_documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const versions = db.prepare('SELECT * FROM sop_document_versions WHERE document_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ sop: doc, versions });
});

apiRouter.post('/sops', requireAuth, requirePermission('perm_manage_sops'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { title, document_number, category, department, description, version, effective_date, review_date, content_body, status } = req.body;

  if (!title || !document_number || !category || !department) {
    return res.status(400).json({ error: 'Title, document number, category, and department are required.' });
  }

  const id = 'sop_' + Math.random().toString(36).substring(2, 10);
  const docId = 'DOC-SOP-' + Math.floor(100 + Math.random() * 900);

  try {
    db.prepare(`
      INSERT INTO sop_documents (id, document_id, title, document_number, category, department, description, version, effective_date, review_date, content_body, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, docId, title, document_number, category, department, description || '', version || 'v1.0', effective_date || new Date().toISOString().split('T')[0], review_date || null, content_body || '', status || 'published', user.id);

    // Save initial version
    db.prepare(`
      INSERT INTO sop_document_versions (id, document_id, version, title, description, content_body, change_summary, effective_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ver_' + Math.random().toString(36).substring(2, 9), id, version || 'v1.0', title, description || '', content_body || '', 'Initial document publication', effective_date, user.id);

    addAuditLog(user.id, user.full_name, 'CREATE_SOP', 'SOPs', id, null, title, 'Published new SOP document', req.ip);

    res.json({ success: true, id, message: 'SOP published successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Error creating SOP document.' });
  }
});

apiRouter.put('/sops/:id', requireAuth, requirePermission('perm_manage_sops'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { title, category, department, description, version, effective_date, review_date, content_body, status, change_summary } = req.body;

  const current = db.prepare('SELECT * FROM sop_documents WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Document not found.' });

  db.prepare(`
    UPDATE sop_documents
    SET title = ?, category = ?, department = ?, description = ?, version = ?, effective_date = ?, review_date = ?, content_body = ?, status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, category, department, description, version, effective_date, review_date, content_body, status, user.id, req.params.id);

  // If version changed or content updated, save version snapshot
  if (change_summary || version !== current.version) {
    db.prepare(`
      INSERT INTO sop_document_versions (id, document_id, version, title, description, content_body, change_summary, effective_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ver_' + Math.random().toString(36).substring(2, 9), req.params.id, version, title, description, content_body, change_summary || 'Revised version update', effective_date, user.id);
  }

  addAuditLog(user.id, user.full_name, 'UPDATE_SOP', 'SOPs', req.params.id, current.version, version, change_summary || 'SOP updated', req.ip);

  res.json({ success: true, message: 'SOP updated successfully.' });
});

// ==========================================
// 4. FORMS & TEMPLATES
// ==========================================
apiRouter.get('/forms/categories', requireAuth, (req: Request, res: Response) => {
  const cats = db.prepare('SELECT * FROM form_categories WHERE is_active = 1 ORDER BY name ASC').all();
  res.json({ categories: cats });
});

apiRouter.get('/forms/templates', requireAuth, (req: Request, res: Response) => {
  const tmpls = db.prepare(`
    SELECT ft.*, fc.name as category_name, sd.title as linked_sop_title, sd.document_number as linked_sop_number
    FROM form_templates ft
    JOIN form_categories fc ON ft.category_id = fc.id
    LEFT JOIN sop_documents sd ON ft.linked_sop_id = sd.id
    WHERE ft.is_active = 1
    ORDER BY ft.name ASC
  `).all();

  const formatted = tmpls.map((t: any) => ({
    ...t,
    fields: JSON.parse(t.fields_json || '[]')
  }));

  res.json({ templates: formatted });
});

apiRouter.post('/forms/templates', requireAuth, requirePermission('perm_manage_templates'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { name, category_id, code, description, fields, ticket_category_on_approval, generate_ticket, requires_approval, approval_levels, linked_sop_id } = req.body;

  if (!name || !category_id || !code || !fields) {
    return res.status(400).json({ error: 'Name, category, code, and fields are required.' });
  }

  const id = 'tmpl_' + Math.random().toString(36).substring(2, 10);
  try {
    db.prepare(`
      INSERT INTO form_templates (id, name, category_id, code, description, fields_json, ticket_category_on_approval, generate_ticket, requires_approval, approval_levels, linked_sop_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category_id, code, description || '', JSON.stringify(fields), ticket_category_on_approval || 'Request', generate_ticket ? 1 : 0, requires_approval ? 1 : 0, approval_levels || 1, linked_sop_id || null, user.id);

    addAuditLog(user.id, user.full_name, 'CREATE_FORM_TEMPLATE', 'Forms', id, null, name, 'Created dynamic form template', req.ip);

    res.json({ success: true, id, message: 'Form template created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error creating form template.' });
  }
});

// ==========================================
// 5. FORM SUBMISSIONS & APPROVAL WORKFLOW
// ==========================================
apiRouter.get('/forms/submissions', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { status, filter } = req.query;

  let query = 'SELECT * FROM form_submissions WHERE 1=1';
  const params: any[] = [];

  // Filter types: 'mine' (My Requests), 'need_my_approval', or default based on role
  if (filter === 'mine') {
    query += ' AND requester_id = ?';
    params.push(user.id);
  } else if (filter === 'need_my_approval') {
    query += " AND status = 'Pending Approval' AND current_approver_role = ?";
    params.push(user.role_name);
  } else if (!user.permissions.includes('perm_view_all_tickets') && !['role_manager', 'role_gm', 'role_vp', 'role_headit', 'role_admin'].includes(user.role_id)) {
    // Regular staff can only see their own submissions
    query += ' AND requester_id = ?';
    params.push(user.id);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';
  const submissions = db.prepare(query).all(...params);

  const formatted = submissions.map((s: any) => ({
    ...s,
    data: JSON.parse(s.data_json || '{}')
  }));

  res.json({ submissions: formatted });
});

apiRouter.get('/forms/submissions/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const sub = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(req.params.id) as any;
  if (!sub) return res.status(404).json({ error: 'Form submission not found.' });

  // Security check: regular staff cannot view other staff submissions
  const isPrivileged = ['role_manager', 'role_gm', 'role_vp', 'role_itstaff', 'role_headit', 'role_admin'].includes(user.role_id);
  if (!isPrivileged && sub.requester_id !== user.id) {
    return res.status(403).json({ error: 'Access denied to this form submission.' });
  }

  const approvalHistory = db.prepare('SELECT * FROM approval_records WHERE submission_id = ? ORDER BY created_at ASC').all(req.params.id);
  const template = db.prepare('SELECT * FROM form_templates WHERE id = ?').get(sub.template_id) as any;

  res.json({
    submission: {
      ...sub,
      data: JSON.parse(sub.data_json || '{}')
    },
    template: template ? { ...template, fields: JSON.parse(template.fields_json || '[]') } : null,
    approvalHistory
  });
});

apiRouter.post('/forms/submissions', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { template_id, formData, isDraft } = req.body;

  if (!template_id || !formData) {
    return res.status(400).json({ error: 'Template ID and form data are required.' });
  }

  const template = db.prepare('SELECT * FROM form_templates WHERE id = ?').get(template_id) as any;
  if (!template) return res.status(404).json({ error: 'Form template not found.' });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Generate Reference Number
  // Requirements: ACPI-HR-IT-FormType-Year-Month-Number (start at 000, 3 digits, expands to 4 if >= 1000)
  const refNumber = generateNextFormNumber(template.code, year, month);
  const subId = 'sub_' + Math.random().toString(36).substring(2, 10);

  const status = isDraft ? 'Draft' : (template.requires_approval ? 'Pending Approval' : 'Approved');
  const currentApproverRole = template.requires_approval ? (template.approval_levels > 1 ? 'Manager' : 'Manager') : null;

  db.prepare(`
    INSERT INTO form_submissions (
      id, reference_number, template_id, template_name, category_name, requester_id, requester_name, requester_email, department, data_json, status, current_approval_level, total_approval_levels, current_approver_role, linked_sop_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    subId,
    refNumber,
    template.id,
    template.name,
    template.code,
    user.id,
    user.full_name,
    user.email,
    user.department,
    JSON.stringify(formData),
    status,
    1,
    template.approval_levels || 1,
    currentApproverRole,
    template.linked_sop_id || null
  );

  addAuditLog(user.id, user.full_name, 'SUBMIT_FORM', 'Forms', subId, null, refNumber, `Submitted form ${template.name}`, req.ip);

  // Notify Approvers
  if (status === 'Pending Approval') {
    // Notify managers in the department
    const managers = db.prepare(`
      SELECT u.id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Manager' OR r.name = 'General Manager'
    `).all() as { id: string }[];

    managers.forEach(m => {
      createNotification(m.id, 'New Approval Required', `Form ${refNumber} (${template.name}) from ${user.full_name} is awaiting your approval.`, 'approval', `/approvals`);
    });
  }

  res.json({
    success: true,
    id: subId,
    reference_number: refNumber,
    status,
    message: isDraft ? 'Form saved as draft.' : `Form successfully submitted with Document Reference: ${refNumber}`
  });
});

// Approve, Reject or Return for Revision
apiRouter.post('/forms/submissions/:id/review', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { decision, comments } = req.body; // 'Approved' | 'Rejected' | 'Returned for Revision'

  if (!['Approved', 'Rejected', 'Returned for Revision'].includes(decision)) {
    return res.status(400).json({ error: 'Valid decision is Approved, Rejected, or Returned for Revision.' });
  }

  if ((decision === 'Rejected' || decision === 'Returned for Revision') && (!comments || comments.trim().length === 0)) {
    return res.status(400).json({ error: 'Rejection or return for revision requires a mandatory reason in comments.' });
  }

  const sub = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(req.params.id) as any;
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });

  if (sub.status !== 'Pending Approval') {
    return res.status(400).json({ error: `Cannot review submission in status ${sub.status}.` });
  }

  // Prevent self-approval (Section 9: Requester must not approve their own request)
  if (sub.requester_id === user.id) {
    return res.status(403).json({ error: 'Self-approval is strictly prohibited by company policy.' });
  }

  // Check if user has approval authority
  const hasApprovePerm = user.permissions.includes('perm_approve_requests');
  if (!hasApprovePerm) {
    return res.status(403).json({ error: 'You do not have approval authority.' });
  }

  const template = db.prepare('SELECT * FROM form_templates WHERE id = ?').get(sub.template_id) as any;
  const currentLevel = sub.current_approval_level;
  const totalLevels = sub.total_approval_levels;

  // Record approval action
  const aprId = 'apr_' + Math.random().toString(36).substring(2, 10);
  db.prepare(`
    INSERT INTO approval_records (id, submission_id, level, approver_id, approver_name, approver_role, decision, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(aprId, sub.id, currentLevel, user.id, user.full_name, user.role_name, decision, comments || '');

  let newStatus = sub.status;
  let nextApproverRole = sub.current_approver_role;
  let nextLevel = currentLevel;
  let autoCreatedTicketId: string | null = null;
  let autoCreatedTicketNumber: string | null = null;

  if (decision === 'Rejected') {
    newStatus = 'Rejected';
    nextApproverRole = null;
    createNotification(sub.requester_id, 'Form Request Rejected', `Your form ${sub.reference_number} was rejected by ${user.full_name}. Reason: ${comments}`, 'approval', `/forms/${sub.id}`);
  } else if (decision === 'Returned for Revision') {
    newStatus = 'Returned for Revision';
    nextApproverRole = null;
    createNotification(sub.requester_id, 'Form Returned for Revision', `Your form ${sub.reference_number} was returned by ${user.full_name}. Please revise and resubmit.`, 'approval', `/forms/${sub.id}`);
  } else if (decision === 'Approved') {
    if (currentLevel < totalLevels) {
      // Advance to level 2 (Vice President / General Manager / Head of IT)
      nextLevel = currentLevel + 1;
      nextApproverRole = totalLevels === 2 ? 'Vice President' : 'General Manager';
      newStatus = 'Pending Approval';
      createNotification(sub.requester_id, 'Form Advanced to Next Approval', `Your form ${sub.reference_number} was endorsed by ${user.full_name} and advanced to Level ${nextLevel} (${nextApproverRole}).`, 'approval', `/forms/${sub.id}`);
    } else {
      // Final approval reached!
      newStatus = 'Approved';
      nextApproverRole = null;

      // Section 10: Automatic Ticket Creation from Approved Requests
      if (template && template.generate_ticket) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        autoCreatedTicketNumber = generateNextTicketNumber(year, month);
        autoCreatedTicketId = 'tkt_' + Math.random().toString(36).substring(2, 10);

        const ticketCategory = template.ticket_category_on_approval || 'Request';
        const formData = JSON.parse(sub.data_json || '{}');
        const descSummary = Object.entries(formData)
          .map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`)
          .join('\n');

        // Check if there are procurement specific fields
        const isProcure = ticketCategory === 'New Procurement';

        db.prepare(`
          INSERT INTO tickets (
            id, ticket_number, category, subject, description, requester_id, requester_name, requester_department, location, priority, status, related_form_id, related_form_ref, procurement_item_description, procurement_quantity, procurement_unit_price, procurement_total_cost, procurement_justification, procurement_required_date, procurement_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          autoCreatedTicketId,
          autoCreatedTicketNumber,
          ticketCategory,
          `[AUTO] ${template.name} - ${sub.reference_number}`,
          `Auto-generated from approved form submission ${sub.reference_number} (Requester: ${sub.requester_name}).\n\nSubmitted Form Details:\n${descSummary}`,
          sub.requester_id,
          sub.requester_name,
          sub.department,
          formData.working_location || formData.location || 'ACPI Plant',
          'Normal',
          sub.id,
          sub.reference_number,
          isProcure ? (formData.item_description || template.name) : null,
          isProcure ? Number(formData.quantity || 1) : null,
          isProcure ? Number(formData.estimated_unit_price || 0) : null,
          isProcure ? (Number(formData.quantity || 1) * Number(formData.estimated_unit_price || 0)) : null,
          isProcure ? (formData.business_justification || '') : null,
          isProcure ? (formData.required_date || null) : null,
          isProcure ? 'Awaiting IT & Procurement Sourcing' : null
        );

        addAuditLog(user.id, user.full_name, 'AUTO_CREATE_TICKET', 'Tickets', autoCreatedTicketId, null, autoCreatedTicketNumber, `Automatically created ticket from approved form ${sub.reference_number}`, req.ip);

        // Notify IT Team
        const itTeam = db.prepare("SELECT id FROM users WHERE role_id IN ('role_itstaff', 'role_headit')").all() as { id: string }[];
        itTeam.forEach(it => {
          createNotification(it.id, 'New Approved Ticket Generated', `Ticket ${autoCreatedTicketNumber} generated from approved request ${sub.reference_number}.`, 'ticket', `/tickets/${autoCreatedTicketId}`);
        });
      }

      createNotification(sub.requester_id, 'Form Request Approved', `Your request ${sub.reference_number} has been fully approved! ${autoCreatedTicketNumber ? `Ticket ${autoCreatedTicketNumber} has been created.` : ''}`, 'approval', `/forms/${sub.id}`);
    }
  }

  // Update submission status
  db.prepare(`
    UPDATE form_submissions
    SET status = ?, current_approval_level = ?, current_approver_role = ?, ticket_id = COALESCE(?, ticket_id), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newStatus, nextLevel, nextApproverRole, autoCreatedTicketId, sub.id);

  addAuditLog(user.id, user.full_name, 'REVIEW_FORM', 'Forms', sub.id, sub.status, newStatus, `Decision: ${decision}. ${comments || ''}`, req.ip);

  res.json({
    success: true,
    decision,
    newStatus,
    ticketNumber: autoCreatedTicketNumber,
    message: `Form review submitted successfully (${decision}).`
  });
});

// ==========================================
// 6. IT ASSET MANAGEMENT
// ==========================================
apiRouter.get('/assets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { search, category, status, department, location } = req.query;

  let query = 'SELECT * FROM assets WHERE 1=1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (department) {
    query += ' AND department = ?';
    params.push(department);
  }
  if (location) {
    query += ' AND location = ?';
    params.push(location);
  }
  if (search) {
    query += ' AND (asset_id LIKE ? OR item_name LIKE ? OR brand LIKE ? OR model LIKE ? OR serial_number LIKE ? OR assigned_to_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const assets = db.prepare(query).all(...params) as any[];

  // Hide sensitive financial purchase prices for non-IT and non-Admin users (Section 11)
  const canSeePrices = ['role_itstaff', 'role_headit', 'role_admin', 'role_manager', 'role_gm', 'role_vp'].includes(user.role_id);
  const sanitized = assets.map(a => {
    if (!canSeePrices) {
      return { ...a, purchase_price: null };
    }
    return a;
  });

  res.json({ assets: sanitized });
});

apiRouter.get('/assets/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id) as any;
  if (!asset) return res.status(404).json({ error: 'Asset not found.' });

  const history = db.prepare('SELECT * FROM asset_history WHERE asset_id = ? ORDER BY created_at DESC').all(req.params.id);
  const maintenance = db.prepare('SELECT * FROM asset_maintenance WHERE asset_id = ? ORDER BY start_date DESC').all(req.params.id);

  const canSeePrices = ['role_itstaff', 'role_headit', 'role_admin', 'role_manager', 'role_gm', 'role_vp'].includes(user.role_id);
  if (!canSeePrices) {
    asset.purchase_price = null;
  }

  res.json({ asset, history, maintenance });
});

apiRouter.post('/assets', requireAuth, requirePermission('perm_manage_assets'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const {
    item_name, category, brand, model, serial_number, vendor_name, vendor_contact, purchase_date, purchase_price, location, assigned_to_id, assigned_to_name, assigned_employee_id, department, status, warranty_start_date, warranty_end_date, contract_end_date, remarks
  } = req.body;

  if (!item_name || !category || !brand || !location) {
    return res.status(400).json({ error: 'Item name, category, brand, and location are required.' });
  }

  const now = new Date();
  const year = now.getFullYear();
  const assetIdTag = generateNextAssetNumber(year);
  const id = 'ast_' + Math.random().toString(36).substring(2, 10);

  try {
    db.prepare(`
      INSERT INTO assets (
        id, asset_id, item_name, category, brand, model, serial_number, vendor_name, vendor_contact, purchase_date, purchase_price, location, assigned_to_id, assigned_to_name, assigned_employee_id, department, status, warranty_start_date, warranty_end_date, contract_end_date, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, assetIdTag, item_name, category, brand, model || '', serial_number || '', vendor_name || '', vendor_contact || '', purchase_date || null, Number(purchase_price || 0), location, assigned_to_id || null, assigned_to_name || null, assigned_employee_id || null, department || null, status || 'In Stock', warranty_start_date || null, warranty_end_date || null, contract_end_date || null, remarks || '', user.id
    );

    // Initial asset history
    db.prepare(`
      INSERT INTO asset_history (id, asset_id, action, new_user, new_department, new_location, new_status, notes, actor_id, actor_name)
      VALUES (?, ?, 'Registered', ?, ?, ?, ?, 'Initial asset onboarding', ?, ?)
    `).run('ash_' + Math.random().toString(36).substring(2, 9), id, assigned_to_name || 'None', department || 'None', location, status || 'In Stock', user.id, user.full_name);

    addAuditLog(user.id, user.full_name, 'CREATE_ASSET', 'Assets', id, null, assetIdTag, `Registered asset ${item_name} (${assetIdTag})`, req.ip);

    res.json({ success: true, id, asset_id: assetIdTag, message: 'Asset created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error creating asset.' });
  }
});

apiRouter.put('/assets/:id', requireAuth, requirePermission('perm_manage_assets'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const current = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Asset not found.' });

  const {
    item_name, category, brand, model, serial_number, vendor_name, vendor_contact, purchase_date, purchase_price, location, assigned_to_id, assigned_to_name, assigned_employee_id, department, status, warranty_start_date, warranty_end_date, contract_end_date, remarks, transfer_reason
  } = req.body;

  // Track changes for asset history
  const isTransferred = current.assigned_to_name !== assigned_to_name || current.department !== department || current.location !== location;
  const isStatusChanged = current.status !== status;

  if (isTransferred || isStatusChanged) {
    db.prepare(`
      INSERT INTO asset_history (
        id, asset_id, action, previous_user, new_user, previous_department, new_department, previous_location, new_location, previous_status, new_status, notes, actor_id, actor_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ash_' + Math.random().toString(36).substring(2, 9),
      current.id,
      isTransferred ? 'Transferred' : 'Status Changed',
      current.assigned_to_name,
      assigned_to_name,
      current.department,
      department,
      current.location,
      location,
      current.status,
      status,
      transfer_reason || remarks || 'Asset update',
      user.id,
      user.full_name
    );
  }

  db.prepare(`
    UPDATE assets SET
      item_name = ?, category = ?, brand = ?, model = ?, serial_number = ?, vendor_name = ?, vendor_contact = ?, purchase_date = ?, purchase_price = ?, location = ?, assigned_to_id = ?, assigned_to_name = ?, assigned_employee_id = ?, department = ?, status = ?, warranty_start_date = ?, warranty_end_date = ?, contract_end_date = ?, remarks = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    item_name, category, brand, model, serial_number, vendor_name, vendor_contact, purchase_date, Number(purchase_price ?? current.purchase_price), location, assigned_to_id || null, assigned_to_name || null, assigned_employee_id || null, department || null, status, warranty_start_date, warranty_end_date, contract_end_date, remarks, user.id, current.id
  );

  addAuditLog(user.id, user.full_name, 'UPDATE_ASSET', 'Assets', current.id, current.status, status, `Updated asset ${current.asset_id}`, req.ip);

  res.json({ success: true, message: 'Asset updated successfully.' });
});

apiRouter.delete('/assets/:id', requireAuth, requirePermission('perm_delete_records'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const current = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'Asset not found.' });

  db.prepare('DELETE FROM asset_history WHERE asset_id = ?').run(req.params.id);
  db.prepare('DELETE FROM asset_maintenance WHERE asset_id = ?').run(req.params.id);
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);

  addAuditLog(user.id, user.full_name, 'DELETE_ASSET', 'Assets', req.params.id, current.asset_id, null, 'Deleted asset record (SysAdmin authorized)', req.ip);

  res.json({ success: true, message: 'Asset record deleted.' });
});

// ==========================================
// 7. IT TICKETING SYSTEM
// ==========================================
apiRouter.get('/tickets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { category, status, priority, assigned_to, search, filter } = req.query;

  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params: any[] = [];

  const canViewAll = user.permissions.includes('perm_view_all_tickets');

  if (filter === 'mine' || !canViewAll) {
    query += ' AND requester_id = ?';
    params.push(user.id);
  } else if (filter === 'assigned_me') {
    query += ' AND assigned_to_id = ?';
    params.push(user.id);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }
  if (assigned_to) {
    query += ' AND assigned_to_id = ?';
    params.push(assigned_to);
  }
  if (search) {
    query += ' AND (ticket_number LIKE ? OR subject LIKE ? OR description LIKE ? OR requester_name LIKE ? OR related_form_ref LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY created_at DESC';
  const tickets = db.prepare(query).all(...params);
  res.json({ tickets });
});

apiRouter.get('/tickets/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const isIT = user.permissions.includes('perm_view_all_tickets') || ['role_itstaff', 'role_headit', 'role_admin'].includes(user.role_id);
  if (!isIT && ticket.requester_id !== user.id) {
    return res.status(403).json({ error: 'Access denied to this ticket.' });
  }

  // Comments: internal IT work notes must never be visible to end users! (Section 14)
  let commentsQuery = 'SELECT * FROM ticket_comments WHERE ticket_id = ?';
  if (!isIT) {
    commentsQuery += ' AND is_internal = 0';
  }
  commentsQuery += ' ORDER BY created_at ASC';
  const comments = db.prepare(commentsQuery).all(ticket.id);

  const statusHistory = db.prepare('SELECT * FROM ticket_status_history WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);

  res.json({ ticket, comments, statusHistory });
});

apiRouter.post('/tickets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { category, subject, description, location, priority, related_asset_id, procurement_item, procurement_qty, procurement_price, procurement_justification, procurement_date } = req.body;

  if (!category || !subject || !description) {
    return res.status(400).json({ error: 'Category, subject, and description are required.' });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const ticketNumber = generateNextTicketNumber(year, month);
  const ticketId = 'tkt_' + Math.random().toString(36).substring(2, 10);

  let assetName = null;
  if (related_asset_id) {
    const asset = db.prepare('SELECT item_name, asset_id FROM assets WHERE id = ?').get(related_asset_id) as any;
    if (asset) assetName = `${asset.item_name} (${asset.asset_id})`;
  }

  const isProcure = category === 'New Procurement';

  db.prepare(`
    INSERT INTO tickets (
      id, ticket_number, category, subject, description, requester_id, requester_name, requester_department, location, priority, status, related_asset_id, related_asset_name, procurement_item_description, procurement_quantity, procurement_unit_price, procurement_total_cost, procurement_justification, procurement_required_date, procurement_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketId,
    ticketNumber,
    category,
    subject,
    description,
    user.id,
    user.full_name,
    user.department,
    location || 'Plant',
    priority || 'Normal',
    related_asset_id || null,
    assetName,
    isProcure ? (procurement_item || subject) : null,
    isProcure ? Number(procurement_qty || 1) : null,
    isProcure ? Number(procurement_price || 0) : null,
    isProcure ? (Number(procurement_qty || 1) * Number(procurement_price || 0)) : null,
    isProcure ? procurement_justification : null,
    isProcure ? procurement_date : null,
    isProcure ? 'New Procurement Initiated' : null
  );

  // Initial status history
  db.prepare(`
    INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, actor_id, actor_name, actor_role, reason)
    VALUES (?, ?, 'None', 'Open', ?, ?, ?, 'Ticket created by user')
  `).run('tsh_' + Math.random().toString(36).substring(2, 9), ticketId, user.id, user.full_name, user.role_name);

  addAuditLog(user.id, user.full_name, 'CREATE_TICKET', 'Tickets', ticketId, null, ticketNumber, `Created ticket ${subject}`, req.ip);

  // Notify IT Team
  const itUsers = db.prepare("SELECT id FROM users WHERE role_id IN ('role_itstaff', 'role_headit')").all() as { id: string }[];
  itUsers.forEach(it => {
    createNotification(it.id, 'New Ticket Raised', `Ticket ${ticketNumber}: ${subject} raised by ${user.full_name}`, 'ticket', `/tickets/${ticketId}`);
  });

  res.json({ success: true, id: ticketId, ticket_number: ticketNumber, message: 'Ticket created successfully.' });
});

apiRouter.post('/tickets/:id/comments', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { comment, is_internal } = req.body;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const isIT = ['role_itstaff', 'role_headit', 'role_admin'].includes(user.role_id);
  const internalFlag = isIT && Boolean(is_internal) ? 1 : 0;

  const cmtId = 'cmt_' + Math.random().toString(36).substring(2, 10);
  db.prepare(`
    INSERT INTO ticket_comments (id, ticket_id, user_id, user_name, user_role, comment, is_internal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cmtId, ticket.id, user.id, user.full_name, user.role_name, comment, internalFlag);

  // Notify ticket requester or assigned IT staff if comment is public
  if (!internalFlag) {
    if (user.id === ticket.requester_id && ticket.assigned_to_id) {
      createNotification(ticket.assigned_to_id, 'New Comment on Ticket', `${user.full_name} commented on ticket ${ticket.ticket_number}`, 'ticket', `/tickets/${ticket.id}`);
    } else if (user.id !== ticket.requester_id) {
      createNotification(ticket.requester_id, 'IT Update on Your Ticket', `${user.full_name} commented on ticket ${ticket.ticket_number}`, 'ticket', `/tickets/${ticket.id}`);
    }
  }

  res.json({ success: true, id: cmtId, message: 'Comment added.' });
});

apiRouter.patch('/tickets/:id/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { status: targetStatus, reason, resolution_summary, assigned_to_id } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const oldStatus = ticket.status;

  // Verification of role constraints according to Section 13:
  // - End users cannot change official status directly (can only follow-up or add comment)
  // - IT Staff can update status to Open, In Progress, Pending, Solved.
  // - Head of IT (or SysAdmin authorized) is required to Close or Re-Open tickets!
  const isHeadOfIT = user.role_id === 'role_headit' || user.permissions.includes('perm_close_tickets') || user.permissions.includes('perm_reopen_tickets');
  const isITStaff = user.permissions.includes('perm_update_ticket_status');

  if (!isITStaff && !isHeadOfIT) {
    return res.status(403).json({ error: 'You do not have permission to update ticket status.' });
  }

  // Reopen check
  const isReopen = (oldStatus === 'Solved' || oldStatus === 'Closed') && (targetStatus === 'Open' || targetStatus === 'In Progress');
  if (isReopen && !isHeadOfIT) {
    return res.status(403).json({ error: 'Only the Head of IT is authorized to Re-Open solved or closed tickets.' });
  }

  // Close check
  if (targetStatus === 'Closed' && !isHeadOfIT) {
    return res.status(403).json({ error: 'Only the Head of IT is authorized to formally Close tickets.' });
  }

  // Validate reason for Reopen
  if (isReopen && (!reason || reason.trim().length === 0)) {
    return res.status(400).json({ error: 'Reopening a ticket requires a documented reason.' });
  }

  let assignedName = ticket.assigned_to_name;
  let assignedId = ticket.assigned_to_id;
  if (assigned_to_id && assigned_to_id !== ticket.assigned_to_id) {
    const assignee = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(assigned_to_id) as any;
    if (assignee) {
      assignedId = assignee.id;
      assignedName = assignee.full_name;
    }
  }

  let closedById = ticket.closed_by_id;
  let closedByName = ticket.closed_by_name;
  let closedAt = ticket.closed_at;

  if (targetStatus === 'Closed') {
    closedById = user.id;
    closedByName = user.full_name;
    closedAt = new Date().toISOString();
  }

  let reopenedById = ticket.reopened_by_id;
  let reopenedByName = ticket.reopened_by_name;
  let reopenedAt = ticket.reopened_at;
  let reopenReason = ticket.reopen_reason;

  if (isReopen) {
    reopenedById = user.id;
    reopenedByName = user.full_name;
    reopenedAt = new Date().toISOString();
    reopenReason = reason;
  }

  db.prepare(`
    UPDATE tickets SET
      status = ?,
      assigned_to_id = ?,
      assigned_to_name = ?,
      resolution_summary = COALESCE(?, resolution_summary),
      closed_by_id = ?,
      closed_by_name = ?,
      closed_at = ?,
      reopened_by_id = ?,
      reopened_by_name = ?,
      reopened_at = ?,
      reopen_reason = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    targetStatus,
    assignedId,
    assignedName,
    resolution_summary || null,
    closedById,
    closedByName,
    closedAt,
    reopenedById,
    reopenedByName,
    reopenedAt,
    reopenReason,
    ticket.id
  );

  // Record status history
  db.prepare(`
    INSERT INTO ticket_status_history (id, ticket_id, from_status, to_status, actor_id, actor_name, actor_role, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'tsh_' + Math.random().toString(36).substring(2, 9),
    ticket.id,
    oldStatus,
    targetStatus,
    user.id,
    user.full_name,
    user.role_name,
    reason || resolution_summary || `Status changed from ${oldStatus} to ${targetStatus}`
  );

  addAuditLog(user.id, user.full_name, isReopen ? 'REOPEN_TICKET' : targetStatus === 'Closed' ? 'CLOSE_TICKET' : 'UPDATE_TICKET_STATUS', 'Tickets', ticket.id, oldStatus, targetStatus, reason || resolution_summary || '', req.ip);

  // Notification to requester
  createNotification(ticket.requester_id, `Ticket ${ticket.ticket_number} Status Updated`, `Ticket status changed to: ${targetStatus}.`, 'ticket', `/tickets/${ticket.id}`);

  res.json({ success: true, message: `Ticket status updated to ${targetStatus}.` });
});

apiRouter.delete('/tickets/:id', requireAuth, requirePermission('perm_delete_records'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  db.prepare('DELETE FROM ticket_comments WHERE ticket_id = ?').run(req.params.id);
  db.prepare('DELETE FROM ticket_status_history WHERE ticket_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);

  addAuditLog(user.id, user.full_name, 'DELETE_TICKET', 'Tickets', req.params.id, ticket.ticket_number, null, 'Deleted ticket history (System Admin authorized)', req.ip);

  res.json({ success: true, message: 'Ticket record permanently deleted.' });
});

// ==========================================
// 8. NOTIFICATIONS
// ==========================================
apiRouter.get('/notifications', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(user.id);
  const unreadCount = (db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as any).count;
  res.json({ notifications: notifs, unreadCount });
});

apiRouter.patch('/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, user.id);
  res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(user.id);
  res.json({ success: true });
});

// ==========================================
// 9. AUDIT LOGS
// ==========================================
apiRouter.get('/audit-logs', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const isPrivileged = ['role_admin', 'role_headit', 'role_gm', 'role_vp'].includes(user.role_id);
  if (!isPrivileged) {
    return res.status(403).json({ error: 'Audit logs can only be inspected by authorized administrators and executives.' });
  }

  const { module, actor, search, limit } = req.query;
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (module) {
    query += ' AND module = ?';
    params.push(module);
  }
  if (actor) {
    query += ' AND actor_name LIKE ?';
    params.push(`%${actor}%`);
  }
  if (search) {
    query += ' AND (action LIKE ? OR reason LIKE ? OR previous_value LIKE ? OR new_value LIKE ? OR record_id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit) || 100);

  const logs = db.prepare(query).all(...params);
  res.json({ logs });
});

// ==========================================
// 10. ADMINISTRATION & SETTINGS
// ==========================================
apiRouter.get('/admin/users', requireAuth, requirePermission('perm_manage_users'), (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.employee_id, u.full_name, u.email, u.username, u.department, u.job_title, u.role_id, r.name as role_name, u.status, u.reporting_manager, u.last_login, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ users });
});

apiRouter.post('/admin/users', requireAuth, requirePermission('perm_manage_users'), (req: Request, res: Response) => {
  const adminUser = (req as any).user as AuthUser;
  const { employee_id, full_name, email, username, password, department, job_title, role_id, reporting_manager } = req.body;

  if (!employee_id || !full_name || !email || !username || !password || !role_id) {
    return res.status(400).json({ error: 'All primary user fields including password are required.' });
  }

  const id = 'usr_' + Math.random().toString(36).substring(2, 9);
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    db.prepare(`
      INSERT INTO users (id, employee_id, full_name, email, username, password_hash, department, job_title, role_id, status, reporting_manager)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(id, employee_id, full_name, email.toLowerCase(), username.toLowerCase(), passwordHash, department, job_title, role_id, reporting_manager || null);

    addAuditLog(adminUser.id, adminUser.full_name, 'CREATE_USER', 'Users', id, null, full_name, `Created user account for ${full_name}`, req.ip);

    res.json({ success: true, id, message: 'User created successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error creating user.' });
  }
});

apiRouter.put('/admin/users/:id', requireAuth, requirePermission('perm_manage_users'), (req: Request, res: Response) => {
  const adminUser = (req as any).user as AuthUser;
  const { full_name, department, job_title, role_id, status, reporting_manager } = req.body;

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'User not found.' });

  db.prepare(`
    UPDATE users SET
      full_name = ?, department = ?, job_title = ?, role_id = ?, status = ?, reporting_manager = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(full_name, department, job_title, role_id, status, reporting_manager || null, req.params.id);

  addAuditLog(adminUser.id, adminUser.full_name, 'UPDATE_USER', 'Users', req.params.id, current.role_id, role_id, `Updated profile for ${current.username}`, req.ip);

  res.json({ success: true, message: 'User profile updated.' });
});

apiRouter.patch('/admin/users/:id/toggle-status', requireAuth, requirePermission('perm_manage_users'), (req: Request, res: Response) => {
  const adminUser = (req as any).user as AuthUser;
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!current) return res.status(404).json({ error: 'User not found.' });

  const nextStatus = current.status === 'active' ? 'deactivated' : 'active';
  db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextStatus, req.params.id);

  addAuditLog(adminUser.id, adminUser.full_name, 'TOGGLE_USER_STATUS', 'Users', req.params.id, current.status, nextStatus, `Account status changed to ${nextStatus}`, req.ip);

  res.json({ success: true, status: nextStatus, message: `User status changed to ${nextStatus}.` });
});

// Roles and dynamic permissions matrix
apiRouter.get('/admin/roles-matrix', requireAuth, requirePermission('perm_manage_settings'), (req: Request, res: Response) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY id ASC').all();
  const permissions = db.prepare('SELECT * FROM permissions ORDER BY module ASC, action ASC').all();
  const rolePerms = db.prepare('SELECT * FROM role_permissions').all();

  res.json({ roles, permissions, rolePermissions: rolePerms });
});

apiRouter.put('/admin/roles-matrix', requireAuth, requirePermission('perm_manage_settings'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { role_id, permission_ids } = req.body;

  if (!role_id || !Array.isArray(permission_ids)) {
    return res.status(400).json({ error: 'Role ID and permission_ids array are required.' });
  }

  const updateTx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role_id);
    const insert = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    permission_ids.forEach((pId: string) => {
      insert.run(role_id, pId);
    });
  });

  updateTx();
  addAuditLog(user.id, user.full_name, 'UPDATE_ROLE_PERMISSIONS', 'Admin', role_id, null, `${permission_ids.length} permissions`, 'Updated role permissions matrix', req.ip);

  res.json({ success: true, message: 'Permissions matrix updated successfully.' });
});

apiRouter.get('/admin/settings', requireAuth, (req: Request, res: Response) => {
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const sequences = db.prepare('SELECT * FROM number_sequences').all();
  res.json({ settings, sequences });
});

apiRouter.put('/admin/settings', requireAuth, requirePermission('perm_manage_settings'), (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  const { settings } = req.body;

  if (!Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array required.' });
  }

  const updateSetting = db.prepare('UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?');
  settings.forEach((s: { key: string, value: string }) => {
    updateSetting.run(s.value, s.key);
  });

  addAuditLog(user.id, user.full_name, 'UPDATE_SYSTEM_SETTINGS', 'Admin', 'settings', null, null, 'Updated system settings', req.ip);
  res.json({ success: true, message: 'System settings updated.' });
});

// Database Backup (JSON Export) and Restore (Section 19: Backup & Restoration)
apiRouter.get('/admin/backup', requireAuth, requirePermission('perm_manage_settings'), (req: Request, res: Response) => {
  const backup = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    departments: db.prepare('SELECT * FROM departments').all(),
    roles: db.prepare('SELECT * FROM roles').all(),
    role_permissions: db.prepare('SELECT * FROM role_permissions').all(),
    users: db.prepare('SELECT id, employee_id, full_name, email, username, department, job_title, role_id, status, reporting_manager, created_at FROM users').all(),
    sop_documents: db.prepare('SELECT * FROM sop_documents').all(),
    form_templates: db.prepare('SELECT * FROM form_templates').all(),
    form_submissions: db.prepare('SELECT * FROM form_submissions').all(),
    approval_records: db.prepare('SELECT * FROM approval_records').all(),
    assets: db.prepare('SELECT * FROM assets').all(),
    tickets: db.prepare('SELECT * FROM tickets').all(),
    system_settings: db.prepare('SELECT * FROM system_settings').all(),
    number_sequences: db.prepare('SELECT * FROM number_sequences').all()
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ACPI_Backup_${new Date().toISOString().split('T')[0]}.json"`);
  res.json(backup);
});
