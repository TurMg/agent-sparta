import handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { SPHData } from '../../types';

// Register Handlebars helpers
handlebars.registerHelper('formatCurrency', function(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
});

handlebars.registerHelper('formatDate', function(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString; // fallback to original string
  }
});

handlebars.registerHelper('calculateTotal', function(services: any[]) {
  return services.reduce((total, service) => {
    const serviceTotal = (service.psbFee + service.monthlyFeeDiscount) * service.connectionCount;
    return total + serviceTotal;
  }, 0);
});

const SPH_TEMPLATE = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surat Penawaran Harga - {{customerName}}</title>
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
            margin: 30px 0 8px 0;
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
        <div class="header">
            <div class="company-info">
                <h1>{{companyName}}</h1>
                <p>{{companyAddress}}</p>
            </div>
            <div class="company-logo">
                <img src="/uploads/logo.png" alt="Company Logo" style="max-height: 50px; width: auto;">
            </div>
        </div>

        <div style="text-align: right; margin-bottom: 15px;">
            <p><strong>{{formatDate sphDate}}</strong></p>
        </div>

        <div class="customer-info">
            <p><strong>Kepada Yth.</strong></p>
            <p><strong>{{customerName}}</strong></p>
            <p><strong>Di tempat</strong></p>
            <p><strong>Perihal : Surat Penawaran Harga Layanan Internet</strong></p>
            <p><strong>Lampiran : -</strong></p>
        </div>

        <p>Dengan hormat,</p>
        <p>Kami mengucapkan terima kasih atas kepercayaan yang diberikan kepada <strong>{{companyName}}</strong> untuk dapat bekerjasama dengan <strong>{{customerName}}</strong> dalam layanan Internet Dedicated Astinet. Dengan ini kami menyampaikan perihal penawaran harga sebagai berikut :</p>

        <table class="services-table" style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <thead>
                <tr style="background-color: #c41e3a; color: white;">
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">NO</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Layanan</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Jumlah<br>(sambungan)</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Biaya PSB<br>(Rp)</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Biaya Abonemen<br>Normal /<br>Bulanan</th>
                    <th style="border: 1px solid #000; padding: 10px; text-align: center;">Biaya Abonemen<br>Diskon / Bulanan</th>
                </tr>
            </thead>
            <tbody>
                {{#each services}}
                <tr>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{@index}}</td>
                    <td style="border: 1px solid #000; padding: 10px;">{{serviceName}}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{connectionCount}}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{formatCurrency psbFee}}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{formatCurrency monthlyFeeNormal}}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">{{formatCurrency monthlyFeeDiscount}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>

        <div style="margin: 30px 0;">
            <p><strong>Syarat dan Ketentuan:</strong></p>
            <ol>
                <li>Belum termasuk PPN.</li>
                <li>Est. Delivery time layanan 30 hari kalender sejak penandatanganan Kontrak Berlangganan (KB) jika jaringan Fiber Optik (FO) sudah tersedia. Jika belum tersedia jaringan FO maka estimasi waktu paling cepat 2-3 bulan atau bergantung kondisi di lapangan.</li>
                <li>Penawaran berlaku selama 14 hari kalender sejak penawaran dikeluarkan.</li>
                <li>Penawaran bersifat terbatas/rahasia tidak diperkenankan disebarluaskan.</li>
            </ol>
        </div>

        <p>Demikian disampaikan dari surat penawaran harga ini, agar dapat menjadi bahan dasar pertimbangan oleh pihak manajemen <strong>{{customerName}}</strong>.</p>

        {{#if notes}}
        <div class="notes">
            <h4>Catatan:</h4>
            <p>{{notes}}</p>
        </div>
        {{/if}}

        <p style="margin-top: 20px;">Hormat kami,</p>

        <div style="display: flex; justify-content: space-between; margin-top: 40px;">
            <div style="text-align: center; width: 180px;">
                <div style="height: 50px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
                <p><strong>Nama AM</strong></p>
                <p><strong>{{companyName}}</strong></p>
            </div>
           
        </div>

       
    </div>
</body>
</html>
`;

export async function generateSPHDocument(data: SPHData) {
  try {
    console.log('SPH Generator - Input data:', JSON.stringify(data, null, 2));
    
    // Compile template
    const template = handlebars.compile(SPH_TEMPLATE);
    
    // Prepare template data
    const templateData = {
      ...data,
      companyName: process.env.COMPANY_NAME || 'PT. Your Company',
      companyAddress: process.env.COMPANY_ADDRESS || 'Alamat Perusahaan',
      companyPhone: process.env.COMPANY_PHONE || '+62-21-xxxxxxxx',
      companyEmail: process.env.COMPANY_EMAIL || 'info@company.com',
      currentDate: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    // Generate HTML
    const html = template(templateData);
    
    // Create uploads directory if not exists (absolute path)
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const documentId = uuidv4();
    const htmlPath = path.join(uploadsDir, `sph-${documentId}.html`);
    const pdfPath = path.join(uploadsDir, `sph-${documentId}.pdf`);
    
    console.log('📄 Generating files:', { documentId, htmlPath, pdfPath });

    // Save HTML file
    fs.writeFileSync(htmlPath, html);

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    return {
      success: true,
      documentId,
      htmlPath: `/uploads/sph-${documentId}.html`,
      pdfPath: `/uploads/sph-${documentId}.pdf`,
      data: templateData
    };
  } catch (error) {
    console.error('SPH generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
