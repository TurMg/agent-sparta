import { SPHData, ServiceItem } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSPHData(data: SPHData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate customer name
  if (!data.customerName || data.customerName.trim().length === 0) {
    errors.push('Nama pelanggan harus diisi');
  }

  // Validate SPH date
  if (!data.sphDate) {
    errors.push('Tanggal SPH harus diisi');
  } else {
    const sphDate = new Date(data.sphDate);
    const today = new Date();
    
    if (isNaN(sphDate.getTime())) {
      errors.push('Format tanggal SPH tidak valid');
    } else if (sphDate < today) {
      warnings.push('Tanggal SPH sudah lewat dari hari ini');
    }
  }

  // Validate services
  if (!data.services || data.services.length === 0) {
    errors.push('Minimal harus ada satu layanan');
  } else {
    data.services.forEach((service, index) => {
      const serviceErrors = validateService(service, index + 1);
      errors.push(...serviceErrors.errors);
      warnings.push(...serviceErrors.warnings);
    });
  }

  // Validate attachments if provided
  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach((attachment, index) => {
      if (!attachment || attachment.trim().length === 0) {
        errors.push(`Lampiran ${index + 1} tidak valid`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function validateService(service: ServiceItem, serviceNumber: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate service name
  if (!service.serviceName || service.serviceName.trim().length === 0) {
    errors.push(`Layanan ${serviceNumber}: Nama layanan harus diisi`);
  }

  // Validate connection count
  if (!service.connectionCount || service.connectionCount <= 0) {
    errors.push(`Layanan ${serviceNumber}: Jumlah sambungan harus lebih dari 0`);
  } else if (service.connectionCount > 1000) {
    warnings.push(`Layanan ${serviceNumber}: Jumlah sambungan sangat besar (${service.connectionCount})`);
  }

  // Validate PSB fee
  if (service.psbFee < 0) {
    errors.push(`Layanan ${serviceNumber}: Biaya PSB tidak boleh negatif`);
  } else if (service.psbFee === 0) {
    warnings.push(`Layanan ${serviceNumber}: Biaya PSB adalah 0`);
  }

  // Validate monthly fees
  if (service.monthlyFeeNormal < 0) {
    errors.push(`Layanan ${serviceNumber}: Biaya bulanan normal tidak boleh negatif`);
  }

  if (service.monthlyFeeDiscount < 0) {
    errors.push(`Layanan ${serviceNumber}: Biaya bulanan diskon tidak boleh negatif`);
  }

  // Check discount logic
  if (service.monthlyFeeDiscount > service.monthlyFeeNormal) {
    warnings.push(`Layanan ${serviceNumber}: Biaya diskon lebih besar dari biaya normal`);
  }

  // Calculate discount percentage if not provided
  if (service.monthlyFeeNormal > 0 && service.monthlyFeeDiscount < service.monthlyFeeNormal) {
    const calculatedDiscount = ((service.monthlyFeeNormal - service.monthlyFeeDiscount) / service.monthlyFeeNormal) * 100;
    
    if (service.discountPercentage && Math.abs(service.discountPercentage - calculatedDiscount) > 1) {
      warnings.push(`Layanan ${serviceNumber}: Persentase diskon tidak sesuai dengan perhitungan (${calculatedDiscount.toFixed(1)}%)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function sanitizeSPHData(data: SPHData): SPHData {
  return {
    customerName: data.customerName?.trim() || '',
    sphDate: data.sphDate || new Date().toISOString().split('T')[0],
    services: data.services?.map(service => ({
      serviceName: service.serviceName?.trim() || '',
      connectionCount: Math.max(0, Math.floor(service.connectionCount || 0)),
      psbFee: Math.max(0, service.psbFee || 0),
      monthlyFeeNormal: Math.max(0, service.monthlyFeeNormal || 0),
      monthlyFeeDiscount: Math.max(0, service.monthlyFeeDiscount || 0),
      discountPercentage: service.discountPercentage || undefined
    })) || [],
    notes: data.notes?.trim() || '',
    attachments: data.attachments?.filter(att => att && att.trim().length > 0) || []
  };
}
