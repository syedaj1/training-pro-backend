import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, getConnection, createDatabaseIfNotExists, initializeDatabase } from './connection';

async function seed() {
  console.log('🌱 Seeding database...\n');
  
  // Create database if not exists
  await createDatabaseIfNotExists();
  
  // Initialize database schema
  await initializeDatabase();
  
  // Check if already seeded
  const existingUsers = await queryOne('SELECT COUNT(*) as count FROM users') as { count: number } | null;
  if (existingUsers && existingUsers.count > 0) {
    console.log('⚠️  Database already seeded. Skipping...');
    console.log('');
    console.log('To re-seed, run:');
    console.log('  TRUNCATE TABLE users;');
    console.log('  npm run db:seed');
    return;
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Insert default admin user
  await query(`
    INSERT INTO users (id, email, password, name, role, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    '1',
    'admin@training.com',
    hashedPassword,
    'Administrator',
    'admin',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  ]);
  
  // Insert sample trainers
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  
  await query(`
    INSERT INTO users (id, email, password, name, role, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    '2',
    'trainer1@training.com',
    trainerPassword,
    'John Smith',
    'trainer',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
  ]);
  
  await query(`
    INSERT INTO users (id, email, password, name, role, avatar, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [
    '3',
    'trainer2@training.com',
    trainerPassword,
    'Sarah Johnson',
    'trainer',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
  ]);
  
  // Insert sample learners
  const learnerPassword = await bcrypt.hash('learner123', 10);
  
  const learners = [
    { id: '4', name: 'Michael Brown', email: 'learner1@training.com', seed: 'michael' },
    { id: '5', name: 'Emily Davis', email: 'learner2@training.com', seed: 'emily' },
    { id: '6', name: 'David Wilson', email: 'learner3@training.com', seed: 'david' },
    { id: '7', name: 'Lisa Anderson', email: 'learner4@training.com', seed: 'lisa' },
  ];
  
  for (const learner of learners) {
    await query(`
      INSERT INTO users (id, email, password, name, role, avatar, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      learner.id,
      learner.email,
      learnerPassword,
      learner.name,
      'learner',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${learner.seed}`
    ]);
  }
  
  // Insert sample courses
  const courses = [
    {
      id: '1',
      title: 'Introduction to Project Management',
      description: 'Learn the fundamentals of project management including planning, execution, and monitoring.',
      duration: 16,
      category: 'Management',
      course_type: 'in-class',
      created_by: '1'
    },
    {
      id: '2',
      title: 'Advanced Data Analytics',
      description: 'Master data analysis techniques using Python, SQL, and visualization tools.',
      duration: 24,
      category: 'Technology',
      course_type: 'virtual',
      zoom_meeting_id: '123 456 7890',
      zoom_link: 'https://zoom.us/j/1234567890',
      created_by: '1'
    },
    {
      id: '3',
      title: 'Leadership and Communication Skills',
      description: 'Develop essential leadership qualities and effective communication strategies.',
      duration: 12,
      category: 'Soft Skills',
      course_type: 'in-class',
      created_by: '1'
    },
    {
      id: '4',
      title: 'Cybersecurity Fundamentals',
      description: 'Understand the basics of cybersecurity, threats, and protection mechanisms.',
      duration: 20,
      category: 'Technology',
      course_type: 'virtual',
      zoom_meeting_id: '987 654 3210',
      zoom_link: 'https://zoom.us/j/9876543210',
      created_by: '1'
    },
    {
      id: '5',
      title: 'Customer Service Excellence',
      description: 'Learn techniques for delivering outstanding customer service experiences.',
      duration: 8,
      category: 'Customer Service',
      course_type: 'in-class',
      created_by: '1'
    },
    {
      id: 'el1',
      title: 'Introduction to Python Programming',
      description: 'Learn Python programming from scratch with interactive exercises',
      duration: 8,
      category: 'Technology',
      course_type: 'elearning',
      status: 'published',
      created_by: '1'
    },
    {
      id: 'el2',
      title: 'Agile Fundamentals',
      description: 'Understanding Agile methodology and Scrum framework',
      duration: 4,
      category: 'Management',
      course_type: 'elearning',
      status: 'published',
      created_by: '2'
    },
    {
      id: 'el3',
      title: 'Data Visualization with Tableau',
      description: 'Create stunning visualizations and dashboards',
      duration: 6,
      category: 'Technology',
      course_type: 'elearning',
      status: 'draft',
      created_by: '3'
    }
  ];
  
  for (const course of courses) {
    await query(`
      INSERT INTO courses (id, title, description, duration, category, course_type, status, zoom_meeting_id, zoom_link, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      course.id,
      course.title,
      course.description,
      course.duration,
      course.category,
      course.course_type,
      course.status || null,
      course.zoom_meeting_id || null,
      course.zoom_link || null,
      course.created_by
    ]);
  }
  
  // Insert sample schedules
  const schedules = [
    {
      id: '1',
      course_id: '1',
      title: 'Project Management - Batch 1',
      schedule_type: 'batch',
      start_date: '2024-02-01',
      end_date: '2024-02-15',
      start_time: '09:00:00',
      end_time: '17:00:00',
      trainer_id: '2',
      location: 'Training Room A',
      max_learners: 20,
      status: 'completed',
      session_mode: 'face-to-face',
      batch_number: 1
    },
    {
      id: '2',
      course_id: '1',
      title: 'Project Management - Batch 2',
      schedule_type: 'batch',
      start_date: '2024-03-01',
      end_date: '2024-03-15',
      start_time: '09:00:00',
      end_time: '17:00:00',
      trainer_id: '2',
      location: 'Training Room A',
      max_learners: 20,
      status: 'ongoing',
      session_mode: 'face-to-face',
      batch_number: 2
    },
    {
      id: '3',
      course_id: '2',
      title: 'Data Analytics - March Session',
      schedule_type: 'multi-day',
      start_date: '2024-03-05',
      end_date: '2024-03-08',
      start_time: '10:00:00',
      end_time: '16:00:00',
      trainer_id: '3',
      location: 'Virtual',
      max_learners: 15,
      status: 'upcoming',
      session_mode: 'virtual',
      zoom_link: 'https://zoom.us/j/1234567890',
      zoom_meeting_id: '123 456 7890'
    },
    {
      id: '4',
      course_id: '3',
      title: 'Leadership Workshop',
      schedule_type: 'single',
      start_date: '2024-03-10',
      end_date: '2024-03-10',
      start_time: '09:00:00',
      end_time: '17:00:00',
      trainer_id: '2',
      location: 'Conference Room B',
      max_learners: 25,
      status: 'upcoming',
      session_mode: 'face-to-face'
    },
    {
      id: '5',
      course_id: '4',
      title: 'Cybersecurity - Batch 1',
      schedule_type: 'batch',
      start_date: '2024-02-20',
      end_date: '2024-03-05',
      start_time: '14:00:00',
      end_time: '18:00:00',
      trainer_id: '3',
      location: 'Virtual',
      max_learners: 12,
      status: 'ongoing',
      session_mode: 'virtual',
      zoom_link: 'https://zoom.us/j/9876543210',
      zoom_meeting_id: '987 654 3210',
      batch_number: 1
    }
  ];
  
  for (const schedule of schedules) {
    await query(`
      INSERT INTO schedules (id, course_id, title, schedule_type, start_date, end_date, start_time, end_time, trainer_id, location, max_learners, status, session_mode, zoom_link, zoom_meeting_id, batch_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      schedule.id,
      schedule.course_id,
      schedule.title,
      schedule.schedule_type,
      schedule.start_date,
      schedule.end_date,
      schedule.start_time,
      schedule.end_time,
      schedule.trainer_id,
      schedule.location || null,
      schedule.max_learners,
      schedule.status,
      schedule.session_mode,
      schedule.zoom_link || null,
      schedule.zoom_meeting_id || null,
      schedule.batch_number || null
    ]);
  }
  
  // Insert sample enrollments
  const enrollments = [
    { id: '1', schedule_id: '1', learner_id: '4', status: 'completed' },
    { id: '2', schedule_id: '1', learner_id: '5', status: 'completed' },
    { id: '3', schedule_id: '1', learner_id: '6', status: 'completed' },
    { id: '4', schedule_id: '2', learner_id: '4', status: 'active' },
    { id: '5', schedule_id: '2', learner_id: '7', status: 'active' },
    { id: '6', schedule_id: '3', learner_id: '5', status: 'active' },
    { id: '7', schedule_id: '3', learner_id: '6', status: 'active' },
    { id: '8', schedule_id: '4', learner_id: '4', status: 'active' },
    { id: '9', schedule_id: '5', learner_id: '7', status: 'active' }
  ];
  
  for (const enrollment of enrollments) {
    await query(`
      INSERT INTO enrollments (id, schedule_id, learner_id, enrolled_at, status)
      VALUES (?, ?, ?, NOW(), ?)
    `, [
      enrollment.id,
      enrollment.schedule_id,
      enrollment.learner_id,
      enrollment.status
    ]);
  }
  
  // Insert sample custom profile fields
  const profileFields = [
    {
      id: 'pf1',
      name: 'department',
      label: 'Department',
      field_type: 'text',
      is_required: 0,
      sort_order: 1,
      visible_to: JSON.stringify(['admin', 'trainer'])
    },
    {
      id: 'pf2',
      name: 'employee_id',
      label: 'Employee ID',
      field_type: 'text',
      is_required: 1,
      sort_order: 2,
      visible_to: JSON.stringify(['admin', 'trainer', 'learner'])
    },
    {
      id: 'pf3',
      name: 'job_title',
      label: 'Job Title',
      field_type: 'select',
      options: JSON.stringify(['Manager', 'Developer', 'Analyst', 'Coordinator', 'Specialist']),
      is_required: 0,
      sort_order: 3,
      visible_to: JSON.stringify(['admin', 'trainer'])
    },
    {
      id: 'pf4',
      name: 'skills',
      label: 'Skills',
      field_type: 'multiselect',
      options: JSON.stringify(['Project Management', 'Data Analysis', 'Programming', 'Communication', 'Leadership']),
      is_required: 0,
      sort_order: 4,
      visible_to: JSON.stringify(['admin', 'trainer', 'learner'])
    },
    {
      id: 'pf5',
      name: 'join_date',
      label: 'Join Date',
      field_type: 'date',
      is_required: 0,
      sort_order: 5,
      visible_to: JSON.stringify(['admin'])
    }
  ];
  
  for (const field of profileFields) {
    await query(`
      INSERT INTO custom_profile_fields (id, name, label, field_type, options, is_required, sort_order, visible_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      field.id,
      field.name,
      field.label,
      field.field_type,
      field.options || null,
      field.is_required,
      field.sort_order,
      field.visible_to
    ]);
  }
  
  // Insert sample system settings
  const settings = [
    {
      id: 's1',
      category: 'general',
      key: 'company_name',
      value: 'TrainingPro Academy',
      label: 'Company Name',
      description: 'Name of your training organization',
      type: 'text'
    },
    {
      id: 's2',
      category: 'general',
      key: 'timezone',
      value: 'UTC',
      label: 'Default Timezone',
      description: 'Default timezone for all schedules',
      type: 'select',
      options: JSON.stringify(['UTC', 'EST', 'CST', 'MST', 'PST', 'GMT'])
    },
    {
      id: 's3',
      category: 'email',
      key: 'email_notifications',
      value: 'true',
      label: 'Enable Email Notifications',
      description: 'Send email notifications to users',
      type: 'boolean'
    },
    {
      id: 's4',
      category: 'security',
      key: 'password_min_length',
      value: '8',
      label: 'Minimum Password Length',
      description: 'Minimum characters required for passwords',
      type: 'number'
    },
    {
      id: 's5',
      category: 'integrations',
      key: 'zoho_books_enabled',
      value: 'true',
      label: 'Enable Zoho Books Integration',
      description: 'Sync with Zoho Books for invoicing',
      type: 'boolean'
    }
  ];
  
  for (const setting of settings) {
    await query(`
      INSERT INTO system_settings (id, category, setting_key, value, label, description, setting_type, options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      setting.id,
      setting.category,
      setting.key,
      setting.value,
      setting.label,
      setting.description || null,
      setting.type,
      setting.options || null
    ]);
  }
  
  // Insert sample Zoho invoices
  const invoices = [
    {
      id: 'inv1',
      order_no: 'ORD-2024-001',
      customer_id: '4',
      customer_name: 'Michael Brown',
      amount: 500.00,
      balance_due: 0.00,
      status: 'paid',
      invoice_date: '2024-01-15',
      due_date: '2024-02-15'
    },
    {
      id: 'inv2',
      order_no: 'ORD-2024-002',
      customer_id: '5',
      customer_name: 'Emily Davis',
      amount: 750.00,
      balance_due: 250.00,
      status: 'partial',
      invoice_date: '2024-01-20',
      due_date: '2024-02-20'
    },
    {
      id: 'inv3',
      order_no: 'ORD-2024-003',
      customer_id: '6',
      customer_name: 'David Wilson',
      amount: 1000.00,
      balance_due: 1000.00,
      status: 'unpaid',
      invoice_date: '2024-02-01',
      due_date: '2024-03-01'
    },
    {
      id: 'inv4',
      order_no: 'ORD-2024-004',
      customer_id: '7',
      customer_name: 'Lisa Anderson',
      amount: 600.00,
      balance_due: 600.00,
      status: 'overdue',
      invoice_date: '2024-01-10',
      due_date: '2024-02-10'
    }
  ];
  
  for (const invoice of invoices) {
    await query(`
      INSERT INTO zoho_invoices (id, order_no, customer_id, customer_name, amount, balance_due, status, invoice_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoice.id,
      invoice.order_no,
      invoice.customer_id,
      invoice.customer_name,
      invoice.amount,
      invoice.balance_due,
      invoice.status,
      invoice.invoice_date,
      invoice.due_date
    ]);
  }
  
  // Insert sample learner groups
  const groups = [
    {
      id: '1',
      name: 'Project Management Team A',
      description: 'First batch of project management learners',
      created_by: '2'
    },
    {
      id: '2',
      name: 'Data Analytics Cohort',
      description: 'Data analytics training group',
      created_by: '3'
    },
    {
      id: '3',
      name: 'Leadership Workshop Group',
      description: 'Leadership training participants',
      created_by: '2'
    }
  ];
  
  for (const group of groups) {
    await query(`
      INSERT INTO learner_groups (id, name, description, created_by, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      group.id,
      group.name,
      group.description,
      group.created_by
    ]);
  }
  
  // Insert group members
  const groupMembers = [
    { group_id: '1', learner_id: '4' },
    { group_id: '1', learner_id: '5' },
    { group_id: '1', learner_id: '6' },
    { group_id: '2', learner_id: '5' },
    { group_id: '2', learner_id: '6' },
    { group_id: '3', learner_id: '4' },
    { group_id: '3', learner_id: '7' }
  ];
  
  for (const member of groupMembers) {
    await query(`
      INSERT INTO group_members (group_id, learner_id)
      VALUES (?, ?)
    `, [member.group_id, member.learner_id]);
  }
  
  console.log('✅ Database seeded successfully!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Default Login Credentials');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Admin:    admin@training.com      / admin123');
  console.log('  Trainer:  trainer1@training.com   / trainer123');
  console.log('  Trainer:  trainer2@training.com   / trainer123');
  console.log('  Learner:  learner1@training.com   / learner123');
  console.log('  Learner:  learner2@training.com   / learner123');
  console.log('  Learner:  learner3@training.com   / learner123');
  console.log('  Learner:  learner4@training.com   / learner123');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
