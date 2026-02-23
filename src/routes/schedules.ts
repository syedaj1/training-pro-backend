import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, getConnection } from '../database/connection';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { Schedule, Enrollment, Attendance } from '../types';

const router = Router();

// Get all schedules
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { courseId, trainerId, status, startDate, endDate } = req.query;

  let sql = `
    SELECT s.*, c.title as course_title, u.name as trainer_name
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN users u ON s.trainer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (courseId) {
    sql += ' AND s.course_id = ?';
    params.push(courseId);
  }

  if (trainerId) {
    sql += ' AND s.trainer_id = ?';
    params.push(trainerId);
  }

  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  if (startDate) {
    sql += ' AND s.start_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND s.end_date <= ?';
    params.push(endDate);
  }

  // Learners can only see schedules they're enrolled in
  if (req.user!.role === 'learner') {
    sql += ' AND s.id IN (SELECT schedule_id FROM enrollments WHERE learner_id = ?)';
    params.push(req.user!.userId);
  }

  sql += ' ORDER BY s.start_date DESC';

  const schedules = await query(sql, params);

  res.json({
    success: true,
    data: schedules
  });
}));

// Get schedule by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await queryOne(`
    SELECT s.*, c.title as course_title, u.name as trainer_name
    FROM schedules s
    JOIN courses c ON s.course_id = c.id
    JOIN users u ON s.trainer_id = u.id
    WHERE s.id = ?
  `, [id]) as Schedule | null;

  if (!schedule) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }

  // Get schedule days
  const scheduleDays = await query('SELECT * FROM schedule_days WHERE schedule_id = ?', [id]);

  // Get group assignments
  const groupAssignments = await query('SELECT group_id FROM schedule_groups WHERE schedule_id = ?', [id]);
  const groupIds = groupAssignments.map((g: any) => g.group_id);

  // Get enrollments
  const enrollments = await query(`
    SELECT e.*, u.name as learner_name, u.email as learner_email, u.avatar as learner_avatar
    FROM enrollments e
    JOIN users u ON e.learner_id = u.id
    WHERE e.schedule_id = ?
  `, [id]);

  res.json({
    success: true,
    data: {
      ...schedule,
      scheduleDays,
      groupIds,
      enrollments
    }
  });
}));

// Create schedule (admin and trainer)
router.post('/', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const {
    courseId,
    title,
    type,
    startDate,
    endDate,
    startTime,
    endTime,
    trainerId,
    location,
    maxLearners,
    sessionMode,
    zoomLink,
    zoomMeetingId,
    groupIds,
    scheduleDays
  } = req.body;

  if (!courseId || !title || !type || !startDate || !endDate || !startTime || !endTime || !sessionMode) {
    res.status(400).json({ success: false, error: 'Required fields are missing' });
    return;
  }

  // Trainers can only create schedules for themselves
  const finalTrainerId = req.user!.role === 'trainer' ? req.user!.userId : (trainerId || req.user!.userId);

  const id = uuidv4();

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(`
      INSERT INTO schedules (id, course_id, title, schedule_type, start_date, end_date, start_time, end_time, trainer_id, location, max_learners, status, session_mode, zoom_link, zoom_meeting_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, NOW())
    `, [
      id,
      courseId,
      title,
      type,
      startDate,
      endDate,
      startTime,
      endTime,
      finalTrainerId,
      location || null,
      maxLearners || 20,
      sessionMode,
      zoomLink || null,
      zoomMeetingId || null
    ]);

    // Add schedule days if provided
    if (scheduleDays && Array.isArray(scheduleDays)) {
      for (const day of scheduleDays) {
        await connection.execute(`
          INSERT INTO schedule_days (id, schedule_id, date, start_time, end_time)
          VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), id, day.date, day.startTime, day.endTime]);
      }
    }

    // Add group assignments if provided
    if (groupIds && Array.isArray(groupIds)) {
      for (const groupId of groupIds) {
        await connection.execute(
          'INSERT INTO schedule_groups (schedule_id, group_id) VALUES (?, ?)',
          [id, groupId]
        );
      }
    }

    await connection.commit();

    const schedule = await queryOne('SELECT * FROM schedules WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

// Update schedule (admin and trainer)
router.put('/:id', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const schedule = await queryOne('SELECT * FROM schedules WHERE id = ?', [id]) as Schedule | null;

  if (!schedule) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }

  // Trainers can only update their own schedules
  if (req.user!.role === 'trainer' && schedule.trainerId !== req.user!.userId) {
    res.status(403).json({ success: false, error: 'Can only update your own schedules' });
    return;
  }

  const updateFields: string[] = [];
  const params: any[] = [];

  const fieldMappings: Record<string, string> = {
    title: 'title',
    startDate: 'start_date',
    endDate: 'end_date',
    startTime: 'start_time',
    endTime: 'end_time',
    location: 'location',
    maxLearners: 'max_learners',
    status: 'status',
    zoomLink: 'zoom_link',
    zoomMeetingId: 'zoom_meeting_id'
  };

  for (const [key, dbField] of Object.entries(fieldMappings)) {
    if (updates[key] !== undefined) {
      updateFields.push(`${dbField} = ?`);
      params.push(updates[key]);
    }
  }

  // Only admins can change trainer
  if (updates.trainerId !== undefined && req.user!.role === 'admin') {
    updateFields.push('trainer_id = ?');
    params.push(updates.trainerId);
  }

  if (updateFields.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  params.push(id);

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(`UPDATE schedules SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Update schedule days if provided
    if (updates.scheduleDays !== undefined) {
      await connection.execute('DELETE FROM schedule_days WHERE schedule_id = ?', [id]);

      if (Array.isArray(updates.scheduleDays)) {
        for (const day of updates.scheduleDays) {
          await connection.execute(`
            INSERT INTO schedule_days (id, schedule_id, date, start_time, end_time)
            VALUES (?, ?, ?, ?, ?)
          `, [uuidv4(), id, day.date, day.startTime, day.endTime]);
        }
      }
    }

    // Update group assignments if provided
    if (updates.groupIds !== undefined) {
      await connection.execute('DELETE FROM schedule_groups WHERE schedule_id = ?', [id]);

      if (Array.isArray(updates.groupIds)) {
        for (const groupId of updates.groupIds) {
          await connection.execute(
            'INSERT INTO schedule_groups (schedule_id, group_id) VALUES (?, ?)',
            [id, groupId]
          );
        }
      }
    }

    await connection.commit();

    const updatedSchedule = await queryOne('SELECT * FROM schedules WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

// Delete schedule (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schedule = await queryOne('SELECT * FROM schedules WHERE id = ?', [id]);

  if (!schedule) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }

  await query('DELETE FROM schedules WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Schedule deleted successfully'
  });
}));

// ==================== ENROLLMENTS ====================

// Enroll learner in schedule
router.post('/:id/enroll', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { learnerId } = req.body;

  if (!learnerId) {
    res.status(400).json({ success: false, error: 'learnerId is required' });
    return;
  }

  const schedule = await queryOne('SELECT * FROM schedules WHERE id = ?', [id]) as Schedule | null;

  if (!schedule) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }

  // Check if already enrolled
  const existing = await queryOne('SELECT * FROM enrollments WHERE schedule_id = ? AND learner_id = ?', [id, learnerId]);

  if (existing) {
    res.status(409).json({ success: false, error: 'Learner is already enrolled in this schedule' });
    return;
  }

  // Check max learners
  const enrollmentCount = await queryOne('SELECT COUNT(*) as count FROM enrollments WHERE schedule_id = ?', [id]) as { count: number } | null;

  if (enrollmentCount && enrollmentCount.count >= schedule.maxLearners) {
    res.status(400).json({ success: false, error: 'Schedule is full' });
    return;
  }

  const enrollmentId = uuidv4();

  await query(`
    INSERT INTO enrollments (id, schedule_id, learner_id, enrolled_at, status)
    VALUES (?, ?, ?, NOW(), 'active')
  `, [enrollmentId, id, learnerId]);

  const enrollment = await queryOne(`
    SELECT e.*, u.name as learner_name, u.email as learner_email
    FROM enrollments e
    JOIN users u ON e.learner_id = u.id
    WHERE e.id = ?
  `, [enrollmentId]);

  res.status(201).json({
    success: true,
    data: enrollment,
    message: 'Learner enrolled successfully'
  });
}));

// Unenroll learner from schedule
router.delete('/:id/enroll/:enrollmentId', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const { enrollmentId } = req.params;

  const enrollment = await queryOne('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]);

  if (!enrollment) {
    res.status(404).json({ success: false, error: 'Enrollment not found' });
    return;
  }

  await query('DELETE FROM enrollments WHERE id = ?', [enrollmentId]);

  res.json({
    success: true,
    message: 'Learner unenrolled successfully'
  });
}));

// ==================== ATTENDANCE ====================

// Get attendance for schedule
router.get('/:id/attendance', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  let sql = `
    SELECT a.*, u.name as learner_name
    FROM attendance a
    JOIN users u ON a.learner_id = u.id
    WHERE a.schedule_id = ?
  `;
  const params: any[] = [id];

  if (date) {
    sql += ' AND a.date = ?';
    params.push(date);
  }

  sql += ' ORDER BY a.date DESC, u.name';

  const attendance = await query(sql, params);

  res.json({
    success: true,
    data: attendance
  });
}));

// Mark attendance
router.post('/:id/attendance', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { learnerId, date, status, notes } = req.body;

  if (!learnerId || !date || !status) {
    res.status(400).json({ success: false, error: 'learnerId, date, and status are required' });
    return;
  }

  // Check if already marked
  const existing = await queryOne('SELECT * FROM attendance WHERE schedule_id = ? AND learner_id = ? AND date = ?',
    [id, learnerId, date]) as Attendance | null;

  if (existing) {
    // Update existing
    await query(`
      UPDATE attendance 
      SET status = ?, notes = ?, marked_by = ?, marked_at = NOW()
      WHERE id = ?
    `, [status, notes || null, req.user!.userId, existing.id]);

    const updated = await queryOne('SELECT * FROM attendance WHERE id = ?', [existing.id]);

    res.json({
      success: true,
      data: updated,
      message: 'Attendance updated successfully'
    });
  } else {
    // Create new
    const attendanceId = uuidv4();

    await query(`
      INSERT INTO attendance (id, schedule_id, learner_id, date, status, marked_by, marked_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
    `, [attendanceId, id, learnerId, date, status, req.user!.userId, notes || null]);

    const attendance = await queryOne('SELECT * FROM attendance WHERE id = ?', [attendanceId]);

    res.status(201).json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    });
  }
}));

export default router;
