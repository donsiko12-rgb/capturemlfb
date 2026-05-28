import React, { useState, useEffect, useRef } from 'react';
import { SiemensTemplateGenerator } from './components/SiemensTemplateGenerator';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { Project, ExtractedResult } from './types';
import { exportToExcel } from './utils/excelHelper';
import { 
  Cpu, 
  Trash2, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers, 
  CloudLightning,
  Plus,
  Folder,
  Check,
  ChevronRight,
  Database,
  HardDrive,
  Flame,
  Clock,
  Sparkles,
  Info,
  X,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  // --- WORKSPACE & STATE CORE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [autoExport, setAutoExport] = useState<boolean>(true);
  
  // Selection and navigation state
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showNewProjInline, setShowNewProjInline] = useState<boolean>(false);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjDesc, setNewProjDesc] = useState<string>('');
  const [newProjError, setNewProjError] = useState<string>('');

  // Filtering and view states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'completed' | 'processing' | 'error'>('All');

  // Track auto-export through ref to avoid closure issues in the async processing loop
  const autoExportRef = useRef(autoExport);
  useEffect(() => {
    autoExportRef.current = autoExport;
  }, [autoExport]);

  // --- INITIALIZATION & PERSISTENCE ---
  // Load initial settings on mounting
  useEffect(() => {
    const savedProjects = localStorage.getItem('siemens_ocr_projects');
    const savedResults = localStorage.getItem('siemens_ocr_results');

    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects) as Project[];
        setProjects(parsed);
        if (parsed.length > 0) {
          setActiveProjectId(parsed[0].id);
        }
      } catch (e) {
        console.error("Error loading projects:", e);
      }
    } else {
      // First-time default project layout
      const defaultProject: Project = {
        id: 'default',
        name: 'Planta Principal - Motores',
        description: 'Auditoría inicial de placas de motores y arrancadores en taller',
        createdAt: new Date().toISOString()
      };
      setProjects([defaultProject]);
      setActiveProjectId('default');
      localStorage.setItem('siemens_ocr_projects', JSON.stringify([defaultProject]));
    }

    if (savedResults) {
      try {
        setResults(JSON.parse(savedResults));
      } catch (e) {
        console.error("Error loading results:", e);
      }
    }
  }, []);

  // Save states back to local storage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('siemens_ocr_projects', JSON.stringify(projects));
    }
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('siemens_ocr_results', JSON.stringify(results));
  }, [results]);

  // --- WORKSPACE OPERATIONS ---
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) {
      setNewProjError('El nombre del proyecto es obligatorio.');
      return;
    }
    const newProj: Project = {
      id: `proj_${Date.now()}`,
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      createdAt: new Date().toISOString()
    };
    const updated = [...projects, newProj];
    setProjects(updated);
    setActiveProjectId(newProj.id);
    setSelectedResultId(null);
    setNewProjName('');
    setNewProjDesc('');
    setNewProjError('');
    setShowNewProjInline(false);
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`¿Es seguro que deseas eliminar el proyecto "${name}" y todas las placas contenidas de forma permanente?`)) {
      const filteredProj = projects.filter(p => p.id !== id);
      setProjects(filteredProj);
      
      const filteredResults = results.filter(r => r.projectId !== id);
      setResults(filteredResults);

      if (activeProjectId === id && filteredProj.length > 0) {
        setActiveProjectId(filteredProj[0].id);
        setSelectedResultId(null);
      }
    }
  };

  const handleUpdateResult = (updated: ExtractedResult) => {
    setResults(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleDeleteResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
    if (selectedResultId === id) {
      setSelectedResultId(null);
    }
  };

  const handleClearProjectResults = () => {
    if (confirm('¿Es seguro que deseas limpiar todas las placas cargadas en este proyecto? Las imágenes y lecturas se perderán.')) {
      setResults(prev => prev.filter(r => r.projectId !== activeProjectId));
      setSelectedResultId(null);
    }
  };

  // --- AUTOMATED OCR ENGINE LOOP ---
  const triggerBatchOCR = async (currentResults: ExtractedResult[]) => {
    const pendingInActiveProj = currentResults.filter(
      r => r.projectId === activeProjectId && r.status === 'pending'
    );
    
    if (pendingInActiveProj.length === 0) return;

    let localResults = [...currentResults];

    for (const item of pendingInActiveProj) {
      // Set to active processing state
      localResults = localResults.map(r => 
        r.id === item.id ? { ...r, status: 'processing' } as ExtractedResult : r
      );
      setResults(localResults);

      try {
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: item.imageUrl })
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || `Error del servidor HTTP ${response.status}`);
        }

        const data = await response.json();

        // Update with structured AI payload
        localResults = localResults.map(r => 
          r.id === item.id ? {
            ...r,
            mlfb: (data.mlfb || '').toUpperCase(),
            z_codes: data.z_codes || [],
            model_name: data.model_name || '',
            serial_number: data.serial_number || '',
            technical_specs: data.technical_specs || [],
            raw_ocr: data.raw_ocr || '',
            confidence: data.confidence || 'Medium',
            confidence_reason: data.confidence_reason || '',
            status: 'completed',
            processedAt: new Date().toISOString()
          } as ExtractedResult : r
        );
        setResults(localResults);

        // Auto focus newly completed plate if inspection is clear
        setSelectedResultId(item.id);

      } catch (err: any) {
        console.error("Falla en ciclo OCR para placa:", item.id, err);
        localResults = localResults.map(r => 
          r.id === item.id ? {
            ...r,
            status: 'error',
            errorMsg: err.message || 'Falla de comunicación con el servicio OCR de Gemini'
          } as ExtractedResult : r
        );
        setResults(localResults);
      }
    }

    const finalCompleted = localResults.filter(
      r => r.projectId === activeProjectId && r.status === 'completed'
    );
    const hasRemainingWorking = localResults.some(
      r => r.projectId === activeProjectId && (r.status === 'pending' || r.status === 'processing')
    );

    if (autoExportRef.current && finalCompleted.length > 0 && !hasRemainingWorking) {
      const activeProj = projects.find(p => p.id === activeProjectId);
      exportToExcel(finalCompleted, activeProj?.name || 'Proyecto');
    }
  };

  // --- TRIGGER MULTIPLE SELECT FILES ---
  const handleImagesSelected = (images: { fileName: string; base64: string }[]) => {
    const newItems: ExtractedResult[] = images.map((img) => ({
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId: activeProjectId,
      fileName: img.fileName,
      imageUrl: img.base64,
      mlfb: '',
      z_codes: [],
      model_name: '',
      serial_number: '',
      technical_specs: [],
      raw_ocr: '',
      confidence: 'Medium',
      status: 'pending'
    }));

    const updated = [...results, ...newItems];
    setResults(updated);
    
    // Auto-select first of the newly added items
    setSelectedResultId(newItems[0].id);

    // Auto-trigger background sequential analyzer
    triggerBatchOCR(updated);
  };

  // Retry individual items
  const handleRetryResult = (id: string) => {
    const updated = results.map(r => r.id === id ? { ...r, status: 'pending', errorMsg: undefined } as ExtractedResult : r);
    setResults(updated);
    triggerBatchOCR(updated);
  };

  // --- STATISTICS FOR THE CORE SUITE ---
  const resultsCountMap = projects.reduce((acc, p) => {
    acc[p.id] = results.filter(r => r.projectId === p.id).length;
    return acc;
  }, {} as { [key: string]: number });

  // Filter lists inside active workspace
  const activeProjResults = results.filter(r => r.projectId === activeProjectId);
  const completedResults = activeProjResults.filter(r => r.status === 'completed');
  const errorCount = activeProjResults.filter(r => r.status === 'error').length;
  const processingCount = activeProjResults.filter(r => r.status === 'processing' || r.status === 'pending').length;
  
  const highConfidenceCount = completedResults.filter(r => r.confidence === 'High').length;
  const confidenceRatio = completedResults.length > 0 
    ? Math.round((highConfidenceCount / completedResults.length) * 100) 
    : 100;

  const filteredResults = activeProjResults.filter((item) => {
    const matchesSearch = 
      item.mlfb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.z_codes.some(z => z.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (statusFilter === 'All') return matchesSearch;
    return matchesSearch && item.status === statusFilter;
  });

  // Calculate selected result target
  const activeSelectedResultId = selectedResultId || (activeProjResults.length > 0 ? activeProjResults[0].id : null);
  const selectedResult = results.find(r => r.id === activeSelectedResultId);
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Manual Excel download
  const handleManualExport = () => {
    if (completedResults.length === 0) {
      alert("No hay registros completados para exportar. Cargue o genere una chapa Siemens.");
      return;
    }
    exportToExcel(completedResults, activeProject?.name || 'Auditoría');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden select-none">
      
      {/* 1. LEFT SIDEBAR (Dark Theme - Siemens Style) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-700 shrink-0">
        
        {/* Sidebar Title */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center font-bold text-lg text-white">S</div>
            <span className="font-bold tracking-tight text-sm font-mono text-slate-100">SIEMENS OCR PRO</span>
          </div>
          <span className="bg-slate-800 text-[10px] text-slate-400 py-0.5 px-2 rounded-full font-mono font-bold">V1.2.5</span>
        </div>

        {/* Create Project Button */}
        <div className="p-4 border-b border-slate-800/60">
          {!showNewProjInline ? (
            <button
              onClick={() => setShowNewProjInline(true)}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-4 rounded shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              NUEVO PROYECTO
            </button>
          ) : (
            <form onSubmit={handleAddProject} className="space-y-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crear Proyecto</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjInline(false);
                    setNewProjError('');
                  }}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {newProjError && (
                <div className="text-[10px] text-rose-450 bg-rose-950/30 p-1.5 rounded border border-rose-900/40">
                  {newProjError}
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Línea 3 Motor Rack"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 bg-slate-900 text-white border border-slate-700/60 rounded focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-550 font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nota (Opcional)</label>
                <input
                  type="text"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Ej. Auditoría de variadores"
                  className="w-full text-xs py-1.5 px-2 bg-slate-900 text-white border border-slate-700/60 rounded focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-550 font-sans"
                />
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewProjInline(false)}
                  className="py-1 px-2 hover:bg-slate-800 text-[10px] font-bold text-slate-300 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-1 px-3 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded"
                >
                  Guardar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Dynamic Project List Scroll */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-2 flex items-center justify-between">
            <span>Proyectos Registrados ({projects.length})</span>
            <Layers className="w-3 h-3 text-slate-500" />
          </div>

          <div className="space-y-1">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              const count = resultsCountMap[project.id] || 0;
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    setActiveProjectId(project.id);
                    setSelectedResultId(null);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded text-xs transition cursor-pointer select-none group ${
                    isActive
                      ? 'bg-slate-800 text-white border-l-2 border-sky-400 font-semibold'
                      : 'text-slate-400 hover:bg-slate-850 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full mr-2">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                    <div className="truncate text-left w-full">
                      <div className="truncate leading-tight">{project.name}</div>
                      {project.description && (
                        <div className="truncate text-[9px] text-slate-500 font-normal mt-0.5">{project.description}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-850 text-slate-500 group-hover:bg-slate-800'}`}>
                      {count}
                    </span>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer Analytics widget */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-[10px] text-slate-500 flex flex-col gap-2 leading-relaxed">
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">CPU ENGINE</span>
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                OPTIMIZED
              </span>
            </div>
            <div className="flex gap-0.5 h-3.5 items-end">
              <div className="w-1 h-2.5 bg-emerald-500 rounded-xs"></div>
              <div className="w-1 h-3.5 bg-emerald-500 rounded-xs"></div>
              <div className="w-1 h-1.5 bg-emerald-500 rounded-xs"></div>
              <div className="w-1 h-3 bg-slate-700 rounded-xs"></div>
            </div>
          </div>
          
          <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-900/50 pt-2 font-mono">
            <span>MOTOR: GEMINI 3.5</span>
            <span>LATENCIA: 42ms</span>
          </div>
        </div>

      </aside>

      {/* 2. MAIN WORKING SPACE */}
      <main className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
        
        {/* Main Workspace Top Bar (Clean & Static, height 14) */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600" />
              <span>{activeProject ? activeProject.name : 'Workspace'}</span>
            </h1>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Activo
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              UTC: 2026-05-28 22:22:40
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Auto-export settings toggle inside workspace header bar */}
            <label className="inline-flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 transition">
              <input
                id="header-chk-auto-export"
                type="checkbox"
                checked={autoExport}
                onChange={(e) => setAutoExport(e.target.checked)}
                className="accent-sky-600 w-3.5 h-3.5 rounded cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Exportación Auto</span>
            </label>

            {/* Manual XLSX generation */}
            <button
              onClick={handleManualExport}
              disabled={completedResults.length === 0}
              className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded shadow-xs text-xs font-semibold transition ${
                completedResults.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar a Excel (.xlsx) ({completedResults.length})
            </button>
          </div>
        </header>

        {/* 3. CORE SUB-SECTION BODY (12 column setup) */}
        <section className="flex-1 grid grid-cols-12 gap-0 overflow-hidden h-full">
          
          {/* A. LEFT COLUMN (4 Grid wide) - Image queue and direct plate test drivers upload block */}
          <div className="col-span-4 border-r border-slate-200 bg-slate-50 flex flex-col p-4 space-y-4 overflow-y-auto h-full">
            
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span>Herramientas y Archivos</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono">{activeProjResults.length}</span>
              </h2>
              {activeProjResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearProjectResults}
                  className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold uppercase tracking-wider hover:underline"
                >
                  Vaciar Cola
                </button>
              )}
            </div>

            {/* Live Camera, file selective uploader and diagnostic helper */}
            <ImageUploader onImagesSelected={handleImagesSelected} />

            {/* Simulated hardware plate vectors (perfect to instantly audit values) */}
            <SiemensTemplateGenerator onTemplateGenerated={handleImagesSelected} />

            {/* Quick list list of items inside the queue */}
            <div className="space-y-2 shrink-0 pt-2 border-t border-slate-200">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cola de Carga & Estado</span>
              
              {activeProjResults.length === 0 ? (
                <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-lg bg-white/50 text-[10px] italic text-slate-400">
                  No se han cargado placas. Utilice el simulador o cargue una imagen arriba para rellenar la cola.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {activeProjResults.map((item) => {
                    const isInspected = item.id === activeSelectedResultId;
                    
                    let bgStyle = 'bg-white border-slate-200';
                    let statusBadge = 'bg-slate-100 text-slate-500';
                    let statusLabel = 'En Espera';

                    if (item.status === 'processing') {
                      bgStyle = 'bg-sky-50/75 border-sky-300 ring-1 ring-sky-100 animate-pulse';
                      statusBadge = 'bg-sky-500 text-white';
                      statusLabel = 'ANALIZANDO';
                    } else if (item.status === 'completed') {
                      bgStyle = 'bg-white border-emerald-250 shadow-xs hover:border-emerald-400';
                      statusBadge = 'bg-emerald-100 text-emerald-800';
                      statusLabel = 'COMPLETADO';
                    } else if (item.status === 'error') {
                      bgStyle = 'bg-rose-50/60 border-rose-200';
                      statusBadge = 'bg-rose-500 text-white';
                      statusLabel = 'CON FALLA';
                    }

                    return (
                      <div
                        key={item.id}
                        id={`queue-badge-${item.id}`}
                        onClick={() => setSelectedResultId(item.id)}
                        className={`p-2 border rounded shadow-xs flex gap-2.5 items-center cursor-pointer transition select-none ${bgStyle} ${
                          isInspected ? 'ring-2 ring-sky-500 border-sky-500 bg-sky-50/20' : ''
                        }`}
                      >
                        {/* Compact background shape */}
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-900 flex items-center justify-center border border-slate-200/80">
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-slate-800 truncate leading-tight">
                            {item.fileName}
                          </div>
                          
                          {/* Details strip */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono p-0.5 rounded-xs leading-none">
                              {item.id.slice(0, 5)}
                            </span>
                            <span className={`text-[8.5px] font-bold px-1.5 rounded-sm ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        {/* Status Icon Indicator */}
                        <div className="shrink-0">
                          {item.status === 'processing' && (
                            <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />
                          )}
                          {item.status === 'completed' && (
                            <div className="text-emerald-500">
                              <CheckCircle2 className="w-4.5 h-4.5 fill-emerald-100" />
                            </div>
                          )}
                          {item.status === 'error' && (
                            <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-100 border border-slate-150 p-3 rounded-lg text-[10px] leading-relaxed text-slate-500">
              <div className="font-bold flex items-center gap-1 text-slate-700">
                <Info className="w-3.5 h-3.5" />
                Sugerencias OCR:
              </div>
              <p className="mt-1">
                La IA procesa las imágenes de forma secuencial. Al concluir se autodescargará el informe en Excel si tienes la casilla de exportación activada.
              </p>
            </div>

          </div>

          {/* B. RIGHT COLUMN (8 grid wide) - Search headers, high-density live excel table and full master details audit panel */}
          <div className="col-span-8 flex flex-col bg-white overflow-hidden h-full">
            
            {/* Table High density statistics and filter control panel */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 bg-slate-50/50">
              <div>
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Datos Extraídos (Preview)</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400 font-medium">
                  <span>Filas Totales: <strong className="text-slate-700 font-mono">{activeProjResults.length}</strong></span>
                  {completedResults.length > 0 && (
                    <>
                      <span>Completadas: <strong className="text-emerald-650 font-mono">{completedResults.length}</strong></span>
                      <span>Opciones Z: <strong className="text-amber-700 font-mono">{completedResults.reduce((s, r) => s + r.z_codes.length, 0)}</strong></span>
                      <span>Calidad de lectura: <strong className="text-sky-650 font-mono">{confidenceRatio}% Alta</strong></span>
                    </>
                  )}
                  {errorCount > 0 && (
                    <span>Errores: <strong className="text-rose-600 font-mono">{errorCount}</strong></span>
                  )}
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="table-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar MLFBs, Códigos Z, familias..."
                    className="w-full sm:w-60 text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  id="table-status-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="All">Todos los Estados</option>
                  <option value="completed">Completados</option>
                  <option value="processing">Procesando</option>
                  <option value="error">Fallas</option>
                </select>
              </div>
            </div>

            {/* Live Interactive High Density Spreadsheet Table */}
            <div className="flex-1 min-h-[160px] max-h-[300px] overflow-auto border-b border-slate-200 bg-slate-50/20">
              {filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 h-full bg-white">
                  <HelpCircle className="w-8 h-8 text-slate-350 stroke-1 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-500">Sin datos que coincidan</span>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                    No se encontraron registros para los filtros seleccionados en este proyecto.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-250 text-slate-500 uppercase text-[9px] font-mono font-bold z-10 shadow-3xs">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-3 py-2 w-12 text-center select-none">ID</th>
                      <th className="px-3 py-2">MLFB / Número de Parte</th>
                      <th className="px-3 py-2 w-32">Códigos Z</th>
                      <th className="px-3 py-2">Modelación / Producto</th>
                      <th className="px-3 py-2 w-36">N° Serie</th>
                      <th className="px-3 py-2 w-28 text-center select-none">OCR Conf.</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-1.5 font-mono">
                    {filteredResults.map((item, index) => {
                      const isSelected = item.id === activeSelectedResultId;
                      
                      let confBadge = 'bg-slate-100 text-slate-600';
                      if (item.status === 'completed') {
                        if (item.confidence === 'High') {
                          confBadge = 'bg-emerald-100 text-emerald-700';
                        } else if (item.confidence === 'Medium') {
                          confBadge = 'bg-amber-100 text-amber-700';
                        } else {
                          confBadge = 'bg-rose-100 text-rose-700';
                        }
                      } else if (item.status === 'processing') {
                        confBadge = 'bg-sky-100 text-sky-700 animate-pulse';
                      }

                      return (
                        <tr
                          key={item.id}
                          id={`tr-row-${item.id}`}
                          onClick={() => setSelectedResultId(item.id)}
                          className={`hover:bg-slate-50/80 divide-x divide-slate-150 cursor-pointer transition select-none ${
                            isSelected 
                              ? 'bg-sky-50/50 font-bold text-sky-950 border-y border-sky-250 ring-1 ring-sky-500/10' 
                              : 'text-slate-700 bg-white'
                          }`}
                        >
                          {/* Dynamic Row Counter Row */}
                          <td className="px-3 py-2 text-slate-400 text-center select-none">
                            {String(index + 1).padStart(3, '0')}
                          </td>
                          
                          {/* Siemens MLFB value */}
                          <td className="px-3 py-2 font-bold text-slate-800">
                            {item.status === 'completed' ? (
                              item.mlfb || <span className="text-slate-400 font-normal italic">Sin MLFB</span>
                            ) : (
                              <span className="text-slate-400 font-normal italic flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
                                {item.status === 'pending' ? 'En espera...' : 'Procesando...'}
                              </span>
                            )}
                          </td>

                          {/* Individual Option Z subparts */}
                          <td className="px-3 py-2.5">
                            {item.status === 'completed' && item.z_codes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.z_codes.map((z, idx) => (
                                  <span key={idx} className="bg-sky-50 text-sky-750 border border-sky-150 px-1 py-0.2 rounded-sm text-[9.5px] font-bold">
                                    {z}
                                  </span>
                                ))}
                              </div>
                            ) : item.status === 'completed' ? (
                              <span className="text-slate-400 text-[10px]">—</span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">Cargando</span>
                            )}
                          </td>

                          {/* Description/Product model */}
                          <td className="px-3 py-2 text-slate-500 font-sans truncate max-w-xs focus:text-slate-800 select-all" title={item.model_name}>
                            {item.model_name || <span className="text-slate-400 italic font-mono text-[10px]">Esperando lectura...</span>}
                          </td>

                          {/* Serial FD number */}
                          <td className="px-3 py-2 text-slate-600 font-mono truncate select-all" title={item.serial_number}>
                            {item.serial_number || <span className="text-slate-300">—</span>}
                          </td>

                          {/* High-level OCR Diagnostic output percentage placeholder */}
                          <td className="px-3 py-2 text-center select-none font-sans">
                            {item.status === 'completed' ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${confBadge}`}>
                                {item.confidence === 'High' ? '99% Alta' : item.confidence === 'Medium' ? '80% Media' : '45% Baja'}
                              </span>
                            ) : item.status === 'processing' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-sky-100 text-sky-700 font-semibold animate-pulse">
                                LEYENDO
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* DETAIL DESK HEADER & AUDITOR AREA */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sky-500 shadow-xs"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Mesa de Auditoría Técnica</span>
              </div>
              {selectedResult && (
                <span className="text-[9.5px] text-slate-400 font-mono font-bold">
                  EXP-KEY: {selectedResult.id}
                </span>
              )}
            </div>

            {/* Active inspection area scrolls separately! */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100/30">
              {processingCount > 0 && (
                <div className="mb-4 flex items-center gap-2 p-2 px-3 bg-sky-50/80 text-sky-850 rounded border border-sky-150 text-[11px] font-medium animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
                  <span>Procesando cola de imágenes con OCR multimodal de Gemini. Los datos se actualizarán automáticamente.</span>
                </div>
              )}

              {selectedResult ? (
                <div className="animate-fadeIn">
                  <ResultCard
                    key={selectedResult.id}
                    result={selectedResult}
                    onUpdate={handleUpdateResult}
                    onDelete={handleDeleteResult}
                  />
                </div>
              ) : (
                <div className="h-48 border border-dashed border-slate-200 rounded-xl bg-white flex flex-col items-center justify-center p-6 text-center select-none shadow-3xs">
                  <Cpu className="w-8 h-8 text-slate-300 stroke-1 mb-2" />
                  <span className="text-xs font-semibold text-slate-600">Ningún registro enfocado para auditoría</span>
                  <p className="text-[10.5px] text-slate-400 max-w-sm mt-1">
                    Haga doble clic o pulse sobre cualquier placa de la cola de carga o de la tabla superior para visualizar su fotografía original Siemens y realizar modificaciones.
                  </p>
                </div>
              )}
            </div>

          </div>

        </section>

        {/* 4. FOOTER STATUS BAR (Exactly 8 lines high compact height matched) */}
        <footer className="h-8 bg-slate-200 border-t border-slate-300 flex items-center px-6 justify-between text-[10px] text-slate-600 shrink-0 font-medium">
          <div className="flex gap-6 font-mono">
            <span>SERVIDOR: <span className="text-emerald-600 font-bold">CONECTADO</span></span>
            <span>MOTOR OCR: <span className="text-slate-700 font-bold">GEMINI-3.5-FLASH-STABLE</span></span>
            <span>PROYECTOS: <span className="text-sky-600 font-bold">{projects.length}</span></span>
            <span>PLACAS TOTALES: <span className="text-slate-700 font-bold">{results.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
            <span className="font-sans uppercase text-[9px] font-bold text-slate-500">Listo para Exportar</span>
          </div>
        </footer>

      </main>

    </div>
  );
}
