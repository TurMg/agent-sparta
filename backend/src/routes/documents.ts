import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database/init';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateSPHDocument } from '../mcp/tools/sphGenerator';
import { validateSPHData, sanitizeSPHData } from '../mcp/tools/sphValidator';

const router = express.Router();

// Get all documents for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const documents = await dbAll(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
      [req.user!.id]
    );

    const formattedDocuments = documents.map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      status: doc.status,
      filePath: doc.file_path,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    }));

    res.json({
      success: true,
      data: formattedDocuments
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single document
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const document: any = await dbGet(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      data: {
        id: document.id,
        type: document.type,
        title: document.title,
        content: document.content,
        data: document.data,
        status: document.status,
        filePath: document.file_path,
        createdAt: document.created_at,
        updatedAt: document.updated_at
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate SPH document
router.post('/generate-sph', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sphData = sanitizeSPHData(req.body);
    
    // Validate data
    const validation = validateSPHData(sphData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Data SPH tidak valid',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Generate document
    const result = await generateSPHDocument(sphData);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Gagal generate dokumen SPH',
        details: result.error
      });
    }

    // Save to database
    const documentId = uuidv4();
    const title = `SPH - ${sphData.customerName} - ${sphData.sphDate}`;
    
    await dbRun(`
      INSERT INTO documents (id, user_id, type, title, content, data, status, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      documentId,
      req.user!.id,
      'sph',
      title,
      result.html, // HTML content will be stored separately
      JSON.stringify(sphData),
      'generated',
      result.pdfPath
    ]);

    res.json({
      success: true,
      data: {
        documentId,
        title,
        htmlPath: result.htmlPath,
        pdfPath: result.pdfPath,
        validation: {
          warnings: validation.warnings
        }
      }
    });
  } catch (error) {
    console.error('Generate SPH error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update document content
router.patch('/:id/content', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, data } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // --- Start Logo Embedding Logic ---
    const path = require('path');
    const fs = require('fs');
    let processedContent = content;

    try {
      const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logoTelkom.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoDataUrl = `data:image/png;base64,${logoBase64}`;
        
        processedContent = content.replace(/src=(?:"|')\/assets\/logoTelkom\.png(?:"|')/g, `src="${logoDataUrl}"`);
        console.log('✅ Logo embedded successfully into HTML content.');
      } else {
        console.warn('⚠️ Backend logo file not found at', logoPath);
      }
    } catch (e) {
      console.error('Error embedding logo:', e);
    }
    // --- End Logo Embedding Logic ---

    // Update content in database with the processed content
    const result = await dbRun(
      'UPDATE documents SET content = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [processedContent, data ? JSON.stringify(data) : null, req.params.id, req.user!.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Save updated HTML file and regenerate PDF
    try {
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const htmlPath = path.join(uploadsDir, `sph-${req.params.id}.html`);
      const pdfPath = path.join(uploadsDir, `sph-${req.params.id}.pdf`);

      fs.writeFileSync(htmlPath, processedContent);

      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800 });
      
      await page.setContent(processedContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });

      await browser.close();
      
      await dbRun(
        'UPDATE documents SET file_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [`/uploads/sph-${req.params.id}.pdf`, req.params.id, req.user!.id]
      );
      
      console.log('✅ Document updated and PDF regenerated with embedded logo');
    } catch (fileError) {
      console.error('Error updating files:', fileError);
    }

    const updatedDocument = await dbGet(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    res.json({
      success: true,
      message: 'Document content updated successfully',
      data: updatedDocument,
    });
  } catch (error) {
    console.error('Update document content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save signature as file
router.post('/save-signature', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { signatureData, fileName, name, title } = req.body;
    
    if (!signatureData || !fileName) {
      return res.status(400).json({ error: 'Signature data and filename required' });
    }

    const path = require('path');
    const fs = require('fs');
    
    // Remove data:image/png;base64, prefix
    const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
    
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const signaturePath = path.join(uploadsDir, `signature-${fileName}.png`);
    
    // Save signature as PNG file
    fs.writeFileSync(signaturePath, base64Data, 'base64');
    
    console.log('✅ Signature saved as file:', signaturePath);
    
    res.json({
      success: true,
      signatureUrl: `/uploads/signature-${fileName}.png`,
      base64Data: signatureData, // Include base64 for direct embedding
      name: name || 'Unknown',
      title: title || ''
    });
  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// Regenerate PDF from current content
router.post('/:id/regenerate-pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const document: any = await dbGet(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    let content = document.content || '';
    
    if (!content) {
      return res.status(400).json({ error: 'No content to generate PDF from' });
    }

    const path = require('path');
    const fs = require('fs');
    const puppeteer = require('puppeteer');
    
    // --- Start Logo Embedding Logic ---
    try {
      const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logoTelkom.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const logoDataUrl = `data:image/png;base64,${logoBase64}`;
        
        content = content.replace(/src=(?:"|')\/assets\/logoTelkom\.png(?:"|')/g, `src="${logoDataUrl}"`);
        console.log('✅ Logo embedded successfully into HTML content for PDF regeneration.');
      } else {
        console.warn('⚠️ Backend logo file not found at', logoPath);
      }
    } catch (e) {
      console.error('Error embedding logo for PDF regeneration:', e);
    }
    // --- End Logo Embedding Logic ---

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const pdfPath = path.join(uploadsDir, `sph-${req.params.id}.pdf`);

    console.log('🔄 Manually regenerating PDF for document:', req.params.id);

    // Generate PDF from content with signature support
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    await page.setContent(content, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for signature images to render properly
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: {
        top: '20mm',
        right: '20mm', 
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();
    
    console.log('✅ PDF regenerated successfully with all content');

    res.json({
      success: true,
      message: 'PDF regenerated successfully',
      pdfPath: `/uploads/sph-${req.params.id}.pdf`
    });
  } catch (error) {
    console.error('Regenerate PDF error:', error);
    res.status(500).json({ error: 'Failed to regenerate PDF' });
  }
});

// Update document status
router.patch('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'generated', 'signed', 'sent'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await dbRun(
      'UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, req.params.id, req.user!.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      message: 'Document status updated'
    });
  } catch (error) {
    console.error('Update document status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await dbRun(
      'DELETE FROM documents WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      message: 'Document deleted'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
