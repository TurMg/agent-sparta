import React, { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { toast } from "react-hot-toast";
import { documentsAPI } from "@/utils/api";
import { Eye, Code } from "lucide-react";

interface SignatureData {
  url: string;
  base64Data?: string;
  name: string;
  title: string;
}

interface DocumentEditorMonacoProps {
  content: string;
  onSave: (content: string) => void;
}

export default function DocumentEditorMonaco({
  content,
  onSave,
}: DocumentEditorMonacoProps) {
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [addedSignatures, setAddedSignatures] = useState<SignatureData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(""); // State untuk konten srcDoc iframe

  const signatureRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureContext, setSignatureContext] =
    useState<CanvasRenderingContext2D | null>(null);

  // Fungsi untuk beralih antara editor dan preview
  const handleTogglePreview = () => {
    if (!showPreview) {
      // Jika akan beralih KE mode preview
      if (editorRef.current) {
        const currentContent = editorRef.current.getValue();
        const fullHtml = restoreCompleteDocumentStructure(currentContent);
        setPreviewHtml(fullHtml); // Set HTML untuk srcDoc
      }
    }
    setShowPreview(!showPreview);
  };

  const handleAddSignatureClick = () => {
    // Jika sedang dalam mode pratinjau, kembali ke editor terlebih dahulu
    if (showPreview) {
      setShowPreview(false);
    }
    // Kemudian, buka jendela tanda tangan
    setShowSignaturePad(true);
  };

  // Function to handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set language to HTML for better syntax highlighting
    monaco.editor.setModelLanguage(editor.getModel(), "html");

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 12,
      lineHeight: 18,
      wordWrap: "on",
      wrappingStrategy: "advanced",
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    console.log("🚀 Monaco Editor mounted successfully");
  };

  const handleSave = () => {
    if (editorRef.current) {
      setIsSaving(true);
      try {
        // Langsung ambil konten mentah dari editor
        const rawHtmlContent = editorRef.current.getValue();

        // Kirim konten mentah ini ke komponen induk untuk diproses
        onSave(rawHtmlContent);

        toast.success("Dokumen berhasil disimpan!");
      } catch (error) {
        console.error("❌ Error saving document:", error);
        toast.error("Gagal menyimpan dokumen");
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
      .replace(/<html[^>]*>/gi, "")
      .replace(/<\/html>/gi, "")
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<body[^>]*>/gi, "")
      .replace(/<\/body>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

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
        .company-logo {
            text-align: right;
        }
        .company-logo img {
            max-height: 50px;
            width: auto;
            object-fit: contain;
        }
        .company-info {
            flex: 1;
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
        .document-title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0;
            text-decoration: underline;
        }
        .customer-info {
            margin-bottom: 20px;
        }
        .customer-info table {
            width: 100%;
        }
        .customer-info td {
            padding: 3px 0;
            vertical-align: top;
        }
        .customer-info td:first-child {
            width: 120px;
            font-weight: bold;
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
        .services-table .number {
            text-align: center;
            width: 40px;
        }
        .services-table .currency {
            text-align: center;
        }
        .total-row {
            background-color: #f9f9f9;
            font-weight: bold;
        }
        .notes {
            margin: 15px 0;
            padding: 10px;
            background-color: #f9f9f9;
            border-left: 3px solid #c41e3a;
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
            margin: 10px 0 8px 0;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        @media print {
            body { margin: 0; }
            .container { border: none; }
            @page { margin: 12mm; }
        }
        @media print {
            body { margin: 0; }
            .container { border: none; box-shadow: none; }
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
    if (!signatureRef.current || !editorRef.current || !monacoRef.current) {
      alert("Editor atau canvas tanda tangan belum siap.");
      return;
    }
    if (!signatureName.trim()) {
      alert("Silakan masukkan nama penandatangan");
      return;
    }
    if (isSignatureEmpty()) {
      alert("Silakan gambar tanda tangan terlebih dahulu");
      return;
    }

    try {
      const signatureDataURL = signatureRef.current?.toDataURL(
        "image/png",
        1.0
      );
      if (!signatureDataURL)
        throw new Error("Gagal membuat gambar tanda tangan");

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const response = (await documentsAPI.saveSignature(
        signatureDataURL,
        fileName
      )) as any;
      if (!response.data.success)
        throw new Error("Gagal menyimpan tanda tangan di server");

      const { base64Data } = response.data;

      let titleHTML = "";

      if (signatureTitle && signatureTitle.trim() !== "") {
        titleHTML = `<p style="text-transform: capitalize; text-align: center; align-content: center ; margin: 0; font-weight: bold; padding-top: 5px;">${signatureTitle}</p>`;
      }

      // Blok HTML final untuk tanda tangan digital
      const finalSignatureHTML = `
      <div style="text-align: left; width: 180px; font-size: 11px; margin-top: -20px;">
          <img src="${base64Data}" alt="Signature for ${signatureName}" style="min-width: 180px; height: 60px; margin-bottom: 5px; align-content: center; justify-content: center;" />
          <p style="text-transform: capitalize; text-align: center; align-content: center ; margin: 0; font-weight: bold; padding-top: 5px; border-top: 1px solid #000;">${signatureName}</p>
          ${titleHTML}
          <p style="text-transform: capitalize; text-align: center; align-content: center ; margin: 0; font-weight: bold; padding-top: 5px;">PT. Telkom Indonesia</p>
          </div>
    `;

      const editor = editorRef.current;
      const model = editor.getModel();

      if (!model) {
        toast.error("Editor model tidak tersedia. Silakan coba lagi.");
        return;
      }

      // Pencarian yang lebih cerdas untuk menemukan seluruh blok div placeholder
      const searchText = `<div style="text-align: center; width: 180px;">`;
      const match = model.findNextMatch(
        searchText,
        { column: 1, lineNumber: 1 },
        false,
        false,
        null,
        true
      );

      if (match) {
        // Jika placeholder ditemukan, kita perluas jangkauan untuk mencakup seluruh blok div
        const startLine = match.range.startLineNumber;
        // Asumsikan bloknya memiliki 5 baris, sesuaikan jika perlu
        const endLine = startLine + 5;
        const endColumn = model.getLineMaxColumn(endLine);

        const replacementRange = new monacoRef.current.Range(
          startLine,
          1,
          endLine,
          endColumn
        );

        editor.executeEdits("replace-signature-block", [
          {
            range: replacementRange,
            text: finalSignatureHTML,
            forceMoveMarkers: true,
          },
        ]);
        toast.success("Tanda tangan berhasil ditempatkan!");
      } else {
        // Fallback jika placeholder tidak ditemukan
        const lastLine = model.getLineCount();
        const lastColumn = model.getLineMaxColumn(lastLine);
        const range = new monacoRef.current.Range(
          lastLine,
          lastColumn,
          lastLine,
          lastColumn
        );
        editor.executeEdits("add-signature-fallback", [
          {
            range: range,
            text: finalSignatureHTML,
            forceMoveMarkers: true,
          },
        ]);
        toast.success(
          "Placeholder standar tidak ditemukan. Tanda tangan ditambahkan di akhir."
        );
      }

      setShowSignaturePad(false);
      setSignatureName("");
      setSignatureTitle("");
      clearSignature();
    } catch (error) {
      console.error("❌ Error adding signature:", error);
      toast.error("❌ Gagal menambahkan tanda tangan.");
    }
  };

  // Setup signature canvas
  useEffect(() => {
    if (signatureRef.current) {
      const canvas = signatureRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Configure drawing context
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        setSignatureContext(ctx);
        console.log("🎨 Signature canvas initialized");
      }
    }
  }, [showSignaturePad]);

  // Signature drawing functions
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    setIsDrawing(true);
    const canvas = signatureRef.current;
    if (!canvas || !signatureContext) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
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

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !signatureContext) return;

    const canvas = signatureRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ("touches" in e) {
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

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    if (signatureRef.current && signatureContext) {
      signatureContext.clearRect(
        0,
        0,
        signatureRef.current.width,
        signatureRef.current.height
      );
    }
  };

  const isSignatureEmpty = () => {
    if (!signatureRef.current || !signatureContext) return true;

    const canvas = signatureRef.current;
    const imageData = signatureContext.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const data = imageData.data;

    // Check if canvas has any non-transparent pixels
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
    return true;
  };

  // Extract body content for editing (remove HTML structure)
  const getEditableContent = () => {
    if (content.includes("<html") || content.includes("<body")) {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        return bodyMatch[1];
      }
    }
    return content;
  };

  return (
    <div className="space-y-4">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Menyimpan..." : "💾 Simpan"}
        </button>

        <button
          onClick={handleAddSignatureClick}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ✍️ Tambah Tanda Tangan
        </button>

        <button
          onClick={handleTogglePreview}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
        >
          {showPreview ? (
            <Code className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {showPreview ? "Editor" : "Visual"}
        </button>

        <div className="ml-auto text-sm text-gray-600">
          {addedSignatures.length > 0 && (
            <span>📝 {addedSignatures.length} tanda tangan ditambahkan</span>
          )}
        </div>
      </div>

      {/* Monaco Editor or Visual Preview */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {showPreview ? (
          <iframe
            srcDoc={previewHtml}
            title="Document Preview"
            className="w-full"
            style={{ height: "600px" }}
            sandbox="allow-scripts"
          />
        ) : (
          <Editor
            height="600px"
            defaultLanguage="html"
            value={getEditableContent()}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineHeight: 18,
              wordWrap: "on",
              wrappingStrategy: "advanced",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              theme: "vs-light",
            }}
          />
        )}
      </div>

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
                    style={{ touchAction: "none" }}
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
