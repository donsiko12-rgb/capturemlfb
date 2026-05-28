import React, { useRef } from 'react';
import { Sparkles, Check, Image as ImageIcon } from 'lucide-react';

interface TemplatePreset {
  id: string;
  title: string;
  type: string;
  mlfb: string;
  zCodes: string;
  serial: string;
  specs: string[];
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'motor_induction',
    title: 'Motor SIMOTICS GP (Asíncrono)',
    type: '3~ Motor 1LA7083-4AA10-Z',
    mlfb: '1LA7083-4AA10-Z',
    zCodes: 'Z=A11+C12',
    serial: 'FD 9508/0123 4567',
    specs: ['3~ Mot.', '0.75 kW', '400 V', '1.85 A', '1410 RPM', 'IP55', '50 Hz', 'IE3-82.5%']
  },
  {
    id: 'motor_synchronous',
    title: 'Servo Motor SIMOTICS S-1FK7',
    type: 'Brushless Servomotor 1FK7060-5AF71-1SG0-Z',
    mlfb: '1FK7060-5AF71-1SG0-Z',
    zCodes: 'Z=G11+Y84+K24',
    serial: 'YF E-D4567891 02 001',
    specs: ['6.0 Nm', '4.7 A', '3000 min-1', 'Uin 360V', 'IP64', 'Encoder AM20DQI']
  },
  {
    id: 'sirius_starter',
    title: 'Arrancador Suave SIRIUS 3RW40',
    type: 'Soft Starter 3RW4026-1TB04',
    mlfb: '3RW4026-1TB04',
    zCodes: '',
    serial: 'FD 080415 1256',
    specs: ['Un: 400V', 'Ie: 25A', 'Pe: 11 kW', 'IP20', 'Control: 24V AC/DC']
  }
];

interface SiemensTemplateGeneratorProps {
  onTemplateGenerated: (fileName: string, base64Image: string) => void;
}

export const SiemensTemplateGenerator: React.FC<SiemensTemplateGeneratorProps> = ({
  onTemplateGenerated
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generatePlateImage = (preset: TemplatePreset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dark slate aluminum or classic plate background
    ctx.fillStyle = '#1e293b'; // Slate-800
    ctx.fillRect(0, 0, 700, 420);

    // Draw border lines
    ctx.strokeStyle = '#64748b'; // Slate-500
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 700 - 16, 420 - 16);

    // Grid lines for realism
    ctx.strokeStyle = '#475569'; // Slate-600
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 65); ctx.lineTo(700 - 8, 65);
    ctx.moveTo(8, 125); ctx.lineTo(700 - 8, 125);
    ctx.moveTo(8, 300); ctx.lineTo(700 - 8, 300);
    ctx.moveTo(350, 125); ctx.lineTo(350, 300);
    ctx.stroke();

    // Siemens Logo top-left (Classic typography / teal blue aspect)
    ctx.fillStyle = '#00a3a3'; // Siemens Teal
    ctx.font = 'bold 32px "Inter", sans-serif';
    ctx.fillText('SIEMENS', 30, 45);

    // Made in Germany sub-bracket
    ctx.fillStyle = '#94a3b8'; // Slate-400
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('MADE IN GERMANY', 580, 42);

    // Product Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText(preset.title.toUpperCase(), 30, 95);

    // MLFB Order number label
    ctx.fillStyle = '#00f2f2'; // Cyan tech highlight
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('MLFB (BESTELL-NR. / ORDER NO.):', 30, 150);

    // MLFB Actual value (Large & Mono font)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(preset.mlfb, 30, 185);

    // Z-codes options label
    ctx.fillStyle = '#00f2f2';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('Z-OPTIONS (OPTIONEN Z):', 30, 225);

    // Z-codes Actual value
    ctx.fillStyle = preset.zCodes ? '#ffd700' : '#475569'; // Gold yellow if present, or faint gray
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(preset.zCodes || 'N/A (SIN CODIGOS Z)', 30, 255);

    // Serial & FD
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('SERIAL / FABR.-NR.:', 370, 150);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '15px "JetBrains Mono", monospace';
    ctx.fillText(preset.serial, 370, 180);

    // Model Category
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('PRODUCT CATEGORY:', 370, 225);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillText(preset.type, 370, 250);

    // Bottom specifications ribbon
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('SPECIFICATIONS / DATOS TÉCNICOS:', 30, 328);

    // Specs grid (horizontal bento elements)
    let col = 0;
    let rowForSpecs = 0;
    preset.specs.forEach((item, index) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      const x = 30 + col * 160;
      const y = 358 + rowForSpecs * 25;
      
      // small bullet box
      ctx.fillStyle = '#00a3a3';
      ctx.fillRect(x, y - 10, 4, 10);
      
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(item, x + 12, y);

      col++;
      if (col > 3) {
        col = 0;
        rowForSpecs++;
      }
    });

    // Generate output
    const dataUrl = canvas.toDataURL('image/png');
    onTemplateGenerated(`${preset.id}_simulated.png`, dataUrl);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          ¿No tienes una foto a mano? Genera una placa Siemens de prueba
        </h3>
        <span className="text-xs text-slate-500 font-mono">Simulador de Placas</span>
      </div>
      
      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Presiona cualquiera de los siguientes botones para renderizar una placa de características técnica de Siemens directamente en tu navegador y simular su carga y análisis OCR en tiempo real:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TEMPLATES.map((preset) => (
          <button
            key={preset.id}
            id={`btn-template-${preset.id}`}
            type="button"
            onClick={() => generatePlateImage(preset)}
            className="flex flex-col items-start gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-slate-50 text-left transition shadow-xs group"
          >
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 w-full justify-between">
              {preset.title}
              <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-500 transition-opacity" />
            </span>
            <span className="text-[11px] font-mono text-slate-500 truncate w-full">
              MLFB: {preset.mlfb}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {preset.zCodes ? `Códigos Z: ${preset.zCodes}` : 'Sin códigos Z'}
            </span>
          </button>
        ))}
      </div>

      {/* Hidden Canvas for background generation */}
      <canvas
        ref={canvasRef}
        width={700}
        height={420}
        className="hidden"
        id="siemens_mock_canvas"
      />
    </div>
  );
};
