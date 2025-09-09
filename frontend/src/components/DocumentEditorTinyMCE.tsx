import React, { useState, useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { toast } from "react-hot-toast";
import { documentsAPI } from "@/utils/api";
import { Eye, Code } from "lucide-react";
import { Editor as TinyMCEEditor } from "tinymce";

interface DocumentEditorTinyMCEProps {
  editableContent: string;
  documentStyles: string;
  onContentChange: (newContent: string) => void;
  onSave: () => void;
  isLoading?: boolean;
}

const DocumentEditorTinyMCE: React.FC<DocumentEditorTinyMCEProps> = ({
  editableContent,
  documentStyles,
  onContentChange,
  onSave,
  isLoading,
}) => {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureTitle, setSignatureTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureContext, setSignatureContext] =
    useState<CanvasRenderingContext2D | null>(null);
  const [signatureMode, setSignatureMode] = useState<"canvas" | "upload">(
    "canvas"
  );
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(
    null
  );

  const getPreviewHtml = () => {
    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <title>Preview Dokumen</title>
          <style>${documentStyles}</style>
      </head>
      <body>
          <div class="container">${editableContent}</div>
      </body>
      </html>
    `;
  };

  const closeSignatureModal = () => {
    setShowSignaturePad(false);
    setSignatureName("");
    setSignatureTitle("");
    clearSignature();
    setUploadedSignature(null);
    setSignatureMode("canvas");
  };

  const addSignature = async () => {
    const editor = editorRef.current;
    if (!editor) {
      toast.error("Editor belum siap.");
      return;
    }

    if (!signatureName.trim()) {
      toast.error("Nama penandatangan harus diisi.");
      return;
    }

    let signatureDataURL: string | null = null;

    if (signatureMode === "canvas") {
      if (isSignatureEmpty()) {
        toast.error("Gambar tanda tangan harus diisi.");
        return;
      }
      signatureDataURL = signatureRef.current!.toDataURL("image/png", 1.0);
    } else if (signatureMode === "upload") {
      if (!uploadedSignature) {
        toast.error("Silakan unggah file tanda tangan.");
        return;
      }
      signatureDataURL = uploadedSignature;
    }

    if (!signatureDataURL) {
      toast.error("Gagal mendapatkan data tanda tangan.");
      return;
    }

    try {
      const fileName = `${Date.now()}`;
      const response = (await documentsAPI.saveSignature(
        signatureDataURL,
        fileName
      )) as any;

      if (!response.data.success) {
        throw new Error("Gagal menyimpan tanda tangan.");
      }

      const { base64Data } = response.data;
      const titleHTML =
        signatureTitle.trim() !== ""
          ? `<p style=\"text-transform: capitalize; text-align: center; margin: 0; font-weight: bold; padding-top: 5px;\">${signatureTitle}</p>`
          : "";

      const finalSignatureHTML = `<div style=\"text-align: left; width: 180px; font-size: 11px; margin-top: -20px;\">
          <img src=\" ${base64Data}\" alt=\"Signature for ${signatureName}\" style=\"min-width: 180px; height: 60px; margin-bottom: 5px;\" />
          <p style=\"text-transform: capitalize; text-align: center; margin: 0; font-weight: bold; padding-top: 5px; border-top: 1px solid #000;\">${signatureName}</p>
          ${titleHTML}
          <p style=\"text-align: center; margin: 0; font-weight: bold; padding-top: 5px;\">PT. Telkom Indonesia</p>
      </div>`;

      let currentHtml = editor.getContent();
      // Regex to find an existing signature block
      const existingSignatureRegex = new RegExp(
        /<div style=\"text-align: left; width: 180px[^>]*>[\s\S]*?alt=\"Signature for [\n\s\S]*?<\/div>/
      );
      const placeholderRegex = new RegExp(
        /<div style=\"text-align: center; width: 180px;[^>]*>[\s\S]*?<p><strong>Nama AM<\/strong><\/p>[\s\S]*?<\/div>/
      );
      let newHtml;

      if (existingSignatureRegex.test(currentHtml)) {
        newHtml = currentHtml.replace(
          existingSignatureRegex,
          finalSignatureHTML
        );
        toast.success("Tanda tangan berhasil diperbarui!");
      } else if (placeholderRegex.test(currentHtml)) {
        newHtml = currentHtml.replace(placeholderRegex, finalSignatureHTML);
        toast.success("Tanda tangan berhasil menggantikan placeholder!");
      } else {
        newHtml = currentHtml + finalSignatureHTML;
        toast.success("Tanda tangan ditambahkan di akhir dokumen.");
      }

      editor.setContent(newHtml);
      onContentChange(newHtml);
      closeSignatureModal();
    } catch (error) {
      console.error("Error adding signature:", error);
      toast.error("Gagal menambahkan tanda tangan.");
    }
  };

  useEffect(() => {
    if (showSignaturePad && signatureMode === "canvas" && signatureRef.current) {
      const canvas = signatureRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // A short timeout ensures the canvas element is fully rendered in the DOM
        // before we try to get its dimensions, preventing a race condition.
        setTimeout(() => {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          setSignatureContext(ctx);
        }, 0);
      }
    }
  }, [showSignaturePad, signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!signatureContext) return;
    setIsDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    signatureContext.beginPath();
    signatureContext.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !signatureContext) return;
    const { offsetX, offsetY } = e.nativeEvent;
    signatureContext.lineTo(offsetX, offsetY);
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
    const data = signatureContext.getImageData(
      0,
      0,
      signatureRef.current.width,
      signatureRef.current.height
    ).data;
    return !data.some((channel) => channel !== 0);
  };

  const handleSignatureFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSignature(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleSignaturePad = () => {
    if (showPreview) {
      setShowPreview(false);
      toast.success("Mode visual dinonaktifkan untuk menambahkan tanda tangan.");
    }
    setShowSignaturePad(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <button
          onClick={onSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Menyimpan..." : "💾 Simpan"}
        </button>
        <button
          onClick={handleToggleSignaturePad}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ✍️ Tambah Tanda Tangan
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
        >
          {showPreview ? (
            <Code className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {showPreview ? "Editor" : "Visual"}
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {showPreview ? (
          <iframe
            srcDoc={getPreviewHtml()}
            title="Document Preview"
            className="w-full"
            style={{ height: "700px" }}
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <Editor
            tinymceScriptSrc="/assets/tinymce/tinymce.min.js"
            onInit={(evt, editor) => (editorRef.current = editor)}
            value={editableContent}
            onEditorChange={(content) => onContentChange(content)}
            init={{
              height: 700,
              menubar: true,
              plugins:
                "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount",
              toolbar:
                "undo redo | blocks | " +
                "bold italic underline strikethrough | " +
                "fontfamily fontsize | forecolor backcolor | " +
                "alignleft aligncenter alignright alignjustify | " +
                "bullist numlist outdent indent | " +
                "link image media table | " +
                "code preview fullscreen | removeformat | help",
              skin_url: "/assets/tinymce/skins/ui/oxide",
              content_css: "/assets/tinymce/skins/content/default/content.css",
              body_class: "container",
              branding: false,
              promotion: false,
            }}
          />
        )}
      </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan jabatan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Tanda Tangan
                </label>
                <div className="border-b border-gray-200 mb-2">
                  <nav className="-mb-px flex gap-4" aria-label="Tabs">
                    <button
                      onClick={() => setSignatureMode("canvas")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        signatureMode === "canvas"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Gambar Langsung
                    </button>
                    <button
                      onClick={() => setSignatureMode("upload")}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                        signatureMode === "upload"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Unggah File
                    </button>
                  </nav>
                </div>

                {signatureMode === "canvas" ? (
                  <div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg">
                      <canvas
                        ref={signatureRef}
                        className="w-full h-32 border-gray-200 rounded cursor-crosshair"
                        style={{ touchAction: "none" }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Gambar tanda tangan di atas
                      </p>
                      <button
                        onClick={clearSignature}
                        className="px-3 py-1 text-sm bg-gray-500 text-white rounded"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleSignatureFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploadedSignature && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700">
                          Preview:
                        </p>
                        <img
                          src={uploadedSignature}
                          alt="Signature Preview"
                          className="border mt-2 rounded"
                          style={{ maxWidth: "100%", maxHeight: "128px" }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={addSignature}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded"
              >
                ✅ Tambahkan
              </button>
              <button
                onClick={closeSignatureModal}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded"
              >
                ❌ Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditorTinyMCE;
