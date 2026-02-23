import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, getConnection } from '../database/connection';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { Course, CourseModule } from '../types';

const router = Router();

// Get all courses
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { courseType, status, search } = req.query;

  let sql = 'SELECT * FROM courses WHERE 1=1';
  const params: any[] = [];

  if (courseType) {
    sql += ' AND course_type = ?';
    params.push(courseType);
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';

  const courses = await query(sql, params) as Course[];

  res.json({
    success: true,
    data: courses
  });
}));

// Get course by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]) as Course | null;

  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found' });
    return;
  }

  // Get modules if e-learning course
  let modules: CourseModule[] = [];
  if (course.courseType === 'elearning') {
    modules = await query(`
      SELECT * FROM course_modules 
      WHERE course_id = ? 
      ORDER BY sort_order
    `, [id]) as CourseModule[];
  }

  res.json({
    success: true,
    data: {
      ...course,
      modules
    }
  });
}));

// Create course (admin only)
router.post('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const {
    title,
    description,
    duration,
    category,
    courseType,
    zoomMeetingId,
    zoomLink
  } = req.body;

  if (!title || !description || !duration || !category || !courseType) {
    res.status(400).json({ success: false, error: 'Title, description, duration, category, and courseType are required' });
    return;
  }

  const id = uuidv4();
  const status = courseType === 'elearning' ? 'draft' : null;

  await query(`
    INSERT INTO courses (id, title, description, duration, category, course_type, status, zoom_meeting_id, zoom_link, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, [
    id,
    title,
    description,
    duration,
    category,
    courseType,
    status,
    zoomMeetingId || null,
    zoomLink || null,
    req.user!.userId
  ]);

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);

  res.status(201).json({
    success: true,
    data: course,
    message: 'Course created successfully'
  });
}));

// Update course (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    duration,
    category,
    zoomMeetingId,
    zoomLink
  } = req.body;

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]) as Course | null;

  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (duration !== undefined) {
    updates.push('duration = ?');
    params.push(duration);
  }

  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }

  if (zoomMeetingId !== undefined) {
    updates.push('zoom_meeting_id = ?');
    params.push(zoomMeetingId);
  }

  if (zoomLink !== undefined) {
    updates.push('zoom_link = ?');
    params.push(zoomLink);
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  await query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);

  const updatedCourse = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);

  res.json({
    success: true,
    data: updatedCourse,
    message: 'Course updated successfully'
  });
}));

// Delete course (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]) as Course | null;

  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found' });
    return;
  }

  // Check if course has active schedules
  const scheduleCount = await queryOne('SELECT COUNT(*) as count FROM schedules WHERE course_id = ?', [id]) as { count: number } | null;

  if (scheduleCount && scheduleCount.count > 0) {
    res.status(400).json({ success: false, error: 'Cannot delete course with active schedules' });
    return;
  }

  await query('DELETE FROM courses WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
}));

// Publish course (admin only)
router.post('/:id/publish', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await query('UPDATE courses SET status = ?, updated_at = NOW() WHERE id = ?', ['published', id]);

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);

  res.json({
    success: true,
    data: course,
    message: 'Course published successfully'
  });
}));

// Archive course (admin only)
router.post('/:id/archive', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  await query('UPDATE courses SET status = ?, updated_at = NOW() WHERE id = ?', ['archived', id]);

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]);

  res.json({
    success: true,
    data: course,
    message: 'Course archived successfully'
  });
}));

// ==================== COURSE MODULES ====================

// Get modules for a course
router.get('/:id/modules', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const modules = await query(`
    SELECT * FROM course_modules 
    WHERE course_id = ? 
    ORDER BY sort_order
  `, [id]) as CourseModule[];

  res.json({
    success: true,
    data: modules
  });
}));

// Add module to course (admin only)
router.post('/:id/modules', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    contentType,
    contentUrl,
    scormVersion,
    duration,
    isRequired
  } = req.body;

  if (!title || !contentType || duration === undefined) {
    res.status(400).json({ success: false, error: 'Title, contentType, and duration are required' });
    return;
  }

  const course = await queryOne('SELECT * FROM courses WHERE id = ?', [id]) as Course | null;

  if (!course) {
    res.status(404).json({ success: false, error: 'Course not found' });
    return;
  }

  if (course.courseType !== 'elearning') {
    res.status(400).json({ success: false, error: 'Modules can only be added to e-learning courses' });
    return;
  }

  // Get max order
  const maxOrder = await queryOne('SELECT MAX(sort_order) as maxOrder FROM course_modules WHERE course_id = ?', [id]) as { maxOrder: number | null } | null;
  const order = (maxOrder?.maxOrder || -1) + 1;

  const moduleId = uuidv4();

  await query(`
    INSERT INTO course_modules (id, course_id, title, description, content_type, content_url, scorm_version, duration, sort_order, is_required, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    moduleId,
    id,
    title,
    description || null,
    contentType,
    contentUrl || null,
    scormVersion || null,
    duration,
    order,
    isRequired ? 1 : 0
  ]);

  const module = await queryOne('SELECT * FROM course_modules WHERE id = ?', [moduleId]);

  res.status(201).json({
    success: true,
    data: module,
    message: 'Module added successfully'
  });
}));

