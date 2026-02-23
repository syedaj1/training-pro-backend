import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../database/connection';
import { generateToken, authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { User } from '../types';

const router = Router();

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]) as User | null;

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const token = generateToken(user.id, user.email, user.role);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
      token
    }
  });
}));

// Register (admin only)
router.post('/register', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ success: false, error: 'All fields are required' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = Math.random().toString(36).substr(2, 9);

  try {
    await query(`
      INSERT INTO users (id, email, password, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [id, email, hashedPassword, name, role]);

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

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await queryOne(`
    SELECT id, email, name, role, avatar, profile_data, created_at 
    FROM users 
    WHERE id = ?
  `, [req.user!.userId]) as User | null;

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

// Change password
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: 'Current password and new password are required' });
    return;
  }

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user!.userId]) as User | null;

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);

  if (!isValidPassword) {
    res.status(401).json({ success: false, error: 'Current password is incorrect' });
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', 
    [hashedPassword, req.user!.userId]);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

export default router;
