import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../database/connection';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { User, UserRole } from '../types';

const router = Router();

// Get all users (admin and trainer)
router.get('/', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const { role, search } = req.query;

  let sql = 'SELECT id, email, name, role, avatar, profile_data, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';

  const users = await query(sql, params) as User[];

  res.json({
    success: true,
    data: users.map(user => ({
      ...user,
      profileData: user.profileData ? JSON.parse(user.profileData as unknown as string) : undefined
    }))
  });
}));

// Get user by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Users can only view their own profile unless they're admin or trainer
  if (req.user!.role === 'learner' && req.user!.userId !== id) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const user = await queryOne(`
    SELECT id, email, name, role, avatar, profile_data, created_at 
    FROM users 
    WHERE id = ?
  `, [id]) as User | null;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...user,
      profileData: user.profileData ? JSON.parse(user.profileData as unknown as string) : undefined
    }
  });
}));

// Create user (admin only)
router.post('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { email, password, name, role, avatar } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ success: false, error: 'Email, password, name, and role are required' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();

  try {
    await query(`
      INSERT INTO users (id, email, password, name, role, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, email, hashedPassword, name, role, avatar || null]);

    const user = await queryOne('SELECT id, email, name, role, avatar, created_at FROM users WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'Email already exists' });
      return;
    }
    throw error;
  }
}));

// Update user
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, avatar, profileData } = req.body;

  // Users can only update their own profile unless they're admin
  if (req.user!.role !== 'admin' && req.user!.userId !== id) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]) as User | null;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }

  if (email !== undefined && req.user!.role === 'admin') {
    updates.push('email = ?');
    params.push(email);
  }

  if (avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(avatar);
  }

  if (profileData !== undefined) {
    updates.push('profile_data = ?');
    params.push(JSON.stringify(profileData));
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  const updatedUser = await queryOne('SELECT id, email, name, role, avatar, profile_data, created_at FROM users WHERE id = ?', [id]);

  res.json({
    success: true,
    data: {
      ...updatedUser,
      profileData: updatedUser.profile_data ? JSON.parse(updatedUser.profile_data) : undefined
    },
    message: 'User updated successfully'
  });
}));

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (req.user!.userId === id) {
    res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    return;
  }

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]) as User | null;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  await query('DELETE FROM users WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Update user profile data
router.put('/:id/profile-data', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fieldId, value } = req.body;

  // Users can only update their own profile data
  if (req.user!.userId !== id && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' });
    return;
  }

  const user = await queryOne('SELECT profile_data FROM users WHERE id = ?', [id]) as { profile_data: string } | null;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const profileData = user.profile_data ? JSON.parse(user.profile_data) : {};
  profileData[fieldId] = value;

  await query('UPDATE users SET profile_data = ?, updated_at = NOW() WHERE id = ?',
    [JSON.stringify(profileData), id]);

  res.json({
    success: true,
    message: 'Profile data updated successfully'
  });
}));

// Get trainers list (for schedule creation)
router.get('/trainers/list', authenticateToken, asyncHandler(async (req, res) => {
  const trainers = await query(`
    SELECT id, email, name, avatar 
    FROM users 
    WHERE role = 'trainer'
    ORDER BY name
  `);

  res.json({
    success: true,
    data: trainers
  });
}));

// Get learners list (for enrollment)
router.get('/learners/list', authenticateToken, requireRole('admin', 'trainer'), asyncHandler(async (req, res) => {
  const learners = await query(`
    SELECT id, email, name, avatar 
    FROM users 
    WHERE role = 'learner'
    ORDER BY name
  `);

  res.json({
    success: true,
    data: learners
  });
}));

export default router;
