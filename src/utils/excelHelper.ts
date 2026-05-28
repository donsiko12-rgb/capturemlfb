import * as XLSX from 'xlsx';
import { ExtractedResult } from '../types';

export function exportToExcel(results: ExtractedResult[], projectName: string) {
  if (results.length === 0) return;

  // Adapt database rows to sheet headers structure
  const rows = results.map((r, index) => {
    // Join the key-value technical parameters beautifully
    const specsString = r.technical_specs
      .map((spec) => `${spec.label}: ${spec.value}`)
      .join(' | ');

    return {
      'No. Ítem': index + 1,
      'Proyecto / Workspace': projectName,
      'Nombre de Archivo': r.fileName,
      'Siemens MLFB (Nº de Referencia)': r.mlfb,
      'Códigos de Opciones Z': r.z_codes.join(', '),
      'Modelo / Familia de Producto': r.model_name,
      'Nº de Serie / Fabricación fd': r.serial_number,
      'Datos Técnicos / Eléctricos': specsString,
      'Nivel de Confianza OCR': r.confidence,
      'Justificación Confianza': r.confidence_reason || '',
      'Fecha y Hora de Extracción': r.processedAt ? new Date(r.processedAt).toLocaleString() : '',
      'Transcripción Bruta OCR (Audit)': r.raw_ocr,
    };
  });

  // Create clean sheet with SheetJS
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Siemens MLFB & Z-Codes');

  // Configure column width profiles to accommodate technical variables comfortably
  const columnWidths = [
    { wch: 8 },   // No. Ítem
    { wch: 22 },  // Proyecto
    { wch: 25 },  // Nombre de Archivo
    { wch: 28 },  // MLFB
    { wch: 22 },  // Opciones Z
    { wch: 25 },  // Modelo
    { wch: 25 },  // Nº Serie
    { wch: 45 },  // Datos Técnicos
    { wch: 20 },  // Nivel Confianza
    { wch: 30 },  // Justificación
    { wch: 22 },  // Fecha
    { wch: 50 },  // Transcripción Bruta
  ];
  worksheet['!cols'] = columnWidths;

  // Clean filename to be file system compliant
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  
  // Truncate to save filename length, add date
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = `siemens_ocr_${safeProjectName}_${dateStr}.xlsx`;

  // Trigger browser file download
  XLSX.writeFile(workbook, finalFilename);
}
