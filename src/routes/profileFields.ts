import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, getConnection } from '../database/connection';
import { authenticateToken, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomProfileField } from '../types';

const router = Router();

// Get all profile fields
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const fields = await query('SELECT * FROM custom_profile_fields ORDER BY sort_order') as CustomProfileField[];

  res.json({
    success: true,
    data: fields.map(field => ({
      ...field,
      options: field.options ? JSON.parse(field.options as string) : undefined,
      visibleTo: JSON.parse(field.visibleTo as string)
    }))
  });
}));

// Get profile field by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const field = await queryOne('SELECT * FROM custom_profile_fields WHERE id = ?', [id]) as CustomProfileField | null;

  if (!field) {
    res.status(404).json({ success: false, error: 'Profile field not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...field,
      options: field.options ? JSON.parse(field.options as string) : undefined,
      visibleTo: JSON.parse(field.visibleTo as string)
    }
  });
}));

// Create profile field (admin only)
router.post('/', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { name, label, type, options, required, visibleTo } = req.body;

  if (!name || !label || !type) {
    res.status(400).json({ success: false, error: 'Name, label, and type are required' });
    return;
  }

  // Validate name format
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    res.status(400).json({ success: false, error: 'Field name can only contain letters, numbers, and underscores' });
    return;
  }

  // Get max order
  const maxOrder = await queryOne('SELECT MAX(sort_order) as maxOrder FROM custom_profile_fields') as { maxOrder: number | null } | null;
  const order = (maxOrder?.maxOrder || -1) + 1;

  const id = uuidv4();

  try {
    await query(`
      INSERT INTO custom_profile_fields (id, name, label, field_type, options, is_required, sort_order, visible_to, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      name,
      label,
      type,
      options ? JSON.stringify(options) : null,
      required ? 1 : 0,
      order,
      JSON.stringify(visibleTo || ['admin', 'trainer', 'learner'])
    ]);

    const field = await queryOne('SELECT * FROM custom_profile_fields WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: {
        ...field,
        options: field.options ? JSON.parse(field.options) : undefined,
        visibleTo: JSON.parse(field.visible_to)
      },
      message: 'Profile field created successfully'
    });
  } catch (error: any) {
    if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'A field with this name already exists' });
      return;
    }
    throw error;
  }
}));

// Update profile field (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, type, options, required, visibleTo } = req.body;

  const field = await queryOne('SELECT * FROM custom_profile_fields WHERE id = ?', [id]) as CustomProfileField | null;

  if (!field) {
    res.status(404).json({ success: false, error: 'Profile field not found' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (label !== undefined) {
    updates.push('label = ?');
    params.push(label);
  }

  if (type !== undefined) {
    updates.push('field_type = ?');
    params.push(type);
  }

  if (options !== undefined) {
    updates.push('options = ?');
    params.push(JSON.stringify(options));
  }

  if (required !== undefined) {
    updates.push('is_required = ?');
    params.push(required ? 1 : 0);
  }

  if (visibleTo !== undefined) {
    updates.push('visible_to = ?');
    params.push(JSON.stringify(visibleTo));
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  params.push(id);

  await query(`UPDATE custom_profile_fields SET ${updates.join(', ')} WHERE id = ?`, params);

  const updatedField = await queryOne('SELECT * FROM custom_profile_fields WHERE id = ?', [id]);

  res.json({
    success: true,
    data: {
      ...updatedField,
      options: updatedField.options ? JSON.parse(updatedField.options) : undefined,
      visibleTo: JSON.parse(updatedField.visible_to)
    },
    message: 'Profile field updated successfully'
  });
}));

// Delete profile field (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const field = await queryOne('SELECT * FROM custom_profile_fields WHERE id = ?', [id]);

  if (!field) {
    res.status(404).json({ success: false, error: 'Profile field not found' });
    return;
  }

  await query('DELETE FROM custom_profile_fields WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Profile field deleted successfully'
  });
}));

// Reorder profile fields (admin only)
router.post('/reorder', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const { fieldIds } = req.body;

  if (!Array.isArray(fieldIds)) {
    res.status(400).json({ success: false, error: 'fieldIds array is required' });
    return;
  }

  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    for (let i = 0; i < fieldIds.length; i++) {
      await connection.execute(
        'UPDATE custom_profile_fields SET sort_order = ? WHERE id = ?',
        [i, fieldIds[i]]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Fields reordered successfully'
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

export default router;
