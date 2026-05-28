import React, { useState } from 'react';
import { Download, FileSpreadsheet, ShieldAlert, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';
import { ExtractedResult } from '../types';
import { exportToExcel } from '../utils/excelHelper';

interface XlsxExporterProps {
  results: ExtractedResult[];
  projectName: string;
  autoExportEnabled: boolean;
  onToggleAutoExport: (enabled: boolean) => void;
}

export const XlsxExporter: React.FC<XlsxExporterProps> = ({
  results,
  projectName,
  autoExportEnabled,
  onToggleAutoExport
}) => {
  const completedResults = results.filter(r => r.status === 'completed');
  const totalCount = results.length;
  const completedCount = completedResults.length;

  // Calculate statistics for the summary panel
  const uniqueMlfbsCount = new Set(completedResults.map(r => r.mlfb).filter(Boolean)).size;
  
  const totalZCodesCount = completedResults.reduce(
    (sum, r) => sum + (r.z_codes ? r.z_codes.length : 0),
    0
  );

  const highConfidenceCount = completedResults.filter(r => r.confidence === 'High').length;
  const confidenceRatio = completedCount > 0 
    ? Math.round((highConfidenceCount / completedCount) * 100) 
    : 100;

  const handleManualExport = () => {
    if (completedResults.length === 0) {
      alert("No hay registros completados para exportar a Excel. Procese al menos una placa.");
      return;
    }
    exportToExcel(completedResults, projectName);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Módulo de Exportación y KPIs
          </h2>
          <p className="text-sm font-bold text-slate-800 mt-1">
            Generar Reportes Excel para Compras, SAP y Mantenimiento
          </p>
        </div>

        {/* Manual Export and Toggle Settings */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Autoe-xport Toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 bg-slate-50 border border-slate-150 rounded-lg select-none">
            <input
              id="chk-auto-export"
              type="checkbox"
              checked={autoExportEnabled}
              onChange={(e) => onToggleAutoExport(e.target.checked)}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
            />
            <div className="text-left font-sans">
              <span className="text-[11px] font-bold text-slate-700 block">Exportación Automática</span>
              <span className="text-[9px] text-slate-400 block -mt-0.5">Descarga Excel al finalizar el OCR</span>
            </div>
          </label>

          {/* Export Manual Button */}
          <button
            id="btn-manual-xlsx-export"
            type="button"
            onClick={handleManualExport}
            disabled={completedCount === 0}
            className={`inline-flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition shadow-sm justify-center ${
              completedCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            Descargar Excel ({completedCount})
          </button>
        </div>
      </div>

      {/* KPI Stats Panel (Bento Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Uploaded Card */}
        <div className="bg-slate-50/75 border border-slate-150 rounded-lg p-3.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Por Procesar / Uploaded</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 font-mono">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium font-sans">totales</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">En el lote activo</span>
        </div>

        {/* Processed Card */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3.5">
          <span className="text-[9px] font-bold text-emerald-700/80 uppercase block tracking-wider">Completados OCR</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">{completedCount}</span>
            <span className="text-xs text-emerald-700/70 font-medium">analizados</span>
          </div>
          <span className="text-[9px] text-emerald-600/70 block mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Listos para reporte
          </span>
        </div>

        {/* Unique MLFBs Code */}
        <div className="bg-slate-50/75 border border-slate-150 rounded-lg p-3.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Códigos MLFB Únicos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 font-mono">{uniqueMlfbsCount}</span>
            <span className="text-xs text-slate-500 font-medium">distintos</span>
          </div>
          {totalZCodesCount > 0 && (
            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-100 rounded-sm px-1 py-0.5 inline-block mt-1 font-mono">
              + {totalZCodesCount} con Opciones Z
            </span>
          )}
        </div>

        {/* Precision Index */}
        <div className="bg-slate-50/75 border border-slate-150 rounded-lg p-3.5">
          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Índice de Confianza</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 font-mono">{confidenceRatio}%</span>
            <span className="text-xs text-slate-500 font-medium">calidad alta</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">Precisión de lectura AI</span>
        </div>

      </div>
    </div>
  );
};
