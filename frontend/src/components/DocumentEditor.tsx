import React, { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Save,
  Undo,
  Redo,
  PenTool,
  X
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface DocumentEditorProps {
  content: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SignatureData {
  url: string;
  base64Data?: string; // Optional base64 data for direct embedding
  name: string;
  title: string;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  content,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [addedSignatures, setAddedSignatures] = useState<SignatureData[]>([]);
  const signatureRef = useRef<SignatureCanvas>(null);

    const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Allow all HTML tags including img with data URLs
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4 border border-gray-300 rounded-lg',
      },
      // Allow all HTML content including images with data URLs
      handleDOMEvents: {},
    },
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onCreate: ({ editor }) => {
      // CRITICAL: Load the FULL HTML content with styling into TipTap
      console.log('🎨 Loading full HTML content with styling into TipTap...');
      
      // Check if content has full HTML structure
      if (content.includes('<html') || content.includes('<style>')) {
        // Extract only the body content for editing
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          const bodyContent = bodyMatch[1];
          console.log('📄 Extracted body content for editing:', bodyContent.length, 'chars');
          editor.commands.setContent(bodyContent, false);
        } else {
          console.log('⚠️ No body tag found, using content as-is');
          editor.commands.setContent(content, false);
        }
      } else {
        console.log('📄 Content is already body-only, using as-is');
        editor.commands.setContent(content, false);
      }
    },
  });

  const handleSave = () => {
    if (editor) {
      // Get base HTML content from TipTap (without signatures)
      let baseHTML = editor.getHTML();
      
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
    
    // Clean up any TipTap wrapper divs
    preservedContent = preservedContent
      .replace(/<div[^>]*class="[^"]*ProseMirror[^"]*"[^>]*>/gi, '')
      .replace(/<\/div>/gi, '');
    
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
    
    if (!editor) {
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
    if (signatureRef.current.isEmpty()) {
      console.error('❌ Signature canvas is empty');
      alert('Silakan gambar tanda tangan terlebih dahulu');
      return;
    }
    
    try {
      console.log('🎨 Generating signature image...');
      const signatureDataURL = signatureRef.current.toDataURL('image/png', 1.0);
      console.log('✅ Signature data URL generated, length:', signatureDataURL.length);
      
      // Save signature as file to server
      console.log('💾 Saving signature to server...');
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { documentsAPI } = await import('@/utils/api');
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
      console.log('✅ Signature added to state for manual construction');
      
      // Add visual indicator in editor (without actual image)
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
      const currentHTML = editor.getHTML();
      editor.commands.setContent(currentHTML + placeholderHTML, false);
      
      // Wait a moment and verify insertion
      setTimeout(() => {
        const currentHTML = editor.getHTML();
        console.log('📋 Current editor HTML length:', currentHTML.length);
        console.log('🖼️ HTML contains img tags:', currentHTML.includes('<img'));
        console.log('🔗 HTML contains signature URL:', currentHTML.includes(signatureUrl));
        console.log('🔍 HTML contains signature:', currentHTML.includes('Tanda Tangan Digital'));
      }, 100);
      
      // Close modal and reset form
      setShowSignaturePad(false);
      setSignatureName('');
      setSignatureTitle('');
      signatureRef.current.clear();
      
      console.log('✅ File-based signature process completed successfully');
      alert('✅ Tanda tangan berhasil ditambahkan ke dokumen! Klik "Simpan" untuk menyimpan perubahan.');
    } catch (error) {
      console.error('❌ Error adding signature:', error);
      alert('❌ Gagal menambahkan tanda tangan. Silakan coba lagi.');
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor.commands.toggleBold()}
            className={cn(
              "p-2 rounded hover:bg-gray-200 transition-colors",
              editor.isActive('bold') ? 'bg-gray-300' : ''
            )}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.commands.toggleItalic()}
            className={cn(
              "p-2 rounded hover:bg-gray-200 transition-colors",
              editor.isActive('italic') ? 'bg-gray-300' : ''
            )}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor.commands.focus()}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.commands.focus()}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.commands.focus()}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor.commands.undo()}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.commands.redo()}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <button
          onClick={() => setShowSignaturePad(true)}
          className="p-2 rounded hover:bg-gray-200 transition-colors bg-blue-50 text-blue-600"
          title="Add Signature"
        >
          <PenTool className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="btn-primary inline-flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <EditorContent 
          editor={editor} 
          className="min-h-[600px] max-h-[800px] overflow-y-auto"
        />
      </div>

      {/* Signature Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tanda Tangan Digital</h3>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Penandatangan
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jabatan (opsional)
                </label>
                <input
                  type="text"
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Contoh: Manager, Director"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanda Tangan
                </label>
                <div className="border border-gray-300 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 400,
                      height: 150,
                      className: 'signature-canvas w-full',
                      style: { width: '100%', height: '150px' }
                    }}
                    backgroundColor="white"
                    penColor="black"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Gambar tanda tangan Anda di area di atas
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={clearSignature}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Hapus Tanda Tangan
              </button>
              <div className="space-x-3">
                <button
                  onClick={() => setShowSignaturePad(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={addSignature}
                  disabled={!signatureName.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tambah Tanda Tangan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
