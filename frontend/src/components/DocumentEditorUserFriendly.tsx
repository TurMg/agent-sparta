import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';
import { documentsAPI } from '@/utils/api';
import { Eye, Code, Save, PenTool } from 'lucide-react';

interface SignatureData {
  url: string;
  base64Data?: string;
  name: string;
  title: string;
}

interface DocumentEditorUserFriendlyProps {
  content: string;
  onSave: (content: string) => void;
}

export default function DocumentEditorUserFriendly({ content, onSave }: DocumentEditorUserFriendlyProps) {
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [addedSignatures, setAddedSignatures] = useState<SignatureData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureContext, setSignatureContext] = useState<CanvasRenderingContext2D | null>(null);

  // Setup signature canvas
  useEffect(() => {
    if (signatureRef.current) {
      const canvas = signatureRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Configure drawing context
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        setSignatureContext(ctx);
        console.log('🎨 Signature canvas initialized');
      }
    }
  }, [showSignaturePad]);

  // Load content with proper styling when component mounts or content changes
  useEffect(() => {
    if (quillRef.current && content) {
      const quill = quillRef.current.getEditor();
      const editableContent = getEditableContent();
      
      console.log('📄 Loading content into Quill editor:', editableContent.length, 'chars');
      console.log('🎨 Content includes styling:', editableContent.includes('class='));
      
      // Set content with HTML formatting preserved
      quill.root.innerHTML = editableContent;
      
      // Safe update - check if quill is ready
      try {
        if (quill.scroll && typeof quill.update === 'function') {
          quill.update();
        }
      } catch (error) {
        console.log('⚠️ Quill update skipped (not ready yet)');
      }
    }
  }, [content]);

  // Signature drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureRef.current;
    if (!canvas || !signatureContext) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    signatureContext.beginPath();
    signatureContext.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !signatureContext) return;
    
    const canvas = signatureRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    signatureContext.lineTo(x, y);
    signatureContext.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (signatureRef.current && signatureContext) {
      signatureContext.clearRect(0, 0, signatureRef.current.width, signatureRef.current.height);
    }
  };

  const isSignatureEmpty = () => {
    if (!signatureRef.current || !signatureContext) return true;
    
    const canvas = signatureRef.current;
    const imageData = signatureContext.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if canvas has any non-transparent pixels
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
    return true;
  };

  // Extract body content for editing (remove HTML structure)
  const getEditableContent = () => {
    if (content.includes('<html') || content.includes('<body')) {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        // Extract body content but preserve styling
        let bodyContent = bodyMatch[1];
        
        // Remove container div but keep inner content
        bodyContent = bodyContent.replace(/<div[^>]*class="container"[^>]*>([\s\S]*?)<\/div>/gi, '$1');
        
        console.log('📄 Extracted body content for editing:', bodyContent.length, 'chars');
        return bodyContent;
      }
    }
    return content;
  };

  const handleSave = () => {
    if (quillRef.current) {
      setIsSaving(true);
      
      try {
        // Get content from Quill
        let baseHTML = quillRef.current.getEditor().root.innerHTML;
        
        // CRITICAL: Always restore complete document structure to prevent styling loss
        console.log('🔄 Restoring complete document structure...');
        baseHTML = restoreCompleteDocumentStructure(baseHTML);
        
        // Manually append signatures that were added
        if (addedSignatures.length > 0) {
          console.log('📝 Appending', addedSignatures.length, 'signatures to document');
          
          addedSignatures.forEach((sig, index) => {
            console.log(`🖼️ Adding signature ${index + 1} with URL:`, sig.url);
            
            const signatureHTML = `
              <div style="margin-top: 20px; text-align: left;">
                <p style="margin: 5px 0;"><strong>ttd</strong></p>
                <img src="${sig.base64Data || `http://localhost:3001${sig.url}`}" alt="Signature-${sig.name}" style="max-width: 200px; height: auto; margin: 5px 0; display: block;" />
                <p style="margin: 5px 0;"><strong>${sig.name}</strong></p>
                ${sig.title ? `<p style="margin: 5px 0;">${sig.title}</p>` : ''}
              </div>
            `;
            baseHTML += signatureHTML;
          });
        }
        
        console.log('💾 Final document HTML length:', baseHTML.length);
        console.log('💾 Final includes images:', baseHTML.includes('<img'));
        console.log('💾 Number of signatures included:', addedSignatures.length);
        
        onSave(baseHTML);
        toast.success('Dokumen berhasil disimpan!');
      } catch (error) {
        console.error('❌ Error saving document:', error);
        toast.error('Gagal menyimpan dokumen');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Function to ALWAYS restore complete document structure
  const restoreCompleteDocumentStructure = (htmlContent: string): string => {
    // Extract only the content we want to preserve (text, tables, etc.)
    let preservedContent = htmlContent;
    
    // Remove any existing HTML structure tags
    preservedContent = preservedContent
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Always return complete document structure
    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Surat Penawaran Harga</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 15px;
                  background-color: #fff;
                  color: #333;
                  line-height: 1.3;
                  font-size: 11px;
              }
              .container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  padding: 20px;
                  border: none;
              }
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #ccc;
                  padding-bottom: 15px;
                  margin-bottom: 20px;
              }
              .company-logo img {
                  max-height: 50px;
                  width: auto;
                  object-fit: contain;
              }
              .company-info h1 {
                  color: #333;
                  margin: 0;
                  font-size: 18px;
                  font-weight: bold;
              }
              .company-info p {
                  margin: 2px 0;
                  color: #333;
                  font-size: 10px;
              }
              .customer-info {
                  margin-bottom: 20px;
              }
              .customer-info p {
                  margin: 5px 0;
              }
              .services-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 15px 0;
                  font-size: 10px;
              }
              .services-table th,
              .services-table td {
                  border: 1px solid #000;
                  padding: 6px 4px;
                  text-align: center;
              }
              .services-table th {
                  background-color: #c41e3a;
                  color: white;
                  font-weight: bold;
              }
              .signature-section {
                  margin-top: 20px;
                  display: flex;
                  justify-content: space-between;
              }
              .signature-box {
                  text-align: center;
                  width: 180px;
              }
              .signature-line {
                  border-bottom: 1px solid #000;
                  margin: 30px 0 8px 0;
              }
              /* Preserve Quill alignment classes */
              .ql-align-center { text-align: center; }
              .ql-align-right { text-align: right; }
              .ql-align-left { text-align: left; }
              .ql-align-justify { text-align: justify; }
              
              /* Preserve Quill formatting */
              strong, b { font-weight: bold; }
              em, i { font-style: italic; }
              u { text-decoration: underline; }
              s, strike { text-decoration: line-through; }
              
              /* Table styling */
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
              th { background-color: #c41e3a; color: white; font-weight: bold; }
              
              /* List styling */
              ol, ul { margin: 10px 0; padding-left: 20px; }
              li { margin: 5px 0; }
              
              /* Image styling */
              img { max-width: 100%; height: auto; }
              
              @media print {
                  body { margin: 0; }
                  .container { border: none; }
                  @page { margin: 12mm; }
              }
          </style>
      </head>
      <body>
          <div class="container">
              ${preservedContent}
          </div>
      </body>
      </html>
    `;
  };

  const addSignature = async () => {
    console.log('🖊️ Starting file-based signature addition process...');
    
    if (!signatureRef.current) {
      console.error('❌ Signature canvas not found');
      alert('Error: Signature canvas tidak ditemukan');
      return;
    }
    
    if (!quillRef.current) {
      console.error('❌ Editor not found');
      alert('Error: Editor tidak ditemukan');
      return;
    }
    
    if (!signatureName.trim()) {
      console.error('❌ Signature name is required');
      alert('Silakan masukkan nama penandatangan');
      return;
    }
    
    // Check if signature canvas is not empty
    if (isSignatureEmpty()) {
      console.error('❌ Signature canvas is empty');
      alert('Silakan gambar tanda tangan terlebih dahulu');
      return;
    }
    
    try {
      console.log('🎨 Generating signature image...');
      const signatureDataURL = signatureRef.current?.toDataURL('image/png', 1.0);
      if (!signatureDataURL) {
        throw new Error('Failed to generate signature image');
      }
      console.log('✅ Signature data URL generated, length:', signatureDataURL.length);
      
      // Save signature as file to server
      console.log('💾 Saving signature to server...');
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await documentsAPI.saveSignature(signatureDataURL, fileName) as any;
      
      if (!response.data.success) {
        throw new Error('Failed to save signature to server');
      }
      
      const signatureUrl = response.data.signatureUrl;
      const base64Data = response.data.base64Data;
      console.log('✅ Signature saved to server:', signatureUrl);
      
      // Add signature to state for manual handling with base64 data
      const newSignature: SignatureData = {
        url: signatureUrl,
        base64Data: base64Data, // Use server response base64 data
        name: signatureName,
        title: signatureTitle
      };
      
      setAddedSignatures(prev => [...prev, newSignature]);
      console.log('✅ Signature added to state with base64 data');
      
      // Add visual indicator in editor for visual feedback
      const placeholderHTML = `
        <div style="margin-top: 20px; text-align: left;">
          <p style="margin: 5px 0;"><strong>ttd</strong></p>
          <div style="width: 200px; height: 80px; border: 1px dashed #ccc; margin: 5px 0; display: flex; align-items: center; justify-content: center; background: white;">
            <span style="color: #666; font-size: 12px;">Signature: ${signatureName}</span>
          </div>
          <p style="margin: 5px 0;"><strong>${signatureName}</strong></p>
          ${signatureTitle ? `<p style="margin: 5px 0;">${signatureTitle}</p>` : ''}
        </div>
      `;
      
      // Insert placeholder in editor for visual feedback
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      if (range) {
        quill.insertEmbed(range.index, 'div', placeholderHTML);
      }
      
      // Close modal and reset form
      setShowSignaturePad(false);
      setSignatureName('');
      setSignatureTitle('');
      clearSignature();
      
      console.log('✅ File-based signature process completed successfully');
      toast.success('✅ Tanda tangan berhasil ditambahkan ke dokumen! Klik "Simpan" untuk menyimpan perubahan.');
    } catch (error) {
      console.error('❌ Error adding signature:', error);
      toast.error('❌ Gagal menambahkan tanda tangan. Silakan coba lagi.');
    }
  };

  const toggleHtmlEditor = () => {
    if (showHtmlEditor) {
      // Switch back to visual editor
      setShowHtmlEditor(false);
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        quill.root.innerHTML = htmlContent;
      }
    } else {
      // Switch to HTML editor
      if (quillRef.current) {
        const quill = quillRef.current.getEditor();
        const currentContent = quill.root.innerHTML;
        setHtmlContent(currentContent);
        setShowHtmlEditor(true);
      }
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtmlContent(e.target.value);
  };

  const applyHtmlChanges = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.root.innerHTML = htmlContent;
      setShowHtmlEditor(false);
      toast.success('Perubahan HTML berhasil diterapkan!');
    }
  };

  // Quill modules and formats
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
    },
    // Better HTML handling
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true
    },
    // Disable problematic features
    keyboard: {
      bindings: {
        tab: false
      }
    }
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link', 'image'
  ];

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
        
        <button
          onClick={() => setShowSignaturePad(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
        >
          <PenTool className="w-4 h-4" />
          Tambah Tanda Tangan
        </button>
        
        <button
          onClick={toggleHtmlEditor}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            showHtmlEditor 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {showHtmlEditor ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          {showHtmlEditor ? 'Visual Editor' : 'HTML Editor'}
        </button>
        
        <div className="ml-auto text-sm text-gray-600">
          {addedSignatures.length > 0 && (
            <span>📝 {addedSignatures.length} tanda tangan ditambahkan</span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      {showHtmlEditor ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">HTML Editor</h3>
            <button
              onClick={applyHtmlChanges}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Terapkan Perubahan
            </button>
          </div>
          <textarea
            value={htmlContent}
            onChange={handleHtmlChange}
            className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
            placeholder="Edit HTML content here..."
          />
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={getEditableContent()}
            onChange={() => {}} // We handle content manually
            modules={modules}
            formats={formats}
            style={{ height: '500px' }}
            placeholder="Mulai menulis dokumen..."

          />
        </div>
      )}

      {/* Signature Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Tambah Tanda Tangan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Penandatangan
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan nama"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jabatan/Title (Opsional)
                </label>
                <input
                  type="text"
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan jabatan"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Tanda Tangan
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <canvas
                    ref={signatureRef}
                    className="w-full h-32 border border-gray-200 rounded cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Gambar tanda tangan di atas dengan mouse atau touch
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={clearSignature}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={addSignature}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✅ Tambahkan
              </button>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                ❌ Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
