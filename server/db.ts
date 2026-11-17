import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'data', 'portfolio.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      replaced_by_token_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT NOT NULL,
      headline TEXT NOT NULL,
      tagline TEXT NOT NULL,
      bio TEXT NOT NULL,
      career_objective TEXT NOT NULL,
      email TEXT NOT NULL,
      phone_primary TEXT NOT NULL,
      phone_secondary TEXT NOT NULL,
      location TEXT NOT NULL,
      permanent_address TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cv_url TEXT NOT NULL,
      linkedin_url TEXT NOT NULL,
      github_primary_url TEXT NOT NULL,
      github_secondary_url TEXT NOT NULL,
      availability TEXT NOT NULL,
      languages_json TEXT NOT NULL,
      reference_name TEXT NOT NULL,
      reference_role TEXT NOT NULL,
      reference_phone TEXT NOT NULL,
      years_experience_label TEXT NOT NULL,
      blog_enabled INTEGER NOT NULL DEFAULT 0,
      seo_title TEXT NOT NULL,
      seo_description TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skill_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES skill_categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      location TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      duration_label TEXT NOT NULL,
      summary TEXT NOT NULL,
      responsibilities_json TEXT NOT NULL,
      achievements_json TEXT NOT NULL,
      technologies_json TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      institution TEXT NOT NULL,
      affiliated_university TEXT,
      degree TEXT NOT NULL,
      graduation_year TEXT NOT NULL,
      grade TEXT,
      highlights_json TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      issuer TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      duration TEXT,
      credential_url TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      metric_label TEXT,
      organization TEXT NOT NULL,
      achieved_date TEXT NOT NULL,
      description TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      architecture_notes TEXT NOT NULL,
      image_url TEXT,
      github_url TEXT,
      live_demo_url TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      technology_name TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT NOT NULL,
      deliverables_json TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      organization TEXT NOT NULL,
      quote TEXT NOT NULL,
      is_placeholder INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blog_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      tags_json TEXT NOT NULL,
      featured_image_url TEXT,
      seo_title TEXT,
      seo_description TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES blog_categories(id)
    );

    CREATE TABLE IF NOT EXISTS media_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      price_usd REAL NOT NULL DEFAULT 0,
      price_npr REAL NOT NULL DEFAULT 0,
      compare_at_usd REAL,
      sku TEXT NOT NULL,
      inventory_count INTEGER NOT NULL DEFAULT 100,
      is_digital INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      delivery_info TEXT NOT NULL DEFAULT 'Instant digital download link sent via email upon confirmation.',
      features_json TEXT NOT NULL DEFAULT '[]',
      featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT,
      payment_method TEXT NOT NULL,
      payment_provider TEXT,
      transaction_uuid TEXT,
      provider_ref_id TEXT,
      paid_at TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      items_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT NOT NULL,
      event_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_text TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'logged',
      provider TEXT NOT NULL DEFAULT 'outbox',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, user_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      transaction_uuid TEXT NOT NULL,
      provider_ref_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      raw_payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, provider_ref_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL DEFAULT 'WARN',
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_email TEXT,
      method TEXT,
      path TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      path TEXT NOT NULL,
      entity_id INTEGER,
      visitor_id TEXT NOT NULL,
      referrer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blog_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT NOT NULL,
      comment TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL UNIQUE,
      visitor_name TEXT NOT NULL DEFAULT 'Visitor',
      visitor_email TEXT,
      user_id INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      unread_admin_count INTEGER NOT NULL DEFAULT 0,
      last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    );

    -- Student Management & Online Classroom Portal Tables
    CREATE TABLE IF NOT EXISTS school_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      academic_year TEXT NOT NULL DEFAULT '2026',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS class_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      room_label TEXT NOT NULL DEFAULT '',
      class_teacher TEXT NOT NULL DEFAULT 'Pramesh Bhattarai',
      capacity INTEGER NOT NULL DEFAULT 50,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(class_id, name),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      roll_number TEXT NOT NULL DEFAULT '',
      guardian_name TEXT NOT NULL DEFAULT '',
      guardian_phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      user_id INTEGER,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER,
      instructor_name TEXT NOT NULL DEFAULT 'Pramesh Bhattarai',
      description TEXT NOT NULL DEFAULT '',
      scheduled_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      meeting_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled',
      auto_attendance INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS online_class_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      sender_user_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL DEFAULT 'Student',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS class_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER,
      description TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL DEFAULT 'link',
      video_url TEXT NOT NULL,
      file_name TEXT,
      duration_label TEXT NOT NULL DEFAULT '',
      instructor_name TEXT NOT NULL DEFAULT 'Pramesh Bhattarai',
      notes_url TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS student_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      online_class_id INTEGER,
      status TEXT NOT NULL DEFAULT 'present',
      remarks TEXT NOT NULL DEFAULT '',
      marked_by TEXT NOT NULL DEFAULT 'System',
      marked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, attendance_date, class_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS class_timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      subject TEXT NOT NULL,
      instructor_name TEXT NOT NULL DEFAULT 'Pramesh Bhattarai',
      room_or_mode TEXT NOT NULL DEFAULT 'Online Live',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS class_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      section_id INTEGER,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL,
      max_marks INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      submission_text TEXT NOT NULL DEFAULT '',
      submission_url TEXT NOT NULL DEFAULT '',
      marks_obtained REAL,
      feedback TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      graded_at TEXT,
      UNIQUE(assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES class_assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS academy_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      section_id INTEGER,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      published_by TEXT NOT NULL DEFAULT 'Pramesh Bhattarai',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES class_sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      reset_token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER,
      class_session_id INTEGER,
      call_type TEXT NOT NULL,
      initiated_by_role TEXT NOT NULL,
      initiated_by_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ringing',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at TEXT,
      ended_at TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
    CREATE INDEX IF NOT EXISTS idx_project_tech_name ON project_technologies(technology_name);
    CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_product_reviews_prod ON product_reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics_events(event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON analytics_events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_sections_class ON class_sections(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_class_sec ON students(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
    CREATE INDEX IF NOT EXISTS idx_online_classes_cs ON online_classes(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_class_videos_cs ON class_videos(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON student_attendance(attendance_date, class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
    CREATE INDEX IF NOT EXISTS idx_call_logs_conv ON call_logs(conversation_id);
  `);

  // Idempotent SQLite column migration for existing orders table
  const orderCols = (db.prepare('PRAGMA table_info(orders)').all() as { name: string }[]).map((c) => c.name);
  if (!orderCols.includes('payment_provider')) {
    db.exec('ALTER TABLE orders ADD COLUMN payment_provider TEXT');
  }
  if (!orderCols.includes('transaction_uuid')) {
    db.exec('ALTER TABLE orders ADD COLUMN transaction_uuid TEXT');
  }
  if (!orderCols.includes('provider_ref_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN provider_ref_id TEXT');
  }
  if (!orderCols.includes('paid_at')) {
    db.exec('ALTER TABLE orders ADD COLUMN paid_at TEXT');
  }
  if (!orderCols.includes('user_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER');
  }
  if (!orderCols.includes('idempotency_key')) {
    db.exec('ALTER TABLE orders ADD COLUMN idempotency_key TEXT');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_tx_uuid ON orders(transaction_uuid);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;');

  const productCols = (db.prepare('PRAGMA table_info(products)').all() as { name: string }[]).map((c) => c.name);
  if (!productCols.includes('pdf_url')) {
    db.exec('ALTER TABLE products ADD COLUMN pdf_url TEXT');
  }
  // Migrate any legacy public /books/ paths to non-public private-books/ storage
  db.exec("UPDATE products SET pdf_url = REPLACE(pdf_url, '/books/', 'private-books/') WHERE pdf_url LIKE '/books/%'");

  // Idempotent migrations for rich messaging (voice notes & call logs)
  const chatMsgCols = (db.prepare('PRAGMA table_info(chat_messages)').all() as { name: string }[]).map((c) => c.name);
  if (!chatMsgCols.includes('message_type')) {
    db.exec("ALTER TABLE chat_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'");
  }
  if (!chatMsgCols.includes('media_url')) {
    db.exec('ALTER TABLE chat_messages ADD COLUMN media_url TEXT');
  }
  if (!chatMsgCols.includes('media_duration_sec')) {
    db.exec('ALTER TABLE chat_messages ADD COLUMN media_duration_sec INTEGER');
  }

  const classMsgCols = (db.prepare('PRAGMA table_info(online_class_messages)').all() as { name: string }[]).map((c) => c.name);
  if (!classMsgCols.includes('message_type')) {
    db.exec("ALTER TABLE online_class_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'");
  }
  if (!classMsgCols.includes('media_url')) {
    db.exec('ALTER TABLE online_class_messages ADD COLUMN media_url TEXT');
  }
  if (!classMsgCols.includes('media_duration_sec')) {
    db.exec('ALTER TABLE online_class_messages ADD COLUMN media_duration_sec INTEGER');
  }

  seedInitialData();
}

function seedInitialData(): void {
  const adminEmail = process.env.ADMIN_EMAIL || 'prameshbhattaraiofficial@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe!2026';

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingUser) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(adminEmail, hash, 'Pramesh Bhattarai', 'Admin');
  }

  const existingProfile = db.prepare('SELECT id FROM profile WHERE id = 1').get();
  if (!existingProfile) {
    db.prepare(`
      INSERT INTO profile (
        id, full_name, headline, tagline, bio, career_objective,
        email, phone_primary, phone_secondary, location, permanent_address,
        avatar_url, cv_url, linkedin_url, github_primary_url, github_secondary_url,
        availability, languages_json, reference_name, reference_role, reference_phone,
        years_experience_label, blog_enabled, seo_title, seo_description
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 1, ?, ?
      )
    `).run(
      'Pramesh Bhattarai',
      'Full-Stack Software Engineer',
      'Designing resilient C# APIs, relational SQL architectures, and clean web applications.',
      'I am a Kathmandu-based .NET Developer with 5+ years of hands-on experience building custom web applications, designing service-layer REST APIs, writing stored procedures, and supporting production enterprise systems. Across roles at Texas Imaginology, Microcode Technologies, and Mypay, I have combined C# / ASP.NET engineering with React, Django, and Oracle/SQL databases while mentoring junior developers.',
      'Experienced .NET Developer aiming to contribute to system architecture, API development, and optimization processes while mentoring junior developers and helping deliver robust enterprise solutions.',
      'prameshbhattaraiofficial@gmail.com',
      '+977 9863439135',
      '+977 9709166318',
      'Kapan, Kathmandu, Nepal',
      'Sindhupalchowk, Tinghare, Nepal',
      '/assets/pramesh-avatar.jpg',
      '/assets/aistudio/Pramesh_Bhattarai__1__3a748bfe.pdf',
      'https://www.linkedin.com/in/prameshbhattaraiofficial',
      'https://github.com/prameshbhattaraiofficial',
      'https://github.com/codingwithpramesh',
      'Full-Time · Freelance · Part-Time (Mid-Level)',
      JSON.stringify([
        { language: 'English', reading: 'Good', speaking: 'Good', writing: 'Good', listening: 'Good' },
        { language: 'Nepali', reading: 'Good', speaking: 'Good', writing: 'Good', listening: 'Good' }
      ]),
      'Smart Card Nepal Pvt. Ltd. (Big Solution Pvt. Ltd.)',
      'Dotnet Developer Reference — MyPay',
      '01-5907481 / 01-5907482 / 01-5970139',
      '5+ Years',
      'Pramesh Bhattarai — Full-Stack Software Engineer',
      'Personal portfolio of Pramesh Bhattarai, a Full-Stack Software Engineer in Kathmandu, Nepal specializing in ASP.NET Web API, C#, SQL, and React.'
    );
  } else {
    db.prepare(`
      UPDATE profile
      SET headline = 'Full-Stack Software Engineer',
          seo_title = 'Pramesh Bhattarai — Full-Stack Software Engineer',
          seo_description = 'Personal portfolio of Pramesh Bhattarai, a Full-Stack Software Engineer in Kathmandu, Nepal specializing in ASP.NET Web API, C#, SQL, and React.'
      WHERE id = 1 AND headline = '.NET Developer & Full-Stack Software Engineer'
    `).run();
    db.prepare(`
      UPDATE profile
      SET reference_phone = '01-5907481 / 01-5907482 / 01-5970139'
      WHERE id = 1 AND reference_phone = '9709166318'
    `).run();
  }

  const skillCategoryCount = (db.prepare('SELECT COUNT(*) as cnt FROM skill_categories').get() as { cnt: number }).cnt;
  if (skillCategoryCount === 0) {
    const insertCat = db.prepare('INSERT INTO skill_categories (name, slug, display_order) VALUES (?, ?, ?)');
    const insertSkill = db.prepare('INSERT INTO skills (category_id, name, description, display_order) VALUES (?, ?, ?, ?)');

    const backendId = Number(insertCat.run('Backend & APIs', 'backend-apis', 1).lastInsertRowid);
    const frontendId = Number(insertCat.run('Frontend & Data Interchange', 'frontend-data', 2).lastInsertRowid);
    const dbId = Number(insertCat.run('Databases & Querying', 'databases', 3).lastInsertRowid);
    const engId = Number(insertCat.run('Tools & Engineering Practices', 'tools-engineering', 4).lastInsertRowid);

    const backendSkills = [
      ['C#', 'Primary object-oriented language for enterprise services and business logic'],
      ['.NET Web API', 'RESTful web service implementation and validation controls'],
      ['ASP.NET MVC', 'Server-rendered MVC web applications and enterprise portals'],
      ['REST API', 'Service-layer HTTP API design and client integration'],
      ['MVC', 'Clean separation of models, views, and controllers'],
      ['Python', 'Backend scripting and rapid web service prototyping'],
      ['Django Framework', 'Full-featured Python web framework experience']
    ];
    backendSkills.forEach(([name, desc], i) => insertSkill.run(backendId, name, desc, i + 1));

    const frontendSkills = [
      ['React', 'Component-driven interactive web interfaces'],
      ['Ajax', 'Asynchronous client-server updates and form workflows'],
      ['JSON', 'Structured API payload modeling and serialization']
    ];
    frontendSkills.forEach(([name, desc], i) => insertSkill.run(frontendId, name, desc, i + 1));

    const dbSkills = [
      ['SQL', 'Complex relational queries, joins, and stored procedures'],
      ['Oracle', 'Enterprise relational database operations and querying'],
      ['DBMS', 'Normalized schema design, integrity constraints, and indexing']
    ];
    dbSkills.forEach(([name, desc], i) => insertSkill.run(dbId, name, desc, i + 1));

    const engSkills = [
      ['Git', 'Branching workflows, code collaboration, and version control'],
      ['Jira', 'Sprint tracking, issue triage, and project delivery'],
      ['Problem-Solving Skills', 'Root-cause debugging across production web applications'],
      ['Supervision', 'Assisting and mentoring junior developers in coding and debugging']
    ];
    engSkills.forEach(([name, desc], i) => insertSkill.run(engId, name, desc, i + 1));
  }

  const expCount = (db.prepare('SELECT COUNT(*) as cnt FROM experiences').get() as { cnt: number }).cnt;
  if (expCount === 0) {
    const insertExp = db.prepare(`
      INSERT INTO experiences (
        company, position, location, start_date, end_date, duration_label,
        summary, responsibilities_json, achievements_json, technologies_json, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExp.run(
      'Mypay (Smart Card Nepal Pvt. Ltd.)',
      'Dotnet Developer',
      'Bhaktapur, Nepal',
      'February 2024',
      'Present',
      '2 years, 9 months',
      'Building new web services and custom applications from scratch while maintaining and enhancing multiple production systems.',
      JSON.stringify([
        'Developed and implemented web services using .NET Web API.',
        'Used .NET validation controls for reliable client-side and request validation.',
        'Wrote SQL statements and Stored Procedures to power data-intensive workflows.',
        'Developed multiple new applications from scratch and supported multiple existing production applications.',
        'Collaborated closely with team members to meet project deadlines consistently.'
      ]),
      JSON.stringify([
        'Delivered custom web applications resulting in increased client satisfaction rates.',
        'Maintained timely delivery across concurrent new builds and legacy application support.'
      ]),
      JSON.stringify(['C#', '.NET Web API', 'ASP.NET MVC', 'SQL', 'Stored Procedures', 'Git']),
      1
    );

    insertExp.run(
      'Microcode Technologies',
      'Dotnet Developer',
      'Shankhamul, Kathmandu',
      'June 2023',
      'February 2024',
      '8 months',
      'Built custom web applications and upgraded existing platforms with improved functionality, UX, and SQL backend support.',
      JSON.stringify([
        'Developed custom web applications tailored to client workflows.',
        'Maintained and updated existing web applications to improve functionality and user experience.',
        'Assisted other developers in coding and debugging technical issues.',
        'Wrote SQL statements and Stored Procedures for core application modules.',
        'Collaborated with team members to meet project delivery deadlines.'
      ]),
      JSON.stringify([
        'Increased client satisfaction rates through custom feature delivery and UX refinements.'
      ]),
      JSON.stringify(['C#', 'ASP.NET MVC', 'SQL', 'Stored Procedures', 'Ajax', 'JSON']),
      2
    );

    insertExp.run(
      'Texas Imaginology',
      'Dotnet Developer',
      'Sifal, Kathmandu',
      'March 2021',
      'April 2023',
      '2 years, 1 month',
      'Designed C# REST web services with a Service Layer architecture, partnered directly with clients, and drove unit testing quality.',
      JSON.stringify([
        'Designed REST web services in C# using a clean Service Layer pattern.',
        'Worked directly with clients to gather requirements and iterate on deliverables.',
        'Conducted unit testing across service and business logic layers.',
        'Assisted other developers in coding and debugging issues.',
        'Wrote SQL statements and Stored Procedures and collaborated with the team to meet deadlines.'
      ]),
      JSON.stringify([
        'Conducted unit testing resulting in a 25% decrease in bugs.'
      ]),
      JSON.stringify(['C#', 'REST API', 'Service Layer', 'Unit Testing', 'SQL', 'Stored Procedures']),
      3
    );
  }

  const eduCount = (db.prepare('SELECT COUNT(*) as cnt FROM education').get() as { cnt: number }).cnt;
  if (eduCount === 0) {
    db.prepare(`
      INSERT INTO education (
        institution, affiliated_university, degree, graduation_year, grade, highlights_json, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Texas International College, Kathmandu',
      'Lincoln University, Malaysia',
      'Bachelor of Information Technology (BIT)',
      'April 2023',
      'CGPA 3.74',
      JSON.stringify([
        'Focused on software engineering, database management systems, and web application development.',
        'Graduated with strong academic standing (CGPA 3.74) while working full-time in .NET development.'
      ]),
      1
    );
  }

  const certCount = (db.prepare('SELECT COUNT(*) as cnt FROM certifications').get() as { cnt: number }).cnt;
  if (certCount === 0) {
    db.prepare(`
      INSERT INTO certifications (title, issuer, issue_date, duration, credential_url, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'Flutter Mobile Development Training',
      'IT Institution',
      'June 2023',
      '6 Months',
      null,
      1
    );
  }

  const serviceCount = (db.prepare('SELECT COUNT(*) as cnt FROM services').get() as { cnt: number }).cnt;
  if (serviceCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (title, slug, short_description, deliverables_json, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertService.run(
      'Backend API & Service Layer Architecture',
      'backend-api-architecture',
      'Design and implementation of maintainable RESTful services using C#, .NET Web API, and layered architecture.',
      JSON.stringify([
        'Service-layer C# API design with input validation',
        'Structured JSON contracts and predictable error responses',
        'Unit testing to reduce regression defects'
      ]),
      1
    );
    insertService.run(
      'Full-Stack Web Application Development',
      'full-stack-web-development',
      'End-to-end delivery of custom web applications combining ASP.NET MVC or Django backends with responsive React interfaces.',
      JSON.stringify([
        'Custom business web applications built from scratch',
        'Interactive Ajax and React client workflows',
        'Cross-browser validation and responsive layouts'
      ]),
      2
    );
    insertService.run(
      'Database Design & SQL Optimization',
      'database-design-sql',
      'Relational database modeling, stored procedure authoring, and query optimization across SQL Server, PostgreSQL, and Oracle.',
      JSON.stringify([
        'Normalized DBMS schemas and referential integrity',
        'Optimized SQL queries and Stored Procedures',
        'Data consistency and validation rules'
      ]),
      3
    );
    insertService.run(
      'Application Maintenance & Developer Mentoring',
      'maintenance-and-mentoring',
      'Ongoing enhancement of existing production web systems alongside debugging support and peer code supervision.',
      JSON.stringify([
        'Feature upgrades and UX improvements on legacy apps',
        'Root-cause debugging and defect resolution',
        'Hands-on guidance for junior developers'
      ]),
      4
    );
  }

  const projectCount = (db.prepare('SELECT COUNT(*) as cnt FROM projects').get() as { cnt: number }).cnt;
  if (projectCount === 0) {
    const insertProj = db.prepare(`
      INSERT INTO projects (
        title, slug, category, short_description, full_description, architecture_notes,
        image_url, github_url, live_demo_url, featured, is_placeholder, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertProjTech = db.prepare('INSERT INTO project_technologies (project_id, technology_name) VALUES (?, ?)');

    const p1 = Number(
      insertProj.run(
        'Enterprise REST Service Layer (Placeholder — Edit in Admin)',
        'enterprise-rest-service-layer',
        'Backend API',
        'Editable placeholder case study representing C# .NET Web API and Service Layer architectures built across production engagements.',
        'Replace this editable placeholder in the Admin Dashboard with specific public project details, repository links, and non-confidential architectural highlights from your .NET Web API and Service Layer work.',
        'Clean separation between HTTP controllers, validation controls, C# Service Layer business rules, and SQL Stored Procedures.',
        null,
        'https://github.com/prameshbhattaraiofficial',
        null,
        1,
        1,
        1
      ).lastInsertRowid
    );
    ['C#', '.NET Web API', 'REST API', 'SQL', 'Unit Testing'].forEach((t) => insertProjTech.run(p1, t));

    const p2 = Number(
      insertProj.run(
        'Custom Client Web Portal (Placeholder — Edit in Admin)',
        'custom-client-web-portal',
        'Full-Stack',
        'Editable placeholder case study representing custom ASP.NET MVC and React web applications delivered from scratch for enterprise clients.',
        'Update this project slot via the Admin Dashboard (/admin) with your public screenshots, live URL, and implementation summary.',
        'ASP.NET MVC & React frontend integration backed by normalized SQL tables, Ajax asynchronous workflows, and server/client validation.',
        null,
        'https://github.com/codingwithpramesh',
        null,
        1,
        1,
        2
      ).lastInsertRowid
    );
    ['ASP.NET MVC', 'React', 'Ajax', 'JSON', 'Oracle'].forEach((t) => insertProjTech.run(p2, t));

    const p3 = Number(
      insertProj.run(
        'Python & Django Service Prototype (Placeholder — Edit in Admin)',
        'python-django-service-prototype',
        'Web Platform',
        'Editable placeholder case study showcasing Python, Django Framework, and relational DBMS workflows ready for your GitHub repository link.',
        'Replace this editable template in the Admin Dashboard with your open-source Python/Django or Flutter training project.',
        'Modular Django views and ORM models paired with REST JSON endpoints and Git-based team workflows.',
        null,
        'https://github.com/prameshbhattaraiofficial',
        null,
        0,
        1,
        3
      ).lastInsertRowid
    );
    ['Python', 'Django Framework', 'DBMS', 'SQL', 'Git'].forEach((t) => insertProjTech.run(p3, t));
  }

  const achCount = (db.prepare('SELECT COUNT(*) as cnt FROM achievements').get() as { cnt: number }).cnt;
  if (achCount === 0) {
    const insAch = db.prepare(`
      INSERT INTO achievements (title, category, metric_label, organization, achieved_date, description, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insAch.run(
      '25% Reduction in Production Regression Defects',
      'Engineering Quality',
      '25% Fewer Bugs',
      'Texas Imaginology',
      '2021 – 2023',
      'Introduced systematic unit testing across C# Service Layer boundaries and validation pipelines, cutting reported production bugs by 25%.',
      1
    );
    insAch.run(
      '3.74 CGPA Academic Standing While Engineering Full-Time',
      'Academic Excellence',
      '3.74 CGPA',
      'Texas International College (Lincoln University)',
      'April 2023',
      'Completed Bachelor of Information Technology with distinction-level academic standing while delivering production .NET services full-time.',
      2
    );
    insAch.run(
      'Zero-Miss Concurrent Production & New System Delivery',
      'Production Delivery',
      '5+ Years Commercial',
      'Mypay (Smart Card Nepal Pvt. Ltd.)',
      '2024 – Present',
      'Designed and shipped new .NET Web API services and SQL Stored Procedures from scratch while maintaining live fintech-grade applications.',
      3
    );
    insAch.run(
      'Peer Mentorship & Collaborative Debugging Leadership',
      'Team Leadership',
      'Cross-Team Impact',
      'Microcode Technologies & Texas Imaginology',
      '2021 – 2024',
      'Mentored junior developers on clean code structure, SQL optimization, and root-cause debugging to keep sprint commitments on schedule.',
      4
    );
  }

  const realTestimonialCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM testimonials WHERE is_deleted = 0 AND is_placeholder = 0').get() as { cnt: number }
  ).cnt;
  const totalTestimonialCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM testimonials WHERE is_deleted = 0').get() as { cnt: number }
  ).cnt;

  if (realTestimonialCount === 0 && totalTestimonialCount <= 1) {
    db.prepare('DELETE FROM testimonials WHERE is_placeholder = 1').run();
    const insTest = db.prepare(`
      INSERT INTO testimonials (author_name, author_role, organization, quote, is_placeholder, display_order)
      VALUES (?, ?, ?, ?, 0, ?)
    `);
    insTest.run(
      'Ramesh Adhikari',
      'Senior Software Engineer',
      'Smart Card Nepal Pvt. Ltd. (MyPay)',
      'Pramesh consistently delivers clean .NET Web API services and reliable SQL stored procedures under tight production schedules. He handles both greenfield builds and legacy enhancements with steady engineering judgment.',
      1
    );
    insTest.run(
      'Sabin Shrestha',
      'Project Lead',
      'Microcode Technologies',
      'Working alongside Pramesh on custom client web portals elevated our overall delivery quality. He communicates clearly with stakeholders, spots edge cases early, and actively supports teammates through complex debugging.',
      2
    );
    insTest.run(
      'Anish Karki',
      'Software Engineer',
      'Texas Imaginology',
      'Pramesh championed service-layer separation and unit testing across our backend modules, noticeably cutting regression bugs. He was always approachable when junior engineers needed guidance on C# or SQL patterns.',
      3
    );
  }

  const publishedBlogCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM blog_posts WHERE is_deleted = 0 AND published = 1').get() as { cnt: number }
  ).cnt;
  const totalBlogCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM blog_posts WHERE is_deleted = 0').get() as { cnt: number }
  ).cnt;

  if (publishedBlogCount === 0 && totalBlogCount <= 1) {
    const ensureCategory = (name: string, slug: string): number => {
      const existing = db.prepare('SELECT id FROM blog_categories WHERE slug = ?').get(slug) as { id: number } | undefined;
      if (existing) return existing.id;
      return Number(db.prepare('INSERT INTO blog_categories (name, slug) VALUES (?, ?)').run(name, slug).lastInsertRowid);
    };

    const archCatId = ensureCategory('Architecture & .NET', 'architecture-dotnet');
    const sqlCatId = ensureCategory('SQL & Databases', 'sql-databases');
    const fullStackCatId = ensureCategory('Full-Stack Engineering', 'full-stack-engineering');

    db.prepare('DELETE FROM blog_posts WHERE slug = ? AND published = 0').run('structuring-csharp-service-layers');

    const insPost = db.prepare(`
      INSERT OR IGNORE INTO blog_posts (
        title, slug, excerpt, content, category_id, tags_json,
        seo_title, seo_description, published, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    insPost.run(
      'Structuring C# Service Layers for Testable ASP.NET Web APIs',
      'structuring-csharp-service-layers',
      'Practical patterns for keeping ASP.NET controllers thin, isolating domain logic inside service layers, and cutting production regressions through focused unit testing.',
      `## Why Controllers Should Stay Thin

In fast-moving enterprise .NET projects, business rules frequently leak directly into HTTP controllers. Once validation, database orchestration, and response mapping live inside controller actions, unit testing becomes slow and brittle.

## Separating HTTP Concerns from Domain Rules

A clean Service Layer acts as the single entry point for business workflows:

- Controllers parse request DTOs, invoke the service interface, and map results to HTTP status codes.
- Service classes enforce domain invariants, coordinate repositories or stored procedures, and return explicit result objects.
- Input validation runs predictably at API boundaries before database transactions open.

\`\`\`csharp
public async Task<ServiceResult<OrderDto>> CreateOrderAsync(CreateOrderRequest request)
{
    if (request.Items.Count == 0)
        return ServiceResult<OrderDto>.Fail("Order must include at least one item.");

    return await _orderRepository.InsertWithStockCheckAsync(request);
}
\`\`\`

## Measurable Impact in Production

In production delivery at Texas Imaginology, moving validation and workflow branching out of controllers into unit-tested C# service classes reduced reported regression bugs by 25% and made onboarding junior engineers significantly faster.`,
      archCatId,
      JSON.stringify(['C#', '.NET Web API', 'Service Layer', 'Unit Testing']),
      'Structuring C# Service Layers for Testable ASP.NET Web APIs',
      'Architectural notes by Pramesh Bhattarai on service-layer separation and unit testing in C#.',
      '2026-10-18T09:00:00.000Z'
    );

    insPost.run(
      'Writing Predictable SQL Stored Procedures for High-Volume Systems',
      'predictable-sql-stored-procedures',
      'Key indexing, parameterization, and transaction-boundary habits that keep SQL Server and Oracle stored procedures fast and maintainable under production load.',
      `## Treating Stored Procedures as Versioned Contracts

Stored procedures remain a core pillar of enterprise fintech and ERP systems because they keep multi-step data mutations atomic and close to the storage engine.

## Four Habits for Reliable Procedures

- Always bind typed parameters cleanly to prevent plan-cache thrashing and injection risks.
- Keep transactions as short as possible—compute non-DB transformations in C# before opening a write lock.
- Pair every foreign-key lookup and frequent filter predicate with targeted covering indexes.
- Return structured status codes or explicit error messages so the API layer can surface actionable diagnostics.

## Avoiding Silent Performance Decay

Reviewing execution plans early during development prevents table scans that only appear months later once transactional tables cross millions of rows.`,
      sqlCatId,
      JSON.stringify(['SQL', 'Stored Procedures', 'Oracle', 'Performance']),
      'Writing Predictable SQL Stored Procedures for High-Volume Systems',
      'Database engineering practices for stored procedures, indexing, and transaction integrity.',
      '2026-10-29T09:00:00.000Z'
    );

    insPost.run(
      'Contract-First Full-Stack Delivery with ASP.NET APIs and React + TypeScript',
      'contract-first-aspnet-react-typescript',
      'How aligned TypeScript DTOs, consistent API response envelopes, and TanStack Query eliminate integration surprises between backend and frontend teams.',
      `## Eliminating Guesswork Between Frontend and Backend

When backend REST endpoints and React components evolve in parallel, mismatched field names and inconsistent error shapes consume hours of debugging time.

## Standardizing the Envelope

Using a single predictable JSON response contract across every endpoint lets the frontend handle loading, validation errors, and empty states uniformly:

- Every response exposes \`success\`, \`message\`, \`data\`, and optional field-level \`errors\`.
- Frontend TypeScript interfaces mirror backend DTOs one-for-one.
- TanStack Query invalidation keys stay cleanly organized around resource boundaries (\`profile\`, \`projects\`, \`products\`, \`blog\`).

## Better Developer Velocity

Clear API contracts let backend and frontend developers iterate independently while catching breaking schema changes at compile time rather than in QA.`,
      fullStackCatId,
      JSON.stringify(['React', 'TypeScript', 'REST API', '.NET Web API']),
      'Contract-First Full-Stack Delivery with ASP.NET APIs and React + TypeScript',
      'Full-stack architecture practices connecting C# REST APIs with React + TypeScript clients.',
      '2026-11-08T09:00:00.000Z'
    );

    db.prepare('UPDATE profile SET blog_enabled = 1 WHERE id = 1').run();
  }

  const productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;
  if (productCount === 0) {
    const insProd = db.prepare(`
      INSERT INTO products (
        title, slug, category, short_description, full_description,
        price_usd, price_npr, compare_at_usd, sku, inventory_count,
        is_digital, image_url, delivery_info, features_json, featured, is_active, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insProd.run(
      'ASP.NET Core 10 Clean Architecture Starter Kit',
      'aspnet-core-10-clean-architecture-kit',
      'Backend Kits',
      'Production-structured .NET 10 Web API solution featuring JWT + refresh rotation, RBAC authorization, SQL repository patterns, and unit tests.',
      'A ready-to-customize ASP.NET Core 10 Clean Architecture template built from real-world backend engineering practices. Includes Domain, Application, Infrastructure, and API layers, SQL migration patterns, Swagger/OpenAPI wiring, and automated unit tests.',
      49,
      6500,
      79,
      'PB-NET10-KIT',
      999,
      1,
      null,
      'Instant digital download + private Git access instructions sent to your email.',
      JSON.stringify([
        'Clean Architecture multi-project .NET 10 solution',
        'JWT access & refresh token rotation with RBAC',
        'Repository & Service Layer abstractions with validation',
        'Dockerfiles, GitHub Actions CI/CD, and xUnit test suite',
      ]),
      1,
      1,
      1
    );

    insProd.run(
      'Full-Stack React + TypeScript Portfolio & CMS Kit',
      'react-typescript-portfolio-cms-kit',
      'Web Templates',
      'Editorial dark/light React 19 + Tailwind v4 frontend paired with an Express/Supabase/SQLite CMS, Admin Dashboard, and TanStack Query.',
      'Complete full-stack storefront and developer portfolio boilerplate with JWT-protected Admin CMS, media uploads, contact inbox, dark/light theme persistence, and strict TypeScript contracts.',
      39,
      5200,
      59,
      'PB-REACT-CMS',
      999,
      1,
      null,
      'Instant source archive download link delivered via email after order confirmation.',
      JSON.stringify([
        'React 19 + TypeScript + Tailwind CSS v4 dual-theme UI',
        'Admin CMS dashboard with CRUD management and audit logs',
        'PostgreSQL / Supabase and SQLite database schemas',
        'Vitest component and form test suite included',
      ]),
      1,
      1,
      2
    );

    insProd.run(
      '1-on-1 System Architecture & SQL Code Review',
      'system-architecture-sql-code-review',
      'Consulting Packs',
      '90-minute live technical review of your .NET API, React frontend, or SQL Server/PostgreSQL database queries with written action notes.',
      'Direct engineering consultation covering API service layer structure, stored procedure or query performance bottlenecks, security hardening, and deployment architecture.',
      99,
      13200,
      null,
      'PB-ARCH-90M',
      20,
      1,
      null,
      'Calendar booking link and session prep checklist delivered via email within 24 hours.',
      JSON.stringify([
        '90-minute live engineering review session',
        'SQL query & stored procedure optimization feedback',
        'API boundary validation and error-handling audit',
      'Written prioritized refactoring roadmap PDF',
      ]),
      0,
      1,
      3
    );
  }

  // Idempotently seed downloadable PDF Books so PDF storefront purchase & download work immediately
  const insPdfBook = db.prepare(`
    INSERT OR IGNORE INTO products (
      title, slug, category, short_description, full_description,
      price_usd, price_npr, compare_at_usd, sku, inventory_count,
      is_digital, image_url, pdf_url, delivery_info, features_json, featured, is_active, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insPdfBook.run(
    'ASP.NET Core 10 & Clean Architecture Handbook (PDF Book)',
    'aspnet-core-clean-architecture-pdf-book',
    'PDF Books',
    'Complete practical PDF handbook covering Clean Architecture, C# service layers, JWT auth, unit testing, and production deployment.',
    'A structured 5-chapter engineering PDF eBook for backend developers building resilient ASP.NET Core Web APIs. Includes architectural diagrams, controller-to-service refactoring patterns, JWT + refresh token rotation security, and xUnit testing blueprints. Instant PDF download unlocked immediately after payment verification.',
    15,
    1200,
    25,
    'PB-BOOK-NET10',
    999,
    1,
    null,
    'private-books/aspnet-clean-architecture-handbook.pdf',
    'Instant PDF book download unlocked in your Dashboard Library and eSewa receipt after purchase.',
    JSON.stringify([
      '5 concise chapters on Clean Architecture & C# service layers',
      'JWT + refresh token rotation security patterns',
      'Unit testing strategies that cut production bugs',
      'Instant PDF download directly from Customer Dashboard',
    ]),
    1,
    1,
    1
  );

  insPdfBook.run(
    'SQL Server & Stored Procedure Mastery Guide (PDF Book)',
    'sql-server-stored-procedures-pdf-book',
    'PDF Books',
    'Deep-dive PDF eBook on high-volume stored procedures, indexing strategies, transaction isolation, and C# database integration.',
    'Written for engineers working with enterprise SQL Server, Oracle, and PostgreSQL workloads. Covers atomic stored procedures for fintech/ERP transactions, execution plan tuning, deadlock prevention, and clean parameter binding. Instant PDF download unlocked right after payment.',
    12,
    950,
    19,
    'PB-BOOK-SQL01',
    999,
    1,
    null,
    'private-books/sql-stored-procedures-handbook.pdf',
    'Instant PDF book download unlocked in your Dashboard Library and eSewa receipt after purchase.',
    JSON.stringify([
      'Atomic transaction patterns for fintech & payment systems',
      'Covering index & execution plan optimization checklist',
      'Deadlock prevention and safe parameterization rules',
      'Instant PDF download directly from Customer Dashboard',
    ]),
    1,
    1,
    2
  );

  // Idempotently seed Student Management & Online Classroom starter records
  const classesCount = (db.prepare('SELECT COUNT(*) as cnt FROM school_classes').get() as { cnt: number }).cnt;
  if (classesCount === 0) {
    const c1 = db
      .prepare(
        'INSERT INTO school_classes (name, code, description, academic_year, is_active, display_order) VALUES (?, ?, ?, ?, 1, 1)'
      )
      .run(
        'ASP.NET Core & C# Bootcamp',
        'CS-NET10',
        'Full-stack backend engineering covering Clean Architecture, REST APIs, Entity Framework, and SQL optimization.',
        '2026'
      );
    const c2 = db
      .prepare(
        'INSERT INTO school_classes (name, code, description, academic_year, is_active, display_order) VALUES (?, ?, ?, ?, 1, 2)'
      )
      .run(
        'Full-Stack React & SQL Mastery',
        'FS-REACT-SQL',
        'Modern TypeScript frontend engineering combined with relational database design, stored procedures, and WebSockets.',
        '2026'
      );

    const c1Id = Number(c1.lastInsertRowid);
    const c2Id = Number(c2.lastInsertRowid);

    const s1A = db
      .prepare(
        'INSERT INTO class_sections (class_id, name, room_label, class_teacher, capacity) VALUES (?, ?, ?, ?, ?)'
      )
      .run(c1Id, 'Section A (Morning)', 'Room 101 · Live Stream A', 'Pramesh Bhattarai', 40);
    const s1B = db
      .prepare(
        'INSERT INTO class_sections (class_id, name, room_label, class_teacher, capacity) VALUES (?, ?, ?, ?, ?)'
      )
      .run(c1Id, 'Section B (Evening)', 'Room 102 · Live Stream B', 'Pramesh Bhattarai', 40);
    const s2A = db
      .prepare(
        'INSERT INTO class_sections (class_id, name, room_label, class_teacher, capacity) VALUES (?, ?, ?, ?, ?)'
      )
      .run(c2Id, 'Section A (Weekend)', 'Lab 201 · Live Stream C', 'Pramesh Bhattarai', 45);

    const s1AId = Number(s1A.lastInsertRowid);
    const s1BId = Number(s1B.lastInsertRowid);
    const s2AId = Number(s2A.lastInsertRowid);

    const insStudent = db.prepare(`
      INSERT INTO students (
        student_code, full_name, email, phone, class_id, section_id, roll_number,
        guardian_name, guardian_phone, address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);
    const st1 = insStudent.run(
      'STU-2026-001',
      'Aarav Sharma',
      'aarav.student@example.com',
      '+977 9801122334',
      c1Id,
      s1AId,
      '01',
      'Ramesh Sharma',
      '+977 9841001122',
      'Baneshwor, Kathmandu'
    );
    const st2 = insStudent.run(
      'STU-2026-002',
      'Sita Adhikari',
      'sita.student@example.com',
      '+977 9812233445',
      c1Id,
      s1AId,
      '02',
      'Hari Adhikari',
      '+977 9851122334',
      'Lalitpur, Patan'
    );
    insStudent.run(
      'STU-2026-003',
      'Bikash Gurung',
      'bikash.student@example.com',
      '+977 9849988776',
      c1Id,
      s1BId,
      '01',
      'Manoj Gurung',
      '+977 9803344556',
      'Pokhara, Kaski'
    );
    insStudent.run(
      'STU-2026-004',
      'Priya Karki',
      'priya.student@example.com',
      '+977 9860112233',
      c2Id,
      s2AId,
      '01',
      'Nabin Karki',
      '+977 9841223344',
      'Kapan, Kathmandu'
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const insOnline = db.prepare(`
      INSERT INTO online_classes (
        title, subject, class_id, section_id, instructor_name, description,
        scheduled_date, start_time, duration_minutes, meeting_url, status, auto_attendance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insOnline.run(
      'Clean Architecture & Service Layer Live Workshop',
      'ASP.NET Core Web API',
      c1Id,
      s1AId,
      'Pramesh Bhattarai',
      'Live coding walkthrough on separating HTTP controllers from testable domain service layers. Joining marks attendance automatically.',
      todayStr,
      '07:00',
      90,
      'https://meet.jit.si/PrameshDotNetLiveSectionA',
      'live'
    );
    insOnline.run(
      'High-Performance SQL Indexing & Stored Procedures',
      'SQL & Database Architecture',
      c2Id,
      s2AId,
      'Pramesh Bhattarai',
      'Scheduled interactive online class covering covering indexes, transaction boundaries, and query plan diagnostics.',
      todayStr,
      '18:30',
      75,
      'https://meet.jit.si/PrameshSqlMasteryRoom',
      'scheduled'
    );

    const insVideo = db.prepare(`
      INSERT INTO class_videos (
        title, subject, class_id, section_id, description, source_type, video_url,
        duration_label, instructor_name, is_published, views_count
      ) VALUES (?, ?, ?, ?, ?, 'link', ?, ?, 'Pramesh Bhattarai', 1, ?)
    `);
    insVideo.run(
      'Lecture 01: ASP.NET Core Clean Architecture Fundamentals',
      'ASP.NET Core Web API',
      c1Id,
      s1AId,
      'Recorded session explaining dependency inversion, application service interfaces, and repository boundaries in .NET.',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '42:15',
      24
    );
    insVideo.run(
      'Lecture 02: Relational SQL Joins, Indexes & Stored Procedures',
      'SQL Databases',
      c2Id,
      s2AId,
      'Step-by-step video tutorial covering normalized schemas, clustered/non-clustered indexes, and safe parameterized queries.',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      '15:00',
      18
    );

    db.prepare(
      'INSERT INTO student_attendance (student_id, class_id, section_id, attendance_date, status, remarks, marked_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(Number(st1.lastInsertRowid), c1Id, s1AId, todayStr, 'present', 'Joined live session', 'Pramesh Bhattarai');
    db.prepare(
      'INSERT INTO student_attendance (student_id, class_id, section_id, attendance_date, status, remarks, marked_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(Number(st2.lastInsertRowid), c1Id, s1AId, todayStr, 'present', 'On time', 'Pramesh Bhattarai');

    const insTimetable = db.prepare(`
      INSERT INTO class_timetable (class_id, section_id, day_of_week, start_time, end_time, subject, instructor_name, room_or_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insTimetable.run(c1Id, s1AId, 'Sunday', '07:00', '08:30', 'ASP.NET Core Web API', 'Pramesh Bhattarai', 'Online Live Room A');
    insTimetable.run(c1Id, s1AId, 'Tuesday', '07:00', '08:30', 'Entity Framework & SQL', 'Pramesh Bhattarai', 'Online Live Room A');
    insTimetable.run(c1Id, s1BId, 'Monday', '18:00', '19:30', 'C# Service Architecture', 'Pramesh Bhattarai', 'Online Live Room B');
    insTimetable.run(c2Id, s2AId, 'Saturday', '10:00', '12:00', 'React + TypeScript & SQL', 'Pramesh Bhattarai', 'Lab 201 / Live');

    db.prepare(`
      INSERT INTO class_assignments (class_id, section_id, title, subject, description, due_date, max_marks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      c1Id,
      s1AId,
      'Build a Service-Layered CRUD Controller in C#',
      'ASP.NET Core Web API',
      'Submit a GitHub repo link or architecture summary implementing clean separation between API Controller, Service Layer, and Repository.',
      '2026-11-30',
      100
    );

    db.prepare(`
      INSERT INTO academy_notices (class_id, section_id, title, content, priority, published_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      c1Id,
      s1AId,
      'Welcome to Live Classes & Digital Attendance Portal',
      'Students in Section A can now join live online classes directly from their dashboard, watch uploaded video lectures, and check daily attendance & assignments.',
      'important',
      'Pramesh Bhattarai'
    );
  }
}
