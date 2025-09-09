import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import { Product } from '../types';

const router = Router();

// GET all products
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const products = await dbAll('SELECT * FROM products');
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET single product by ID
router.get('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

// POST create new product
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await dbRun(
      'INSERT INTO products (id, name, price, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, price, description || null, now, now]
    );
    
    const newProduct = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// PATCH update product
router.patch('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description } = req.body;
    
    if (!name && !price && !description) {
      return res.status(400).json({ success: false, error: 'At least one field is required for update' });
    }
    
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const updateFields = [];
    const params = [];
    
    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    
    if (price) {
      updateFields.push('price = ?');
      params.push(price);
    }
    
    if (description) {
      updateFields.push('description = ?');
      params.push(description);
    }
    
    params.push(id);
    const query = `UPDATE products SET ${updateFields.join(', ')}, updated_at = ? WHERE id = ?`;
    params.splice(updateFields.length, 0, new Date().toISOString());
    
    await dbRun(query, params);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [id]);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await dbRun('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
});

export default router;