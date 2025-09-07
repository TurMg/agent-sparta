import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Eye,
  Edit,
  Share2,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import Layout from "@/components/Layout";
import LoadingSpinner from "@/components/LoadingSpinner";
import DocumentEditorMonaco from "@/components/DocumentEditorMonaco";
import { documentsAPI } from "@/utils/api";
import { Document } from "@/types";
import { formatDateTime, formatCurrency } from "@/utils/format";
import toast from "react-hot-toast";

const DocumentViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [documentData, setDocumentData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>("");

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    if (!id) return;

    try {
      const response = await documentsAPI.getById(id);
      if (response.data.success) {
        const docData = response.data.data;
        setDocument(docData);

        // Set document content for editor
        if (docData.content) {
          setDocumentContent(docData.content);
        } else if (docData.filePath) {
          // Load from HTML file (not PDF)
          const htmlPath = docData.filePath.replace(".pdf", ".html");
          try {
            const htmlResponse = await fetch(htmlPath);
            if (htmlResponse.ok) {
              const htmlContent = await htmlResponse.text();
              // Extract body content for editing
              const bodyMatch = htmlContent.match(
                /<body[^>]*>([\s\S]*)<\/body>/i
              );
              if (bodyMatch) {
                setDocumentContent(bodyMatch[1]);
              } else {
                setDocumentContent(htmlContent);
              }
            } else {
              console.error("HTML file not found, creating from data");
              setDocumentContent(generateEditableContent());
            }
          } catch (error) {
            console.error("Error loading HTML content:", error);
            setDocumentContent(generateEditableContent());
          }
        } else {
          // Generate editable content from data
          setDocumentContent(generateEditableContent());
        }

        if (docData.data) {
          // Handle both string and object data
          try {
            const parsedData =
              typeof docData.data === "string"
                ? JSON.parse(docData.data)
                : docData.data;
            setDocumentData(parsedData);
          } catch (error) {
            console.error("Error parsing document data:", error);
            console.log("Raw data:", docData.data);
            setDocumentData(null);
          }
        }
      } else {
        toast.error("Dokumen tidak ditemukan");
      }
    } catch (error) {
      console.error("Error loading document:", error);
      toast.error("Gagal memuat dokumen");
    } finally {
      setIsLoading(false);
    }
  };

  const generateEditableContent = () => {
    if (!documentData) return "<p>Loading document content...</p>";

    return `
      <div class="container" style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div class="header" style="border-bottom: 3px solid #e60012; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #e60012; margin: 0; font-size: 24px;">PT. Your Company</h1>
          <p style="margin: 2px 0; font-size: 12px;">Alamat Perusahaan</p>
          <p style="margin: 2px 0; font-size: 12px;">Telp: +62-21-xxxxxxxx | Email: info@company.com</p>
        </div>

        <div style="text-align: right; margin-bottom: 20px;">
          <p><strong>${formatDateTime(documentData.sphDate)}</strong></p>
        </div>

        <div style="margin-bottom: 30px;">
          <p><strong>Kepada Yth.</strong></p>
          <p><strong>${documentData.customerName}</strong></p>
          <p><strong>Di tempat</strong></p>
          <br>
          <p><strong>Perihal : Surat Penawaran Harga Layanan Internet</strong></p>
          <p><strong>Lampiran : -</strong></p>
        </div>

        <p>Dengan hormat,</p>
        <p>Kami mengucapkan terima kasih atas kepercayaan yang diberikan kepada <strong>PT. Your Company</strong> untuk dapat bekerjasama dengan <strong>${
          documentData.customerName
        }</strong> dalam layanan Internet Dedicated Astinet.</p>

        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <thead>
            <tr style="background-color: #c41e3a; color: white;">
              <th style="border: 1px solid #000; padding: 10px;">NO</th>
              <th style="border: 1px solid #000; padding: 10px;">Layanan</th>
              <th style="border: 1px solid #000; padding: 10px;">Jumlah</th>
              <th style="border: 1px solid #000; padding: 10px;">Biaya PSB</th>
              <th style="border: 1px solid #000; padding: 10px;">Biaya Normal</th>
              <th style="border: 1px solid #000; padding: 10px;">Biaya Diskon</th>
            </tr>
          </thead>
          <tbody>
            ${
              documentData.services
                ?.map(
                  (service: any, index: number) => `
              <tr>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${
                  index + 1
                }</td>
                <td style="border: 1px solid #000; padding: 10px;">${
                  service.serviceName
                }</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${
                  service.connectionCount
                }</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${formatCurrency(
                  service.psbFee
                )}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${formatCurrency(
                  service.monthlyFeeNormal
                )}</td>
                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${formatCurrency(
                  service.monthlyFeeDiscount
                )}</td>
              </tr>
            `
                )
                .join("") || ""
            }
          </tbody>
        </table>

        <div style="margin: 30px 0;">
          <p><strong>Syarat dan Ketentuan:</strong></p>
          <ol>
            <li>Belum termasuk PPN.</li>
            <li>Est. Delivery time layanan 30 hari kalender sejak penandatanganan Kontrak Berlangganan (KB).</li>
            <li>Penawaran berlaku selama 14 hari kalender sejak penawaran dikeluarkan.</li>
            <li>Penawaran bersifat terbatas/rahasia tidak diperkenankan disebarluaskan.</li>
          </ol>
        </div>

        <p>Demikian disampaikan dari surat penawaran harga ini, agar dapat menjadi bahan dasar pertimbangan oleh pihak manajemen <strong>${
          documentData.customerName
        }</strong>.</p>

        <p style="margin-top: 30px;">Hormat kami,</p>

        <div style="display: flex; justify-content: space-between; margin-top: 80px;">
          <div style="text-align: center; width: 200px;">
            <div style="height: 80px; border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
            <p><strong>ttd</strong></p>
            <br>
            <p><strong>Nama AM</strong></p>
            <p><strong>PT. Your Company</strong></p>
          </div>
          <div style="text-align: center; width: 200px;">
            <div style="height: 80px; border-bottom: 1px solid #000; margin-bottom: 10px;"></div>
            <p><strong>Tanda Tangan & Cap</strong></p>
            <p><strong>${documentData.customerName}</strong></p>
          </div>
        </div>
      </div>
    `;
  };

  const saveDocumentContent = async (content: string) => {
    if (!id) return;

    try {
      setIsSaving(true);

      // Create full HTML document
      const fullHTML = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPH - ${documentData?.customerName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #c41e3a; color: white; }
    </style>
</head>
<body>
${content}
</body>
</html>`;

      const response = await documentsAPI.updateContent(
        id,
        fullHTML,
        documentData
      );

      if (response.data.success) {
        setDocumentContent(content);
        setDocument((prev) => (prev ? { ...prev, content: fullHTML } : null));
        toast.success("Dokumen berhasil disimpan");
        setIsEditing(false);

        // Reload document to refresh preview
        await loadDocument();
      } else {
        toast.error("Gagal menyimpan dokumen");
      }
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Gagal menyimpan dokumen");
    } finally {
      setIsSaving(false);
    }
  };

  const regeneratePDF = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      toast.loading("Regenerating PDF dengan perubahan terbaru...");

      const response = await documentsAPI.regeneratePDF(id);

      if (response.data.success) {
        toast.dismiss();
        toast.success(
          "PDF berhasil diupdate dengan semua perubahan dan tanda tangan!"
        );

        // Reload document to get updated file path
        await loadDocument();
      } else {
        toast.dismiss();
        toast.error("Gagal regenerate PDF");
      }
    } catch (error) {
      console.error("Error regenerating PDF:", error);
      toast.dismiss();
      toast.error("Gagal regenerate PDF");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!id) return;

    try {
      const response = await documentsAPI.updateStatus(id, newStatus);
      if (response.data.success && document) {
        setDocument({ ...document, status: newStatus as any });
        toast.success("Status dokumen berhasil diupdate");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Gagal mengupdate status dokumen");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "generated":
        return "bg-blue-100 text-blue-800";
      case "signed":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "generated":
        return "Generated";
      case "signed":
        return "Signed";
      case "sent":
        return "Sent";
      default:
        return status;
    }
  };

  const calculateTotal = (services: any[]) => {
    if (!services) return 0;
    return services.reduce((total, service) => {
      const serviceTotal =
        (service.psbFee + service.monthlyFeeDiscount) * service.connectionCount;
      return total + serviceTotal;
    }, 0);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Dokumen tidak ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Dokumen yang Anda cari tidak ada atau telah dihapus.
          </p>
          <Link to="/documents" className="btn-primary">
            Kembali ke Dokumen
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/documents"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {document.title}
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                    document.status
                  )}`}
                >
                  {getStatusLabel(document.status)}
                </span>
                <span className="text-sm text-gray-500">
                  Dibuat: {formatDateTime(document.createdAt)}
                </span>
                <span className="text-sm text-gray-500">
                  Tipe: {document.type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 flex-wrap">
            {document.filePath && (
              <>
                <a
                  href={document.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Dokumen
                </a>
                <a
                  href={document.filePath.replace(".html", ".pdf")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary inline-flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Selesai Edit" : "Edit Dokumen"}
            </button>

            {document.status !== "signed" && (
              <button
                onClick={() => setShowSignatureModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Tanda Tangan
              </button>
            )}

            <button
              onClick={regeneratePDF}
              disabled={isSaving}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {isSaving ? "Updating..." : "Update PDF"}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link dokumen berhasil disalin");
              }}
              className="btn-secondary inline-flex items-center"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>

        {/* Document Editor */}
        {isEditing && documentContent && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Dokumen
            </h2>
            <DocumentEditorMonaco
              content={documentContent}
              onSave={saveDocumentContent}
            />
          </div>
        )}

        {/* Document Preview */}
        {!isEditing && documentData && (
          <div className="space-y-8">
            {/* Customer Info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informasi Pelanggan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Nama Pelanggan
                  </label>
                  <p className="text-gray-900">{documentData.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Tanggal SPH
                  </label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(documentData.sphDate).toLocaleDateString(
                      "id-ID",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Detail Layanan
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Layanan
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Biaya PSB
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Biaya Bulanan Normal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Biaya Bulanan Diskon
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentData.services?.map(
                      (service: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {service.serviceName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {service.connectionCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(service.psbFee)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(service.monthlyFeeNormal)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(service.monthlyFeeDiscount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(
                              (service.psbFee + service.monthlyFeeDiscount) *
                                service.connectionCount
                            )}
                          </td>
                        </tr>
                      )
                    )}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={5}
                        className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right"
                      >
                        TOTAL
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900 text-right">
                        {formatCurrency(calculateTotal(documentData.services))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {documentData.notes && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Catatan
                </h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {documentData.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Attachments */}
            {documentData.attachments &&
              documentData.attachments.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Lampiran
                  </h2>
                  <div className="space-y-2">
                    {documentData.attachments.map(
                      (attachment: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <span className="text-gray-900">{attachment}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Document Preview */}
            {document.filePath && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Preview Dokumen
                </h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Preview terbatas:</strong> Tanda tangan mungkin
                    tidak terlihat dalam preview iframe karena security policy.
                    Untuk melihat dokumen lengkap dengan tanda tangan, silakan
                    buka di tab baru.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src={document.filePath.replace(".pdf", ".html")}
                    className="w-full h-96"
                    title="Document Preview"
                    sandbox="allow-same-origin"
                  />
                </div>

                <div className="mt-4 text-center space-x-4">
                  <a
                    href={document.filePath.replace(".pdf", ".html")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Buka HTML (dengan tanda tangan)
                  </a>
                  <a
                    href={document.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Final
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature Modal */}
        {showSignatureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Tanda Tangan Digital
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Penandatangan
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Masukkan nama penandatangan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Masukkan jabatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Tanda Tangan (opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    updateStatus("signed");
                    setShowSignatureModal(false);
                    toast.success("Dokumen berhasil ditandatangani");
                  }}
                  className="btn-primary"
                >
                  Tanda Tangan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DocumentViewerPage;
