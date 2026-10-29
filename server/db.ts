import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'acpi.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for performance & concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Departments
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      head_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Roles
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_system INTEGER DEFAULT 0
    );

    -- Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT
    );

    -- Role Permissions Matrix
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      role_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'deactivated'
      reporting_manager TEXT,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SOP and IT Policy Documents
    CREATE TABLE IF NOT EXISTS sop_documents (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      document_number TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT 'v1.0',
      effective_date TEXT NOT NULL,
      review_date TEXT,
      expiration_date TEXT,
      file_name TEXT,
      content_body TEXT,
      status TEXT NOT NULL DEFAULT 'published', -- 'published' | 'draft' | 'archived' | 'superseded'
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SOP Document Versions
    CREATE TABLE IF NOT EXISTS sop_document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content_body TEXT,
      change_summary TEXT,
      effective_date TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Form Categories
    CREATE TABLE IF NOT EXISTS form_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- Form Templates
    CREATE TABLE IF NOT EXISTS form_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      fields_json TEXT NOT NULL, -- JSON definition of fields
      version TEXT DEFAULT 'v1.0',
      is_active INTEGER DEFAULT 1,
      ticket_category_on_approval TEXT DEFAULT 'Request', -- 'Request' | 'Incident' | 'New Procurement' | 'None'
      generate_ticket INTEGER DEFAULT 1,
      requires_approval INTEGER DEFAULT 1,
      approval_levels INTEGER DEFAULT 1,
      linked_sop_id TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Form Submissions
    CREATE TABLE IF NOT EXISTS form_submissions (
      id TEXT PRIMARY KEY,
      reference_number TEXT NOT NULL UNIQUE,
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      category_name TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_email TEXT NOT NULL,
      department TEXT NOT NULL,
      data_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending Approval', -- 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Returned for Revision' | 'Cancelled'
      current_approval_level INTEGER DEFAULT 1,
      total_approval_levels INTEGER DEFAULT 1,
      current_approver_role TEXT,
      linked_sop_id TEXT,
      ticket_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Approval Records / History
    CREATE TABLE IF NOT EXISTS approval_records (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      approver_id TEXT NOT NULL,
      approver_name TEXT NOT NULL,
      approver_role TEXT NOT NULL,
      decision TEXT NOT NULL, -- 'Approved' | 'Rejected' | 'Returned for Revision'
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- IT Assets
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL UNIQUE,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_number TEXT,
      vendor_name TEXT,
      vendor_contact TEXT,
      purchase_date TEXT,
      purchase_price REAL DEFAULT 0,
      location TEXT NOT NULL,
      assigned_to_id TEXT,
      assigned_to_name TEXT,
      assigned_employee_id TEXT,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'In Stock', -- 'In Stock' | 'Assigned' | 'In Maintenance' | 'Under Warranty Claim' | 'Returned' | 'Retired' | 'Disposed'
      warranty_start_date TEXT,
      warranty_end_date TEXT,
      contract_end_date TEXT,
      remarks TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Asset Assignment & Transfer History
    CREATE TABLE IF NOT EXISTS asset_history (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'Assigned' | 'Transferred' | 'Returned' | 'Status Changed' | 'Maintenance'
      previous_user TEXT,
      new_user TEXT,
      previous_department TEXT,
      new_department TEXT,
      previous_location TEXT,
      new_location TEXT,
      previous_status TEXT,
      new_status TEXT,
      notes TEXT,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Asset Maintenance Records
    CREATE TABLE IF NOT EXISTS asset_maintenance (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      maintenance_type TEXT NOT NULL,
      cost REAL DEFAULT 0,
      service_provider TEXT,
      start_date TEXT NOT NULL,
      completion_date TEXT,
      status TEXT NOT NULL DEFAULT 'Completed',
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tickets
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL, -- 'Request' | 'Incident' | 'New Procurement'
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      requester_department TEXT NOT NULL,
      location TEXT,
      priority TEXT NOT NULL DEFAULT 'Normal', -- 'Low' | 'Normal' | 'High' | 'Critical'
      status TEXT NOT NULL DEFAULT 'Open', -- 'Open' | 'In Progress' | 'Pending' | 'Solved' | 'Closed'
      assigned_to_id TEXT,
      assigned_to_name TEXT,
      assigned_at DATETIME,
      related_form_id TEXT,
      related_form_ref TEXT,
      related_asset_id TEXT,
      related_asset_name TEXT,
      resolution_summary TEXT,
      closed_by_id TEXT,
      closed_by_name TEXT,
      closed_at DATETIME,
      reopened_by_id TEXT,
      reopened_by_name TEXT,
      reopened_at DATETIME,
      reopen_reason TEXT,
      -- Procurement specific fields
      procurement_item_description TEXT,
      procurement_quantity INTEGER,
      procurement_unit_price REAL,
      procurement_total_cost REAL,
      procurement_justification TEXT,
      procurement_required_date TEXT,
      procurement_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ticket Comments & Work Logs
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      comment TEXT NOT NULL,
      is_internal INTEGER DEFAULT 0, -- 1 = internal IT note, hidden from end users!
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ticket Status History
    CREATE TABLE IF NOT EXISTS ticket_status_history (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL, -- 'form' | 'ticket' | 'approval' | 'asset' | 'system'
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Logs (Append-Only)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      previous_value TEXT,
      new_value TEXT,
      reason TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Number Sequences (Atomic Server Counter for Concurrency-Safe Numbering)
    CREATE TABLE IF NOT EXISTS number_sequences (
      scope_key TEXT PRIMARY KEY, -- e.g. 'FORM_AccessRequest_2026_10' or 'TICKET_2026_10' or 'ASSET_2026'
      current_value INTEGER NOT NULL DEFAULT 0,
      prefix TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData();
}

/**
 * Concurrency-safe atomic number generator for Forms and Tickets.
 * Requirements:
 * Form format: ACPI-HR-IT-FormType-Year-Month-Number (start at 000, 3 digits, expands to 4 if >= 1000)
 * Ticket format: ACPI-IT-Year-Month-Number (start at 0001, 4 digits)
 */
export function generateNextFormNumber(formTypeCode: string, year: number, month: number): string {
  const monthStr = String(month).padStart(2, '0');
  const scopeKey = `FORM_${formTypeCode}_${year}_${monthStr}`;

  const getSeq = db.transaction(() => {
    const existing = db.prepare('SELECT current_value FROM number_sequences WHERE scope_key = ?').get(scopeKey) as { current_value: number } | undefined;
    let nextVal = 0;
    if (!existing) {
      db.prepare('INSERT INTO number_sequences (scope_key, current_value, prefix, year, month) VALUES (?, ?, ?, ?, ?)').run(
        scopeKey,
        0,
        formTypeCode,
        year,
        month
      );
      nextVal = 0;
    } else {
      nextVal = existing.current_value + 1;
      db.prepare('UPDATE number_sequences SET current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE scope_key = ?').run(
        nextVal,
        scopeKey
      );
    }

    const formattedSeq = nextVal >= 1000 ? String(nextVal) : String(nextVal).padStart(3, '0');
    return `ACPI-HR-IT-${formTypeCode}-${year}-${monthStr}-${formattedSeq}`;
  });

  return getSeq();
}

export function generateNextTicketNumber(year: number, month: number): string {
  const monthStr = String(month).padStart(2, '0');
  const scopeKey = `TICKET_${year}_${monthStr}`;

  const getSeq = db.transaction(() => {
    const existing = db.prepare('SELECT current_value FROM number_sequences WHERE scope_key = ?').get(scopeKey) as { current_value: number } | undefined;
    let nextVal = 1;
    if (!existing) {
      db.prepare('INSERT INTO number_sequences (scope_key, current_value, prefix, year, month) VALUES (?, ?, ?, ?, ?)').run(
        scopeKey,
        1,
        'TICKET',
        year,
        month
      );
      nextVal = 1;
    } else {
      nextVal = existing.current_value + 1;
      db.prepare('UPDATE number_sequences SET current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE scope_key = ?').run(
        nextVal,
        scopeKey
      );
    }

    const formattedSeq = String(nextVal).padStart(4, '0');
    return `ACPI-IT-${year}-${monthStr}-${formattedSeq}`;
  });

  return getSeq();
}

export function generateNextAssetNumber(year: number): string {
  const scopeKey = `ASSET_${year}`;
  const getSeq = db.transaction(() => {
    const existing = db.prepare('SELECT current_value FROM number_sequences WHERE scope_key = ?').get(scopeKey) as { current_value: number } | undefined;
    let nextVal = 1;
    if (!existing) {
      db.prepare('INSERT INTO number_sequences (scope_key, current_value, prefix, year, month) VALUES (?, ?, ?, ?, ?)').run(
        scopeKey,
        1,
        'ASSET',
        year,
        1
      );
      nextVal = 1;
    } else {
      nextVal = existing.current_value + 1;
      db.prepare('UPDATE number_sequences SET current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE scope_key = ?').run(
        nextVal,
        scopeKey
      );
    }

    const formattedSeq = String(nextVal).padStart(4, '0');
    return `AST-${year}-${formattedSeq}`;
  });

  return getSeq();
}

export function addAuditLog(
  actorId: string,
  actorName: string,
  action: string,
  module: string,
  recordId?: string | null,
  prevVal?: string | null,
  newVal?: string | null,
  reason?: string | null,
  ip?: string | null
) {
  const id = 'aud_' + Math.random().toString(36).substring(2, 11);
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, action, module, record_id, previous_value, new_value, reason, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actorId, actorName, action, module, recordId || null, prevVal || null, newVal || null, reason || null, ip || '127.0.0.1');
}

export function createNotification(userId: string, title: string, message: string, type: string, link?: string) {
  const id = 'notif_' + Math.random().toString(36).substring(2, 11);
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, message, type, link || null);
}

function seedInitialData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) return; // already seeded

  console.log('Seeding initial data for ACPI System...');

  // 1. Departments
  const departments = [
    { id: 'dept_it', name: 'Information Technology', code: 'IT', head: 'Rian Pratama' },
    { id: 'dept_prod', name: 'Production & Manufacturing', code: 'PROD', head: 'Hendro Gunawan' },
    { id: 'dept_qa', name: 'Quality Assurance & QC', code: 'QA', head: 'Siti Rahmawati' },
    { id: 'dept_log', name: 'Supply Chain & Logistics', code: 'LOG', head: 'Budi Santoso' },
    { id: 'dept_hr', name: 'Human Resources & General Affairs', code: 'HRGA', head: 'Dewi Lestari' },
    { id: 'dept_fin', name: 'Finance & Accounting', code: 'FIN', head: 'Agus Wijaya' },
    { id: 'dept_mkt', name: 'Sales & Marketing', code: 'MKT', head: 'Maya Indriani' },
    { id: 'dept_exec', name: 'Executive & General Management', code: 'EXEC', head: 'Tan Sri Robert Chen' },
  ];
  const insertDept = db.prepare('INSERT INTO departments (id, name, code, head_name) VALUES (?, ?, ?, ?)');
  departments.forEach(d => insertDept.run(d.id, d.name, d.code, d.head));

  // 2. Roles
  const roles = [
    { id: 'role_staff', name: 'Staff', description: 'General end-user employee', is_system: 1 },
    { id: 'role_supervisor', name: 'Supervisor', description: 'First-line operational supervisor', is_system: 1 },
    { id: 'role_manager', name: 'Manager', description: 'Department manager with approval authority', is_system: 1 },
    { id: 'role_gm', name: 'General Manager', description: 'Plant & Division general manager', is_system: 1 },
    { id: 'role_vp', name: 'Vice President', description: 'Executive level approval authority', is_system: 1 },
    { id: 'role_itstaff', name: 'IT Staff', description: 'IT support, infrastructure and asset specialist', is_system: 1 },
    { id: 'role_headit', name: 'Head of IT', description: 'Chief of IT with ticket review, close and reopen authority', is_system: 1 },
    { id: 'role_admin', name: 'System Administrator', description: 'System configuration and user manager', is_system: 1 },
  ];
  const insertRole = db.prepare('INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)');
  roles.forEach(r => insertRole.run(r.id, r.name, r.description, r.is_system));

  // 3. Permissions list based on Specification Section 4 Matrix
  const permissions = [
    { id: 'perm_view_sops', module: 'SOPs', action: 'view', description: 'View SOPs and IT policies' },
    { id: 'perm_manage_sops', module: 'SOPs', action: 'manage', description: 'Manage SOPs, upload and publish documents' },
    { id: 'perm_fill_forms', module: 'Forms', action: 'submit', description: 'Fill out and submit request forms' },
    { id: 'perm_view_approval_ack', module: 'Forms', action: 'view_ack', description: 'View approval acknowledgments' },
    { id: 'perm_approve_requests', module: 'Forms', action: 'approve', description: 'Approve or reject requests' },
    { id: 'perm_manage_templates', module: 'Forms', action: 'manage_templates', description: 'Manage form templates and categories' },
    { id: 'perm_view_assets', module: 'Assets', action: 'view', description: 'View IT asset inventory' },
    { id: 'perm_manage_assets', module: 'Assets', action: 'manage', description: 'Full IT asset management, edit, transfer' },
    { id: 'perm_create_tickets', module: 'Tickets', action: 'create', description: 'Create tickets' },
    { id: 'perm_view_own_tickets', module: 'Tickets', action: 'view_own', description: 'View own submitted tickets' },
    { id: 'perm_view_all_tickets', module: 'Tickets', action: 'view_all', description: 'View all tickets in company' },
    { id: 'perm_update_ticket_status', module: 'Tickets', action: 'update_status', description: 'Update ticket status (Open, In Progress, Solved)' },
    { id: 'perm_reopen_tickets', module: 'Tickets', action: 'reopen', description: 'Reopen solved or closed tickets' },
    { id: 'perm_close_tickets', module: 'Tickets', action: 'close', description: 'Officially close tickets' },
    { id: 'perm_manage_users', module: 'Admin', action: 'manage_users', description: 'Manage application users and roles' },
    { id: 'perm_manage_settings', module: 'Admin', action: 'manage_settings', description: 'Manage application settings' },
    { id: 'perm_delete_records', module: 'Admin', action: 'delete_records', description: 'System Admin ability to purge or delete historical records' },
  ];
  const insertPerm = db.prepare('INSERT INTO permissions (id, module, action, description) VALUES (?, ?, ?, ?)');
  permissions.forEach(p => insertPerm.run(p.id, p.module, p.action, p.description));

  // Role permissions mapping according to matrix:
  const rolePerms: Record<string, string[]> = {
    role_staff: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_assets', 'perm_create_tickets', 'perm_view_own_tickets'
    ],
    role_supervisor: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_approval_ack', 'perm_view_assets', 'perm_create_tickets', 'perm_view_own_tickets'
    ],
    role_manager: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_approval_ack', 'perm_approve_requests', 'perm_view_assets', 'perm_create_tickets', 'perm_view_own_tickets'
    ],
    role_gm: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_approval_ack', 'perm_approve_requests', 'perm_view_assets', 'perm_create_tickets', 'perm_view_own_tickets'
    ],
    role_vp: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_approval_ack', 'perm_approve_requests', 'perm_view_assets', 'perm_create_tickets', 'perm_view_own_tickets'
    ],
    role_itstaff: [
      'perm_view_sops', 'perm_fill_forms', 'perm_view_assets', 'perm_manage_assets', 'perm_create_tickets', 'perm_view_own_tickets', 'perm_view_all_tickets', 'perm_update_ticket_status'
    ],
    role_headit: [
      'perm_view_sops', 'perm_manage_sops', 'perm_fill_forms', 'perm_view_approval_ack', 'perm_approve_requests', 'perm_manage_templates', 'perm_view_assets', 'perm_manage_assets', 'perm_create_tickets', 'perm_view_own_tickets', 'perm_view_all_tickets', 'perm_update_ticket_status', 'perm_reopen_tickets', 'perm_close_tickets'
    ],
    role_admin: [
      'perm_view_sops', 'perm_manage_sops', 'perm_fill_forms', 'perm_manage_templates', 'perm_view_assets', 'perm_manage_assets', 'perm_create_tickets', 'perm_view_own_tickets', 'perm_view_all_tickets', 'perm_manage_users', 'perm_manage_settings', 'perm_delete_records'
    ]
  };

  const insertRP = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  Object.entries(rolePerms).forEach(([rId, pIds]) => {
    pIds.forEach(pId => insertRP.run(rId, pId));
  });

  // 4. Default Seed Users
  // Standard test password for demo is Password123!
  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const users = [
    {
      id: 'usr_admin',
      employee_id: 'ACPI-001',
      full_name: 'David Hartono (SysAdmin)',
      email: 'admin@acpi.co.id',
      username: 'admin',
      role_id: 'role_admin',
      department: 'Information Technology',
      job_title: 'Lead System Administrator',
      manager: 'Rian Pratama'
    },
    {
      id: 'usr_headit',
      employee_id: 'ACPI-002',
      full_name: 'Rian Pratama (Head of IT)',
      email: 'headit@acpi.co.id',
      username: 'headit',
      role_id: 'role_headit',
      department: 'Information Technology',
      job_title: 'Head of Information Technology',
      manager: 'Tan Sri Robert Chen'
    },
    {
      id: 'usr_itstaff',
      employee_id: 'ACPI-003',
      full_name: 'Farhan Maulana (IT Support)',
      email: 'itstaff@acpi.co.id',
      username: 'itstaff',
      role_id: 'role_itstaff',
      department: 'Information Technology',
      job_title: 'Senior IT Support Specialist',
      manager: 'Rian Pratama'
    },
    {
      id: 'usr_manager',
      employee_id: 'ACPI-004',
      full_name: 'Hendro Gunawan (Plant Manager)',
      email: 'manager@acpi.co.id',
      username: 'manager',
      role_id: 'role_manager',
      department: 'Production & Manufacturing',
      job_title: 'Plant Operations Manager',
      manager: 'Tan Sri Robert Chen'
    },
    {
      id: 'usr_gm',
      employee_id: 'ACPI-005',
      full_name: 'Ir. Surya Kusuma (General Manager)',
      email: 'gm@acpi.co.id',
      username: 'gm',
      role_id: 'role_gm',
      department: 'Executive & General Management',
      job_title: 'General Manager of Operations',
      manager: 'Tan Sri Robert Chen'
    },
    {
      id: 'usr_vp',
      employee_id: 'ACPI-006',
      full_name: 'Tan Sri Robert Chen (VP Operations)',
      email: 'vp@acpi.co.id',
      username: 'vp',
      role_id: 'role_vp',
      department: 'Executive & General Management',
      job_title: 'Vice President Operations',
      manager: 'Board of Directors'
    },
    {
      id: 'usr_supervisor',
      employee_id: 'ACPI-007',
      full_name: 'Siti Rahmawati (QA Supervisor)',
      email: 'supervisor@acpi.co.id',
      username: 'supervisor',
      role_id: 'role_supervisor',
      department: 'Quality Assurance & QC',
      job_title: 'QA Line Supervisor',
      manager: 'Hendro Gunawan'
    },
    {
      id: 'usr_staff',
      employee_id: 'ACPI-008',
      full_name: 'Budi Santoso (Logistics Officer)',
      email: 'staff@acpi.co.id',
      username: 'staff',
      role_id: 'role_staff',
      department: 'Supply Chain & Logistics',
      job_title: 'Logistics Warehouse Specialist',
      manager: 'Hendro Gunawan'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, employee_id, full_name, email, username, password_hash, department, job_title, role_id, status, reporting_manager)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);
  users.forEach(u => insertUser.run(u.id, u.employee_id, u.full_name, u.email, u.username, passwordHash, u.department, u.job_title, u.role_id, u.manager));

  // 5. Form Categories
  const formCategories = [
    { id: 'cat_access', name: 'IT Access Request', code: 'AccessRequest', desc: 'User accounts, VPN, SAP, ERP and system access permissions' },
    { id: 'cat_hardware', name: 'Hardware Request', code: 'HardwareRequest', desc: 'Laptops, desktop PCs, monitors, scanners, and peripherals' },
    { id: 'cat_software', name: 'Software Installation Request', code: 'SoftwareRequest', desc: 'Licensed software, productivity tools and technical utilities' },
    { id: 'cat_network', name: 'Network Access Request', code: 'NetworkAccess', desc: 'Wi-Fi, port forwarding, VPN, VLAN and firewall rules' },
    { id: 'cat_transfer', name: 'IT Asset Transfer Request', code: 'AssetTransfer', desc: 'Inter-department or inter-personnel IT asset movement' },
    { id: 'cat_return', name: 'IT Asset Return Request', code: 'AssetReturn', desc: 'Return of company IT equipment to inventory stock' },
    { id: 'cat_maint', name: 'IT Maintenance Request', code: 'Maintenance', desc: 'Preventive or corrective IT equipment maintenance' },
    { id: 'cat_procure', name: 'New Procurement Request', code: 'NewProcurement', desc: 'Procurement of new equipment, servers, or cloud infrastructure' },
  ];
  const insertCat = db.prepare('INSERT INTO form_categories (id, name, code, description) VALUES (?, ?, ?, ?)');
  formCategories.forEach(c => insertCat.run(c.id, c.name, c.code, c.desc));

  // 6. SOP Documents
  const sops = [
    {
      id: 'sop_001',
      document_id: 'DOC-SOP-001',
      title: 'IT Information Security & Acceptable Use Policy',
      document_number: 'ACPI-SOP-IT-001',
      category: 'Information Security',
      department: 'Information Technology',
      description: 'Standard operating procedure governing company computer assets, network safety, confidential data handling, and acceptable Internet usage in manufacturing plants.',
      version: 'v2.1',
      effective_date: '2026-01-15',
      review_date: '2027-01-15',
      content_body: `1. PURPOSE AND SCOPE
This document outlines the policy of PT Alliance Consumer Products Indonesia (ACPI) regarding IT systems, corporate data, and computing hardware. Applicable to all permanent and contract personnel across all manufacturing plants and corporate offices.

2. ACCESS CREDENTIALS
- All employees must keep passwords confidential (minimum 10 characters, combining letters, numbers, and symbols).
- Multi-factor authentication is required for remote VPN access.
- Accounts unused for 45 days are automatically suspended.

3. HARDWARE & PERIPHERALS
- Only IT-issued or approved devices may connect to the corporate industrial network.
- USB mass storage devices require IT clearance before connection to SAP production workstations.

4. VIOLATIONS
Unauthorized access attempts or intentional tampering will be subject to disciplinary action in accordance with ACPI Labor Regulations.`,
      status: 'published',
      created_by: 'usr_headit'
    },
    {
      id: 'sop_002',
      document_id: 'DOC-SOP-002',
      title: 'User Access Control & Authorization SOP',
      document_number: 'ACPI-SOP-IT-002',
      category: 'Access Management',
      department: 'Information Technology',
      description: 'Guidelines for requesting, approving, provisioning, and revoking user accounts for ERP SAP S/4HANA, Warehouse Management System (WMS), and email.',
      version: 'v1.4',
      effective_date: '2026-02-01',
      review_date: '2027-02-01',
      content_body: `1. APPLICATION PROCESS
All access requests must be initiated via the ACPI Digital Forms system with manager endorsement.

2. APPROVAL LEVELS
- Standard Email / Domain: Department Manager approval.
- SAP / WMS ERP Modules: Department Manager + Head of IT endorsement.
- Superuser / Financial Authorizations: General Manager / VP approval required.

3. PROVISIONING SLA
Approved access forms will be provisioned by IT Staff within 24 working hours.`,
      status: 'published',
      created_by: 'usr_headit'
    },
    {
      id: 'sop_003',
      document_id: 'DOC-SOP-003',
      title: 'IT Asset Lifecycle, Allocation & Return SOP',
      document_number: 'ACPI-SOP-IT-003',
      category: 'Asset Management',
      department: 'Information Technology',
      description: 'Detailed steps for employee laptop allocation, barcode tagging, transfer handover forms, and return upon employee separation.',
      version: 'v1.0',
      effective_date: '2026-03-01',
      review_date: '2027-03-01',
      content_body: `1. ASSET ISSUANCE
Every device receives an ACPI Asset Tag barcode (e.g., AST-2026-XXXX). The recipient must sign the digital handover form upon physical receipt.

2. ASSET TRANSFERS
When an employee changes department or relocates between Cikarang Plant 1 and Plant 2, an IT Asset Transfer Form must be completed.

3. OFFBOARDING & RETURN
Upon resignation or contract completion, all hardware, chargers, and security tokens must be physically surrendered to IT Staff for inspection.`,
      status: 'published',
      created_by: 'usr_headit'
    },
    {
      id: 'sop_004',
      document_id: 'DOC-SOP-004',
      title: 'IT Incident Management & SLA Escalation SOP',
      document_number: 'ACPI-SOP-IT-004',
      category: 'Incident Management',
      department: 'Information Technology',
      description: 'Incident severity classifications, response time SLAs, and escalation pathways for plant manufacturing interruptions.',
      version: 'v2.0',
      effective_date: '2026-01-10',
      review_date: '2027-01-10',
      content_body: `1. SEVERITY TIERS
- CRITICAL: Plant line stoppage, network switch down, SAP offline. SLA Response: 15 mins. Resolution Target: 2 hours.
- HIGH: Workstation failure on active packing line. SLA Response: 30 mins.
- NORMAL: Individual email or printing issues. SLA Response: 4 hours.
- LOW: Routine inquiry or non-blocking setup. SLA Response: 24 hours.

2. CLOSURE AUTHORITY
Only the Head of IT has authority to formally close or re-open solved production incident tickets.`,
      status: 'published',
      created_by: 'usr_headit'
    }
  ];

  const insertSOP = db.prepare(`
    INSERT INTO sop_documents (id, document_id, title, document_number, category, department, description, version, effective_date, review_date, content_body, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  sops.forEach(s => insertSOP.run(s.id, s.document_id, s.title, s.document_number, s.category, s.department, s.description, s.version, s.effective_date, s.review_date, s.content_body, s.status, s.created_by));

  // 7. Form Templates
  const templates = [
    {
      id: 'tmpl_access',
      name: 'User Account & System Access Request',
      category_id: 'cat_access',
      code: 'AccessRequest',
      description: 'Request new user accounts or permissions for SAP ERP, WMS, Corporate Email, or Shared Drives.',
      fields_json: JSON.stringify([
        { id: 'system_type', label: 'Target System', type: 'dropdown', required: true, options: ['SAP S/4HANA', 'Warehouse Management (WMS)', 'Corporate Email (Microsoft 365)', 'Production MES', 'File Server Shared Drive', 'VPN Remote Access'] },
        { id: 'access_level', label: 'Access Level Requested', type: 'dropdown', required: true, options: ['Read Only', 'Standard User / Transactional', 'Department Lead / Approver', 'Administrator / Superuser'] },
        { id: 'business_justification', label: 'Business Justification', type: 'textarea', required: true, placeholder: 'Explain why this system access is required for your daily job responsibilities.' },
        { id: 'effective_until', label: 'Requested Expiry (or Permanent)', type: 'dropdown', required: true, options: ['Permanent Employee Assignment', '3 Months (Project / Contract)', '6 Months', '1 Year'] },
        { id: 'supervisor_name', label: 'Direct Supervisor', type: 'text', required: true }
      ]),
      version: 'v1.0',
      ticket_category_on_approval: 'Request',
      generate_ticket: 1,
      requires_approval: 1,
      approval_levels: 1,
      linked_sop_id: 'sop_002'
    },
    {
      id: 'tmpl_hardware',
      name: 'Hardware & Workstation Request Form',
      category_id: 'cat_hardware',
      code: 'HardwareRequest',
      description: 'Request laptop, desktop, monitor, barcode scanner, or plant floor label printer.',
      fields_json: JSON.stringify([
        { id: 'device_type', label: 'Equipment Type', type: 'dropdown', required: true, options: ['Laptop (Standard Office)', 'Laptop (Engineering / High Performance)', 'Desktop Workstation', 'Monitor 24-inch', 'Industrial Barcode Scanner', 'Zebra Label Printer', 'Docking Station'] },
        { id: 'allocation_type', label: 'Allocation Type', type: 'radio', required: true, options: ['New Employee Onboarding', 'Hardware Replacement (Broken / Obsolete)', 'Temporary Plant Project'] },
        { id: 'working_location', label: 'Physical Plant Location', type: 'dropdown', required: true, options: ['Cikarang Plant 1 - Production Floor', 'Cikarang Plant 1 - Admin Office', 'Cikarang Plant 2 - Filling & Packing', 'Jakarta Head Office', 'Warehouse Logistics Hub'] },
        { id: 'specifications_needed', label: 'Special Technical Requirements', type: 'textarea', required: false, placeholder: 'e.g. 16GB RAM, Dual HDMI port, rugged casing' },
        { id: 'justification', label: 'Business Justification', type: 'textarea', required: true, placeholder: 'Describe manufacturing or operational need.' }
      ]),
      version: 'v1.0',
      ticket_category_on_approval: 'Request',
      generate_ticket: 1,
      requires_approval: 1,
      approval_levels: 2,
      linked_sop_id: 'sop_003'
    },
    {
      id: 'tmpl_asset_transfer',
      name: 'IT Asset Transfer & Handover Form',
      category_id: 'cat_transfer',
      code: 'AssetTransfer',
      description: 'Transfer custody of an existing registered IT asset between employees or plant departments.',
      fields_json: JSON.stringify([
        { id: 'asset_tag', label: 'Asset Barcode / ID', type: 'text', required: true, placeholder: 'e.g. AST-2026-0001' },
        { id: 'current_holder', label: 'Current Assigned Employee', type: 'text', required: true },
        { id: 'recipient_employee', label: 'New Custodian / Employee', type: 'text', required: true },
        { id: 'new_department', label: 'Destination Department', type: 'dropdown', required: true, options: ['Production & Manufacturing', 'Quality Assurance & QC', 'Supply Chain & Logistics', 'Finance & Accounting', 'Human Resources', 'Information Technology'] },
        { id: 'physical_condition', label: 'Physical Condition Check', type: 'dropdown', required: true, options: ['Good & Functional', 'Minor Cosmetic Wear', 'Pending Servicing'] },
        { id: 'transfer_reason', label: 'Reason for Transfer', type: 'textarea', required: true }
      ]),
      version: 'v1.0',
      ticket_category_on_approval: 'Request',
      generate_ticket: 1,
      requires_approval: 1,
      approval_levels: 1,
      linked_sop_id: 'sop_003'
    },
    {
      id: 'tmpl_new_procure',
      name: 'New IT Equipment & CapEx Procurement Request',
      category_id: 'cat_procure',
      code: 'NewProcurement',
      description: 'Procurement of new computing infrastructure, network switches, server expansions, or software enterprise licenses.',
      fields_json: JSON.stringify([
        { id: 'item_description', label: 'Item & Model Description', type: 'text', required: true, placeholder: 'e.g. Cisco CBS350 48-port PoE Managed Switch' },
        { id: 'quantity', label: 'Quantity', type: 'number', required: true },
        { id: 'estimated_unit_price', label: 'Estimated Unit Cost (IDR)', type: 'number', required: true },
        { id: 'vendor_name', label: 'Suggested Vendor / Supplier', type: 'text', required: false, placeholder: 'e.g. PT Metrodata Electronics' },
        { id: 'required_date', label: 'Target In-Service Date', type: 'date', required: true },
        { id: 'budget_type', label: 'Budget Allocation', type: 'dropdown', required: true, options: ['IT Operational Budget (OpEx)', 'Manufacturing Plant CapEx', 'Special Automation Project'] },
        { id: 'business_justification', label: 'Detailed Justification & ROI', type: 'textarea', required: true }
      ]),
      version: 'v1.0',
      ticket_category_on_approval: 'New Procurement',
      generate_ticket: 1,
      requires_approval: 1,
      approval_levels: 2,
      linked_sop_id: 'sop_001'
    }
  ];

  const insertTmpl = db.prepare(`
    INSERT INTO form_templates (id, name, category_id, code, description, fields_json, version, ticket_category_on_approval, generate_ticket, requires_approval, approval_levels, linked_sop_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_headit')
  `);
  templates.forEach(t => insertTmpl.run(t.id, t.name, t.category_id, t.code, t.description, t.fields_json, t.version, t.ticket_category_on_approval, t.generate_ticket, t.requires_approval, t.approval_levels, t.linked_sop_id));

  // 8. Sample IT Assets
  const assets = [
    {
      id: 'ast_001',
      asset_id: 'AST-2026-0001',
      item_name: 'Dell Latitude 5540 i7 Workstation',
      category: 'Laptop',
      brand: 'Dell',
      model: 'Latitude 5540 (Intel Core i7-1365U, 32GB RAM, 1TB SSD)',
      serial_number: 'CN-0Y839X-72405-3A4-1002',
      vendor_name: 'PT Metrodata Electronics Tbk',
      vendor_contact: 'sales@metrodata.co.id / +62 21 2934 5000',
      purchase_date: '2026-01-15',
      purchase_price: 24500000,
      location: 'Cikarang Plant 1 - Operations Office',
      assigned_to_id: 'usr_manager',
      assigned_to_name: 'Hendro Gunawan',
      assigned_employee_id: 'ACPI-004',
      department: 'Production & Manufacturing',
      status: 'Assigned',
      warranty_start_date: '2026-01-15',
      warranty_end_date: '2029-01-15',
      contract_end_date: '2029-01-15',
      remarks: 'Standard plant manager computing workstation with docking kit.'
    },
    {
      id: 'ast_002',
      asset_id: 'AST-2026-0002',
      item_name: 'Lenovo ThinkPad T14 Gen 4',
      category: 'Laptop',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4 (AMD Ryzen 7, 16GB RAM, 512GB SSD)',
      serial_number: 'PF-4J82K1',
      vendor_name: 'PT Synnex Metrodata',
      vendor_contact: 'support@synnexmetrodata.com',
      purchase_date: '2026-02-10',
      purchase_price: 18200000,
      location: 'Cikarang Plant 1 - QA Laboratory',
      assigned_to_id: 'usr_supervisor',
      assigned_to_name: 'Siti Rahmawati',
      assigned_employee_id: 'ACPI-007',
      department: 'Quality Assurance & QC',
      status: 'Assigned',
      warranty_start_date: '2026-02-10',
      warranty_end_date: '2028-02-10',
      remarks: 'Used for QA batch record inspection and SAP QM entries.'
    },
    {
      id: 'ast_003',
      asset_id: 'AST-2026-0003',
      item_name: 'Cisco Catalyst 9300 48-Port PoE+ Switch',
      category: 'Network equipment',
      brand: 'Cisco',
      model: 'C9300-48P-A',
      serial_number: 'FCW2438L07T',
      vendor_name: 'PT Mitra Integrasi Informatika',
      vendor_contact: 'enterprise@mii.co.id',
      purchase_date: '2025-06-18',
      purchase_price: 85000000,
      location: 'Cikarang Plant 1 - Server Room Rack 2',
      department: 'Information Technology',
      status: 'Assigned',
      warranty_start_date: '2025-06-18',
      warranty_end_date: '2028-06-18',
      remarks: 'Main core distribution switch connecting production line sensors.'
    },
    {
      id: 'ast_004',
      asset_id: 'AST-2026-0004',
      item_name: 'Fortinet FortiGate 100F Next-Gen Firewall',
      category: 'Firewall',
      brand: 'Fortinet',
      model: 'FG-100F-BDL-950-12',
      serial_number: 'FGT100FT20019284',
      vendor_name: 'PT Mastersystem Infotama',
      vendor_contact: 'soc@mastersystem.co.id',
      purchase_date: '2025-08-01',
      purchase_price: 120000000,
      location: 'Cikarang Plant 1 - Main Datacenter',
      department: 'Information Technology',
      status: 'Assigned',
      warranty_start_date: '2025-08-01',
      warranty_end_date: '2027-08-01',
      remarks: 'Perimeter firewall protecting industrial SCADA and office network.'
    },
    {
      id: 'ast_005',
      asset_id: 'AST-2026-0005',
      item_name: 'HP Color LaserJet Enterprise MFP M578dn',
      category: 'Printer',
      brand: 'HP',
      model: 'Enterprise M578dn Duplex MFP',
      serial_number: 'VNB3G89124',
      vendor_name: 'PT Astragraphia Xprins',
      vendor_contact: 'service@astragraphia.co.id',
      purchase_date: '2025-11-20',
      purchase_price: 32000000,
      location: 'Cikarang Plant 2 - Admin Hub',
      department: 'Supply Chain & Logistics',
      status: 'In Maintenance',
      warranty_start_date: '2025-11-20',
      warranty_end_date: '2026-11-20',
      remarks: 'Under scheduled roller maintenance by vendor technician.'
    },
    {
      id: 'ast_006',
      asset_id: 'AST-2026-0006',
      item_name: 'Dell PowerEdge R750xs Dual Xeon Server',
      category: 'Server',
      brand: 'Dell Technologies',
      model: 'PowerEdge R750xs (2x Intel Xeon Gold 5318Y, 128GB RAM, 8x 2TB SAS)',
      serial_number: '7B39YQ2',
      vendor_name: 'PT Metrodata Electronics Tbk',
      vendor_contact: 'sales@metrodata.co.id',
      purchase_date: '2025-04-10',
      purchase_price: 175000000,
      location: 'Cikarang Plant 1 - Server Room Rack 1',
      department: 'Information Technology',
      status: 'Assigned',
      warranty_start_date: '2025-04-10',
      warranty_end_date: '2028-04-10',
      remarks: 'Host server for Plant MES database and local file backups.'
    },
    {
      id: 'ast_007',
      asset_id: 'AST-2026-0007',
      item_name: 'Zebra TC52x Rugged Android Barcode Computer',
      category: 'Scanner',
      brand: 'Zebra',
      model: 'TC520K-1PEZU4P-A6',
      serial_number: '21192523100341',
      vendor_name: 'PT Noah Arkindo',
      vendor_contact: 'info@noah-arkindo.com',
      purchase_date: '2026-03-05',
      purchase_price: 16500000,
      location: 'Finished Goods Warehouse',
      assigned_to_id: 'usr_staff',
      assigned_to_name: 'Budi Santoso',
      assigned_employee_id: 'ACPI-008',
      department: 'Supply Chain & Logistics',
      status: 'Assigned',
      warranty_start_date: '2026-03-05',
      warranty_end_date: '2027-03-05',
      remarks: 'Used for pallet QR scanning and loading dispatch.'
    },
    {
      id: 'ast_008',
      asset_id: 'AST-2026-0008',
      item_name: 'Lenovo ThinkCentre M70q Tiny PC',
      category: 'Desktop computer',
      brand: 'Lenovo',
      model: 'ThinkCentre M70q Gen 3 Tiny',
      serial_number: 'MJ09X872',
      vendor_name: 'PT Synnex Metrodata',
      vendor_contact: 'support@synnexmetrodata.com',
      purchase_date: '2026-04-01',
      purchase_price: 11200000,
      location: 'IT Storage Staging Rack',
      department: 'Information Technology',
      status: 'In Stock',
      warranty_start_date: '2026-04-01',
      warranty_end_date: '2029-04-01',
      remarks: 'Prepared spare desktop ready for immediate line replacement.'
    }
  ];

  const insertAsset = db.prepare(`
    INSERT INTO assets (id, asset_id, item_name, category, brand, model, serial_number, vendor_name, vendor_contact, purchase_date, purchase_price, location, assigned_to_id, assigned_to_name, assigned_employee_id, department, status, warranty_start_date, warranty_end_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_headit')
  `);
  assets.forEach(a => insertAsset.run(a.id, a.asset_id, a.item_name, a.category, a.brand, a.model, a.serial_number, a.vendor_name, a.vendor_contact, a.purchase_date, a.purchase_price, a.location, a.assigned_to_id || null, a.assigned_to_name || null, a.assigned_employee_id || null, a.department, a.status, a.warranty_start_date, a.warranty_end_date, a.remarks));

  // Initialize number sequences
  db.prepare(`
    INSERT OR REPLACE INTO number_sequences (scope_key, current_value, prefix, year, month)
    VALUES ('ASSET_2026', 8, 'ASSET', 2026, 1)
  `).run();

  // 9. Initial Form Submissions & Tickets
  // Submission 1: Approved Access Request with auto-created ticket
  const formRef1 = 'ACPI-HR-IT-AccessRequest-2026-10-000';
  const subId1 = 'sub_001';
  db.prepare(`
    INSERT INTO form_submissions (id, reference_number, template_id, template_name, category_name, requester_id, requester_name, requester_email, department, data_json, status, current_approval_level, total_approval_levels, current_approver_role, linked_sop_id, ticket_id)
    VALUES (?, ?, 'tmpl_access', 'User Account & System Access Request', 'IT Access Request', 'usr_staff', 'Budi Santoso (Logistics Officer)', 'staff@acpi.co.id', 'Supply Chain & Logistics', ?, 'Approved', 1, 1, 'Manager', 'sop_002', 'tkt_001')
  `).run(subId1, formRef1, JSON.stringify({
    system_type: 'SAP S/4HANA',
    access_level: 'Standard User / Transactional',
    business_justification: 'Need access to SAP MM (Materials Management) module to record raw material receipts from suppliers.',
    effective_until: 'Permanent Employee Assignment',
    supervisor_name: 'Hendro Gunawan'
  }));

  // Approval record for sub 1
  db.prepare(`
    INSERT INTO approval_records (id, submission_id, level, approver_id, approver_name, approver_role, decision, comments)
    VALUES ('apr_001', ?, 1, 'usr_manager', 'Hendro Gunawan (Plant Manager)', 'Manager', 'Approved', 'Approved. Employee requires SAP MM transaction authorizations for plant supply chain workflow.')
  `).run(subId1);

  // Associated Ticket 1
  const tktNum1 = 'ACPI-IT-2026-10-0001';
  db.prepare(`
    INSERT INTO tickets (id, ticket_number, category, subject, description, requester_id, requester_name, requester_department, location, priority, status, assigned_to_id, assigned_to_name, related_form_id, related_form_ref)
    VALUES ('tkt_001', ?, 'Request', 'Provision SAP MM Access for Budi Santoso', 'Auto-generated from approved request ACPI-HR-IT-AccessRequest-2026-10-000. Need access to SAP MM module for logistics operations.', 'usr_staff', 'Budi Santoso (Logistics Officer)', 'Supply Chain & Logistics', 'Cikarang Plant 1 - Warehouse', 'Normal', 'In Progress', 'usr_itstaff', 'Farhan Maulana (IT Support)', ?, ?)
  `).run(tktNum1, subId1, formRef1);

  db.prepare(`
    INSERT INTO ticket_comments (id, ticket_id, user_id, user_name, user_role, comment, is_internal)
    VALUES ('cmt_001', 'tkt_001', 'usr_itstaff', 'Farhan Maulana (IT Support)', 'IT Staff', 'Created user account profile in SAP S/4HANA staging. Applying MM01/MM02 role templates.', 1)
  `).run();

  // Submission 2: Pending Approval
  const formRef2 = 'ACPI-HR-IT-HardwareRequest-2026-10-001';
  const subId2 = 'sub_002';
  db.prepare(`
    INSERT INTO form_submissions (id, reference_number, template_id, template_name, category_name, requester_id, requester_name, requester_email, department, data_json, status, current_approval_level, total_approval_levels, current_approver_role, linked_sop_id)
    VALUES (?, ?, 'tmpl_hardware', 'Hardware & Workstation Request Form', 'Hardware Request', 'usr_supervisor', 'Siti Rahmawati (QA Supervisor)', 'supervisor@acpi.co.id', 'Quality Assurance & QC', ?, 'Pending Approval', 1, 2, 'Manager', 'sop_003')
  `).run(subId2, formRef2, JSON.stringify({
    device_type: 'Industrial Barcode Scanner',
    allocation_type: 'New Employee Onboarding',
    working_location: 'Cikarang Plant 1 - QA Laboratory',
    specifications_needed: 'High-density barcode reader capable of scanning small pharmaceutical/consumer product labels.',
    justification: 'Additional QA inspector joining the line next Monday.'
  }));

  // Submission 3: New Procurement Request in Pending Approval Level 2 (VP)
  const formRef3 = 'ACPI-HR-IT-NewProcurement-2026-10-002';
  const subId3 = 'sub_003';
  db.prepare(`
    INSERT INTO form_submissions (id, reference_number, template_id, template_name, category_name, requester_id, requester_name, requester_email, department, data_json, status, current_approval_level, total_approval_levels, current_approver_role, linked_sop_id)
    VALUES (?, ?, 'tmpl_new_procure', 'New IT Equipment & CapEx Procurement Request', 'New Procurement Request', 'usr_headit', 'Rian Pratama (Head of IT)', 'headit@acpi.co.id', 'Information Technology', ?, 'Pending Approval', 2, 2, 'Vice President', 'sop_001')
  `).run(subId3, formRef3, JSON.stringify({
    item_description: 'Industrial Core Access Switch Upgrade - Plant 2 Packaging Line',
    quantity: 2,
    estimated_unit_price: 48000000,
    vendor_name: 'PT Mastersystem Infotama',
    required_date: '2026-12-01',
    budget_type: 'Manufacturing Plant CapEx',
    business_justification: 'Existing switches in Plant 2 reach end-of-life this quarter; replacement guarantees zero unannounced downtime.'
  }));

  // Approval record Level 1 (Manager endorsed) for sub 3
  db.prepare(`
    INSERT INTO approval_records (id, submission_id, level, approver_id, approver_name, approver_role, decision, comments)
    VALUES ('apr_002', ?, 1, 'usr_manager', 'Hendro Gunawan (Plant Manager)', 'Manager', 'Approved', 'Technical justification verified. Budget aligns with Q4 plant modernization.')
  `).run(subId3);

  // Additional standalone tickets
  const tktNum2 = 'ACPI-IT-2026-10-0002';
  db.prepare(`
    INSERT INTO tickets (id, ticket_number, category, subject, description, requester_id, requester_name, requester_department, location, priority, status, assigned_to_id, assigned_to_name, related_asset_id, related_asset_name)
    VALUES ('tkt_002', ?, 'Incident', 'Filling Line 3 Barcode Scanner Intermittent Disconnection', 'The handheld scanner on Line 3 keeps dropping USB connection to the terminal, stopping packaging record printout.', 'usr_supervisor', 'Siti Rahmawati (QA Supervisor)', 'Quality Assurance & QC', 'Cikarang Plant 1 - Line 3', 'High', 'Open', 'usr_itstaff', 'Farhan Maulana (IT Support)', 'ast_007', 'Zebra TC52x Rugged Android Barcode Computer')
  `).run(tktNum2);

  const tktNum3 = 'ACPI-IT-2026-10-0003';
  db.prepare(`
    INSERT INTO tickets (id, ticket_number, category, subject, description, requester_id, requester_name, requester_department, location, priority, status, assigned_to_id, assigned_to_name, related_asset_id, related_asset_name, resolution_summary)
    VALUES ('tkt_003', ?, 'Incident', 'Plant 2 Hub Network Switch Fan Alarm', 'Temperature sensor warning detected on edge switch. Cleaned exhaust filter and checked PoE loads.', 'usr_headit', 'Rian Pratama (Head of IT)', 'Information Technology', 'Cikarang Plant 2 - Hub', 'Normal', 'Solved', 'usr_itstaff', 'Farhan Maulana (IT Support)', 'ast_003', 'Cisco Catalyst 9300 48-Port PoE+ Switch', 'Air filters cleared of dust, firmware diagnostics run with zero packet drop. Ready for Head of IT closure.')
  `).run(tktNum3);

  // Set sequence counters
  db.prepare(`
    INSERT OR REPLACE INTO number_sequences (scope_key, current_value, prefix, year, month)
    VALUES 
      ('FORM_AccessRequest_2026_10', 0, 'AccessRequest', 2026, 10),
      ('FORM_HardwareRequest_2026_10', 1, 'HardwareRequest', 2026, 10),
      ('FORM_NewProcurement_2026_10', 2, 'NewProcurement', 2026, 10),
      ('TICKET_2026_10', 3, 'TICKET', 2026, 10)
  `).run();

  // Initial Notifications
  createNotification('usr_manager', 'New Form Awaiting Your Approval', 'Form ACPI-HR-IT-HardwareRequest-2026-10-001 from Siti Rahmawati requires your review.', 'approval', '/approvals');
  createNotification('usr_vp', 'CapEx Procurement Awaiting Executive Approval', 'Form ACPI-HR-IT-NewProcurement-2026-10-002 requires Vice President sign-off.', 'approval', '/approvals');
  createNotification('usr_staff', 'Request Approved & Ticket Created', 'Your request ACPI-HR-IT-AccessRequest-2026-10-000 was approved. Ticket ACPI-IT-2026-10-0001 is now In Progress.', 'ticket', '/tickets');

  // Initial Audit Logs
  addAuditLog('usr_admin', 'David Hartono (SysAdmin)', 'INITIAL_SYSTEM_SETUP', 'System', 'sys', null, 'System database initialized with ACPI standards', 'Initial setup and seed execution');
  addAuditLog('usr_manager', 'Hendro Gunawan (Plant Manager)', 'APPROVE_FORM', 'Forms', subId1, 'Pending Approval', 'Approved', 'Approved SAP MM access for Budi Santoso');
  addAuditLog('usr_headit', 'Rian Pratama (Head of IT)', 'PUBLISH_SOP', 'SOPs', 'sop_001', null, 'v2.1 Published', 'Updated password and MFA policies for plant access');

  // System Settings
  const settings = [
    { key: 'company_name', value: 'PT Alliance Consumer Products Indonesia', desc: 'Official registered entity name' },
    { key: 'company_brand', value: 'Alliance World - Partnering Excellence', desc: 'Brand identity slogan' },
    { key: 'form_prefix', value: 'ACPI-HR-IT', desc: 'Mandatory standard document prefix' },
    { key: 'ticket_prefix', value: 'ACPI-IT', desc: 'Standard ticket number prefix' },
    { key: 'timezone', value: 'Asia/Jakarta (WIB)', desc: 'Application timezone' },
    { key: 'currency', value: 'IDR', desc: 'Financial currency identifier' },
    { key: 'require_head_it_close', value: 'true', desc: 'Enforce Head of IT authority for ticket closure & reopen' }
  ];
  const insertSetting = db.prepare('INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)');
  settings.forEach(s => insertSetting.run(s.key, s.value, s.desc));

  console.log('Database seeded successfully with ACPI enterprise records.');
}