// Update module (admin only)
router.put('/:courseId/modules/:moduleId', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { courseId, moduleId } = req.params;
  const updates = req.body;

  const module = await queryOne('SELECT * FROM course_modules WHERE id = ? AND course_id = ?', [moduleId, courseId]) as CourseModule | null;

  if (!module) {
    res.status(404).json({ success: false, error: 'Module not found' });
    return;
  }

  const updateFields: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) {
    updateFields.push('title = ?');
    params.push(updates.title);
  }

  if (updates.description !== undefined) {
    updateFields.push('description = ?');
    params.push(updates.description);
  }

  if (updates.contentType !== undefined) {
    updateFields.push('content_type = ?');
    params.push(updates.contentType);
  }

  if (updates.contentUrl !== undefined) {
    updateFields.push('content_url = ?');
    params.push(updates.contentUrl);
  }

  if (updates.scormVersion !== undefined) {
    updateFields.push('scorm_version = ?');
    params.push(updates.scormVersion);
  }

  if (updates.duration !== undefined) {
    updateFields.push('duration = ?');
    params.push(updates.duration);
  }

  if (updates.isRequired !== undefined) {
    updateFields.push('is_required = ?');
    params.push(updates.isRequired ? 1 : 0);
  }

  if (updateFields.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  params.push(moduleId);

  await query(`UPDATE course_modules SET ${updateFields.join(', ')} WHERE id = ?`, params);

  const updatedModule = await queryOne('SELECT * FROM course_modules WHERE id = ?', [moduleId]);

  res.json({
    success: true,
    data: updatedModule,
    message: 'Module updated successfully'
  });
}));

// Delete module (admin only)
router.delete('/:courseId/modules/:moduleId', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { courseId, moduleId } = req.params;

  const module = await queryOne('SELECT * FROM course_modules WHERE id = ? AND course_id = ?', [moduleId, courseId]);

  if (!module) {
    res.status(404).json({ success: false, error: 'Module not found' });
    return;
  }

  await query('DELETE FROM course_modules WHERE id = ?', [moduleId]);

  res.json({
    success: true,
    message: 'Module deleted successfully'
  });
}));

// Reorder modules (admin only)
router.post('/:id/modules/reorder', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { moduleIds } = req.body;

  if (!Array.isArray(moduleIds)) {
    res.status(400).json({ success: false, error: 'moduleIds array is required' });
    return;
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    for (let i = 0; i < moduleIds.length; i++) {
      await connection.execute(
        'UPDATE course_modules SET sort_order = ? WHERE id = ? AND course_id = ?',
        [i, moduleIds[i], id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Modules reordered successfully'
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

// Get course categories
router.get('/categories/list', authenticateToken, asyncHandler(async (req, res) => {
  const categories = await query('SELECT DISTINCT category FROM courses ORDER BY category');

  res.json({
    success: true,
    data: categories.map((c: any) => c.category)
  });
}));

export default router;
