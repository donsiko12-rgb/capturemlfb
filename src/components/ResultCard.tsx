import React, { useState } from 'react';
import { Copy, Save, Edit3, Trash2, Calendar, ShieldCheck, Check, AlertTriangle, FileText, Plus, X, ArrowRight, Table } from 'lucide-react';
import { ExtractedResult, TechnicalSpec } from '../types';

interface ResultCardProps {
  result: ExtractedResult;
  onUpdate: (updated: ExtractedResult) => void;
  onDelete: (id: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [mlfb, setMlfb] = useState(result.mlfb);
  const [zCodesText, setZCodesText] = useState(result.z_codes.join(', '));
  const [modelName, setModelName] = useState(result.model_name);
  const [serialNumber, setSerialNumber] = useState(result.serial_number);
  const [specs, setSpecs] = useState<TechnicalSpec[]>([...result.technical_specs]);
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>(result.confidence);
  const [copied, setCopied] = useState(false);

  // Copy helper
  const handleCopyMLFB = () => {
    navigator.clipboard.writeText(result.mlfb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add a technical spec parameter line
  const handleAddSpecLine = () => {
    setSpecs([...specs, { label: '', value: '' }]);
  };

  // Remove spec line
  const handleRemoveSpecLine = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };

  // Edit individual items inside specs list
  const handleSpecChange = (idx: number, field: 'label' | 'value', value: string) => {
    const updated = [...specs];
    updated[idx][field] = value;
    setSpecs(updated);
  };

  // Save changes
  const handleSave = () => {
    // Parse Z-codes back to list split by comma or spaces
    const cleanZCodes = zCodesText
      .split(',')
      .map(z => z.trim().toUpperCase())
      .filter(z => z.length > 0);

    onUpdate({
      ...result,
      mlfb: mlfb.trim().toUpperCase(),
      z_codes: cleanZCodes,
      model_name: modelName.trim(),
      serial_number: serialNumber.trim(),
      technical_specs: specs.filter(s => s.label.trim() !== ''),
      confidence,
      processedAt: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setMlfb(result.mlfb);
    setZCodesText(result.z_codes.join(', '));
    setModelName(result.model_name);
    setSerialNumber(result.serial_number);
    setSpecs([...result.technical_specs]);
    setConfidence(result.confidence);
    setIsEditing(false);
  };

  const getConfidenceStyle = (level: string) => {
    switch (level) {
      case 'High':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badge: 'bg-emerald-500 text-white',
          text: 'Alta precisión'
        };
      case 'Medium':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          badge: 'bg-amber-500 text-white',
          text: 'Precisión media'
        };
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          badge: 'bg-rose-500 text-white',
          text: 'Baja precisión'
        };
    }
  };

  const confStyle = getConfidenceStyle(result.confidence);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6 hover:shadow-sm transition">
      
      {/* CARD TOP BAR */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-600 font-mono tracking-tight">
            ID: {result.id.slice(0, 8)} — {result.fileName}
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          {/* Status Display badges */}
          <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full flex items-center gap-1 ${confStyle.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${confStyle.badge}`} />
            {confStyle.text}
          </span>

          <div className="flex items-center gap-1.5">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  id={`btn-edit-result-${result.id}`}
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-md transition"
                  title="Editar datos manualmente"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  id={`btn-delete-result-${result.id}`}
                  onClick={() => {
                    if (confirm('¿Deseas eliminar el registro de esta placa de características?')) {
                      onDelete(result.id);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                  title="Eliminar placa de datos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  id={`btn-cancel-edit-${result.id}`}
                  onClick={handleCancel}
                  className="px-2 py-1 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-600 rounded transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id={`btn-save-edit-${result.id}`}
                  onClick={handleSave}
                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-[10px] font-bold text-white rounded flex items-center gap-1 transition"
                >
                  <Save className="w-3 h-3" />
                  Guardar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* VIEWPORT SIDE BY SIDE PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        
        {/* Left Side: Nameplate Image Viewport */}
        <div className="md:col-span-5 bg-slate-900 flex items-center justify-center p-3 border-r border-slate-100">
          <div className="relative group w-full h-72 md:h-[420px] flex items-center justify-center overflow-hidden rounded-lg bg-slate-950">
            <img
              src={result.imageUrl}
              alt="Siemens Nameplate"
              className="max-h-full max-w-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[9px] font-mono text-slate-300">
              Imagen de Referencia
            </div>
          </div>
        </div>

        {/* Right Side: Tabular Structured Data Fields */}
        <div className="md:col-span-7 p-6 flex flex-col justify-between bg-white text-slate-800">
          <div>
            {!isEditing ? (
              // READ-ONLY INFO VIEW
              <div className="space-y-5">
                
                {/* LARGE FEATURE: MLFB Order Number */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-lg p-4 relative group">
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block font-mono">
                    Siemens MLFB / Bestell-Nr.
                  </span>
                  
                  <div className="flex items-center justify-between gap-4 mt-1.5">
                    <span className="text-xl md:text-2xl font-bold font-mono tracking-tight text-slate-900 select-all">
                      {result.mlfb || 'NO DETECTADO'}
                    </span>
                    <button
                      type="button"
                      id={`btn-copy-mlfb-${result.id}`}
                      onClick={handleCopyMLFB}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-teal-600 border border-slate-200 rounded-md transition duration-150 shrink-0"
                      title="Copiar código MLFB"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  {copied && (
                    <span className="absolute top-2 right-2 text-[9px] bg-emerald-100 text-emerald-800 py-0.5 px-1.5 rounded font-bold uppercase tracking-wider">
                      Copiado
                    </span>
                  )}
                </div>

                {/* Z CODE CARDS LIST */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Códigos de Opciones Especiales Z
                  </span>
                  {result.z_codes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.z_codes.map((z, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-bold font-mono bg-yellow-50 text-amber-800 border border-amber-200 rounded-md"
                        >
                          Z = {z}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No se indicaron opciones Z en esta placa de datos.</span>
                  )}
                </div>

                {/* TWO-COLUMN GENERAL ATTRIBUTES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Nombre de Modelo / Familia
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {result.model_name || 'Desconocido'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Número de Serie / FD
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {result.serial_number || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* TECHNICAL DATA TABLE LIST */}
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                    <Table className="w-3 h-3" />
                    Parámetros Eléctricos y Operacionales
                  </span>
                  {result.technical_specs.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {result.technical_specs.map((item, idx) => (
                        <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-md p-2 flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 truncate">{item.label}</span>
                          <span className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sin datos técnicos específicos.</span>
                  )}
                </div>

                {/* RAW COMPREHENSIVE TEXT FOR AUDITING */}
                {result.raw_ocr && (
                  <div className="border-t border-slate-150 pt-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                      TextoOCR Completo de Respaldo
                    </span>
                    <details className="text-[10px] text-slate-500 font-mono bg-slate-50 p-3 rounded-lg border border-slate-150 cursor-pointer max-h-32 overflow-y-auto">
                      <summary className="font-semibold text-slate-600 focus:outline-none">Mostar trascripción en bruto</summary>
                      <pre className="whitespace-pre-wrap mt-2 select-all leading-relaxed text-slate-700">{result.raw_ocr}</pre>
                    </details>
                  </div>
                )}

              </div>
            ) : (
              // INTERACTIVE MANUAL CORRECTION FORM
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                <div>
                  <label htmlFor={`edit-mlfb-${result.id}`} className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Siemens MLFB</label>
                  <input
                    id={`edit-mlfb-${result.id}`}
                    type="text"
                    value={mlfb}
                    onChange={e => setMlfb(e.target.value)}
                    className="w-full text-xs font-mono font-semibold py-2 px-3 border border-slate-200 rounded-md"
                    placeholder="P.ej. 1FK7060-5AF71-1SG0-Z"
                  />
                </div>

                <div>
                  <label htmlFor={`edit-zcodes-${result.id}`} className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Códigos Z (Separados por coma)</label>
                  <input
                    id={`edit-zcodes-${result.id}`}
                    type="text"
                    value={zCodesText}
                    onChange={e => setZCodesText(e.target.value)}
                    className="w-full text-xs font-mono font-semibold py-2 px-3 border border-slate-200 rounded-md bg-amber-50/20"
                    placeholder="A11, C12, G11"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Sepáralos con comas para que se subdividan en la base de datos de Excel</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`edit-model-${result.id}`} className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo / Familia</label>
                    <input
                      id={`edit-model-${result.id}`}
                      type="text"
                      value={modelName}
                      onChange={e => setModelName(e.target.value)}
                      className="w-full text-xs py-2 px-3 border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor={`edit-serial-${result.id}`} className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nº Serie</label>
                    <input
                      id={`edit-serial-${result.id}`}
                      type="text"
                      value={serialNumber}
                      onChange={e => setSerialNumber(e.target.value)}
                      className="w-full text-xs font-mono py-2 px-3 border border-slate-200 rounded-md"
                    />
                  </div>
                </div>

                {/* EDIT TECHNICAL SPECS LIST */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
                    Especificaciones Técnicas Modificables
                    <button
                      type="button"
                      id={`btn-add-spec-line-${result.id}`}
                      onClick={handleAddSpecLine}
                      className="text-teal-600 hover:text-teal-700 flex items-center gap-0.5 text-[9px] font-bold uppercase"
                    >
                      <Plus className="w-3 h-3" /> Añadir Dato
                    </button>
                  </span>
                  <div className="space-y-2 mt-1.5">
                    {specs.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="P.ej. Potencia"
                          value={item.label}
                          onChange={e => handleSpecChange(idx, 'label', e.target.value)}
                          className="flex-1 text-[11px] py-1 px-2 border border-slate-200 rounded"
                        />
                        <input
                          type="text"
                          placeholder="P.ej. 1.5 kW"
                          value={item.value}
                          onChange={e => handleSpecChange(idx, 'value', e.target.value)}
                          className="flex-1 text-[11px] font-mono py-1 px-2 border border-slate-200 rounded"
                        />
                        <button
                          type="button"
                          id={`btn-remove-spec-${result.id}-${idx}`}
                          onClick={() => handleRemoveSpecLine(idx)}
                          className="text-red-400 hover:text-red-500 p-1 hover:bg-slate-50 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label htmlFor={`edit-confidence-${result.id}`} className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Calificación de Calidad del OCR</label>
                  <select
                    id={`edit-confidence-${result.id}`}
                    value={confidence}
                    onChange={e => setConfidence(e.target.value as any)}
                    className="text-xs py-1.5 px-2 border border-slate-200 rounded bg-white w-full"
                  >
                    <option value="High">High (Alta nitidez)</option>
                    <option value="Medium">Medium (Nitidez Regular)</option>
                    <option value="Low">Low (Muy dañado/borroso)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100/70 mt-5 pt-3.5 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3 h-3" />
              Procesado: {result.processedAt ? new Date(result.processedAt).toLocaleDateString() : '—'}
            </span>
            {result.confidence_reason && !isEditing && (
              <span className="text-[10px] text-slate-500 italic truncate max-w-xs" title={result.confidence_reason}>
                Nota: {result.confidence_reason}
              </span>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
