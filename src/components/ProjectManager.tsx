import React, { useState } from 'react';
import { Plus, Folder, Trash2, Layers, AlertCircle } from 'lucide-react';
import { Project } from '../types';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, description: string) => void;
  onDeleteProject: (id: string) => void;
  resultsCount: { [projectId: string]: number };
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  resultsCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    onAddProject(name, description);
    setName('');
    setDescription('');
    setError('');
    setIsOpen(false);
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Entorno de Trabajo
          </h2>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-800">
              {activeProject ? activeProject.name : 'Ningún proyecto seleccionado'}
            </span>
            {activeProject?.description && (
              <span className="text-xs text-slate-500 italic truncate max-w-xs block">
                — {activeProject.description}
              </span>
            )}
          </div>
        </div>

        <button
          id="btn-toggle-new-project-modal"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 justify-center py-2 px-3.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition rounded-lg shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo Proyecto
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Crear Proyecto para Segmentación</h3>
          {error && (
            <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-700 border border-red-100 rounded-md text-xs mb-3">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="project-name" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre del Proyecto</label>
              <input
                id="project-name"
                type="text"
                placeholder="Ej. Planta Química Norte, Línea 3"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs py-2 px-3 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label htmlFor="project-desc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción / Notas (Opcional)</label>
              <input
                id="project-desc"
                type="text"
                placeholder="Ej. Auditoría de motores eléctricos Siemens"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-xs py-2 px-3 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              id="btn-cancel-project"
              onClick={() => setIsOpen(false)}
              className="py-1.5 px-3 border border-slate-200 text-xs font-semibold rounded-md text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-save-project"
              className="py-1.5 px-3 bg-teal-600 text-white text-xs font-semibold rounded-md hover:bg-teal-700 transition"
            >
              Guardar Proyecto
            </button>
          </div>
        </form>
      )}

      {/* Projects List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const count = resultsCount[project.id] || 0;
          return (
            <div
              key={project.id}
              id={`project-card-${project.id}`}
              onClick={() => onSelectProject(project.id)}
              className={`flex items-center justify-between p-3.5 border rounded-lg cursor-pointer transition shadow-xs group ${
                isActive
                  ? 'bg-teal-50/70 border-teal-500 text-teal-900 ring-1 ring-teal-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-md ${isActive ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Folder className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold truncate">{project.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {project.description || 'Sin notas descriptivas'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
                  {count} {count === 1 ? 'placa' : 'placas'}
                </span>
                
                {projects.length > 1 && (
                  <button
                    type="button"
                    id={`btn-delete-project-${project.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Es seguro que deseas eliminar el proyecto "${project.name}" y todas las placas contenidas de forma permanente?`)) {
                        onDeleteProject(project.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition opacity-0 group-hover:opacity-100"
                    title="Eliminar proyecto y placas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
