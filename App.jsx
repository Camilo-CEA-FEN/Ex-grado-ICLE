import React, { useState, useEffect, useRef } from 'react';

// --- DATOS ---
const groupedData = [
  {
    category: 'Desempeños de la Especialidad',
    color: '#319C91',
    items: [
      { name: 'Uso de Herramientas y Criterios en Contexto Incierto', values: [75, 75, 96, 93, 87] },
      { name: 'Adaptabilidad a Cambios Económicos', values: [53, 69, 48, 84, 74] },
      { name: 'Análisis de Escenarios para la Toma de Decisiones', values: [69, 69, 71, 87, 86] }
    ]
  },
  {
    category: 'Desempeños Comunicación Efectiva',
    color: '#3372B5',
    items: [
      { name: 'Análisis de contenido', values: [82, 50, 55, 71, 56] },
      { name: 'Argumentación', values: [51, 44, 8, 46, 83] },
      { name: 'Producción de discursos', values: [53, 56, 56, 67, 64] },
      { name: 'Voz propia y creativa', values: [29, 6, 0, 6, 40] }
    ]
  },
  {
    category: 'Desempeños Discernimiento Ético',
    color: '#D35400',
    items: [
      { name: 'Delimitación de dilemas éticos', values: [16, 0, 0, 0, 0] },
      { name: 'Proyección de significados y consecuencias', values: [19, 13, 1, 6, 23] },
      { name: 'Integración de componente ético en la toma de decisiones', values: [10, 19, 1, 0, 41] }
    ]
  }
];

const years = [2021, 2022, 2023, 2024, 2025];

const chartConfig = {
  width: 500,
  height: 80,
  margin: { top: 15, right: 15, bottom: 20, left: 40 }
};

// --- SERVICIO DE API GEMINI ---
const fetchWithRetry = async (url, options, retries = 5) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const callGeminiAPI = async (prompt, systemInstruction) => {
  // NOTA: Reemplaza las comillas vacías con tu API Key de Google AI Studio
  const apiKey = "AIzaSyCVILZ9H4tNsHE-ClQqhz0IeAI6T2k59YM"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Ocurrió un inconveniente al procesar la solicitud.";
};

// --- COMPONENTES AUXILIARES ---
const FormattedText = ({ text }) => {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} className="mb-2 leading-relaxed">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
};

const MiniChartRow = ({ name, values, category, color, isLoaded, rowIndex, onGenerateActionPlan }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => setAnimationDone(true), 1500 + rowIndex * 80);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, rowIndex]);

  const { width, height, margin } = chartConfig;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const baselineY = margin.top + innerHeight;
  const barWidth = 24;
  const spacing = innerWidth / values.length;

  return (
    <div className="group flex flex-col md:flex-row items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors rounded-lg px-2 gap-4 relative">
      <div className="w-full md:w-1/3 flex flex-col items-start md:items-end justify-center gap-1">
        <h3 className="text-[13px] font-medium text-gray-700 leading-snug group-hover:text-gray-900 transition-colors text-left md:text-right">
          {name}
        </h3>
        <button 
          onClick={(e) => onGenerateActionPlan(name, values, category, color, e)}
          className="text-[10px] flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 px-2 py-1 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <span>✨</span> Sugerir plan
        </button>
      </div>
      
      <div className="w-full md:w-2/3 relative h-20 flex items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {[0, 50, 100].map((tick) => {
            const y = margin.top + innerHeight - (tick / 100) * innerHeight;
            return (
              <g key={tick}>
                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#e5e7eb" strokeDasharray="2,2" strokeWidth="1" />
                <text x={margin.left - 8} y={y + 3} fontSize="10" fill="#9ca3af" textAnchor="end">{tick}%</text>
              </g>
            );
          })}

          {values.map((val, barIndex) => {
            const barHeight = (val / 100) * innerHeight;
            const x = margin.left + (barIndex * spacing) + (spacing / 2) - (barWidth / 2);
            const targetY = margin.top + innerHeight - barHeight;
            const isHovered = hoveredIndex === barIndex;

            return (
              <g key={barIndex} onMouseEnter={() => setHoveredIndex(barIndex)} onMouseLeave={() => setHoveredIndex(null)} className="cursor-pointer">
                <rect x={x - 10} y={margin.top} width={barWidth + 20} height={innerHeight} fill="transparent" />
                <rect
                  x={x}
                  y={isLoaded ? targetY : baselineY}
                  width={barWidth}
                  height={isLoaded ? barHeight : 0}
                  fill={color}
                  opacity={isHovered ? 0.9 : 0.8}
                  rx="1.5"
                  style={{ transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
                <text x={x + barWidth / 2} y={height - 2} fontSize="10" fill={isHovered ? "#4b5563" : "#9ca3af"} textAnchor="middle">{years[barIndex]}</text>
                {isHovered && (
                  <g>
                    <rect x={x + barWidth / 2 - 18} y={targetY - 20} width="36" height="16" fill="#1f2937" rx="3" />
                    <text x={x + barWidth / 2} y={targetY - 8} fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">{val}%</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalAnalysis, setGlobalAnalysis] = useState({ isLoading: false, data: null });
  const [actionPlanModal, setActionPlanModal] = useState({ isOpen: false, isLoading: false, competency: null, data: null, color: null, position: null });
  const modalRef = useRef(null);

  useEffect(() => {
    setIsLoaded(true);
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setActionPlanModal(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const systemInstruction = `Eres un asesor estratégico de la FEN Universidad de Chile. 
  REGLAS: 
  1. NO saludes. 
  2. Inicia con: "Se sugieren los siguientes enfoques estratégicos:". 
  3. Tono ejecutivo y respetuoso. 
  4. Usa viñetas breves.`;

  const handleGenerateGlobalAnalysis = async () => {
    setGlobalAnalysis({ isLoading: true, data: null });
    const prompt = `Analiza: Especialidad 64%, Comunicación 56%, Ética 15%. Redacta un resumen ejecutivo de 2 párrafos destacando la solidez en especialidad y la oportunidad de innovar en ética y comunicación.`;
    const result = await callGeminiAPI(prompt, systemInstruction);
    setGlobalAnalysis({ isLoading: false, data: result });
  };

  const handleGenerateActionPlan = async (name, values, category, color, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActionPlanModal({ 
      isOpen: true, 
      isLoading: true, 
      competency: name, 
      color, 
      position: { top: rect.bottom + window.scrollY + 10, left: rect.left + window.scrollX } 
    });
    
    const prompt = `Sugerencias para '${name}'. Incluye ejemplos como: Examen RRHH (Verano 2025) "Proponga objetivos..." o Marketing (Otoño 2021) "Estrategia de crecimiento...".`;
    const result = await callGeminiAPI(prompt, systemInstruction);
    setActionPlanModal(prev => ({ ...prev, isLoading: false, data: result }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 flex justify-center relative font-sans">
      <div className="w-full max-w-5xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-[#1E3A8A] uppercase mb-2">Ingeniería Comercial Licenciatura en Ciencias de la Administración de empresas - FEN Universidad de Chile</h4>
            <h1 className="text-2xl font-serif font-bold text-[#111827]">Evolución de la Compatibilidad</h1>
          </div>
          <button 
            onClick={handleGenerateGlobalAnalysis}
            className="bg-[#1E3A8A] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md hover:bg-[#152a61] transition-all"
          >
            ✨ {globalAnalysis.isLoading ? 'Generando...' : 'Síntesis Ejecutiva IA'}
          </button>
        </div>

        {globalAnalysis.data && (
          <div className="mb-10 bg-[#1E3A8A] p-6 rounded-xl text-white shadow-lg animate-fade-in">
            <h3 className="font-bold mb-3 border-b border-white/20 pb-2">✨ Perspectiva Estratégica IA</h3>
            <div className="text-sm opacity-95"><FormattedText text={globalAnalysis.data} /></div>
          </div>
        )}

        <div className="flex flex-col gap-10">
          {groupedData.map((group, i) => (
            <div key={i}>
              <div className="border-b-[3px] mb-4 pb-1" style={{ borderColor: group.color }}>
                <h2 className="text-[14px] font-bold uppercase" style={{ color: group.color }}>{group.category}</h2>
              </div>
              {group.items.map((row, j) => (
                <MiniChartRow key={j} {...row} category={group.category} color={group.color} isLoaded={isLoaded} rowIndex={i*10+j} onGenerateActionPlan={handleGenerateActionPlan} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {actionPlanModal.isOpen && (
        <div className="absolute z-50" style={{ top: actionPlanModal.position?.top, left: actionPlanModal.position?.left }}>
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-[400px] border border-gray-200 overflow-hidden animate-fade-in">
            <div className="px-4 py-2 bg-gray-50 border-b flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">Sugerencias Estratégicas</span>
              <button onClick={() => setActionPlanModal(p => ({...p, isOpen: false}))} className="text-gray-400 text-lg">&times;</button>
            </div>
            <div className="p-4 text-[13px] text-gray-700">
              {actionPlanModal.isLoading ? "Cargando..." : <FormattedText text={actionPlanModal.data} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
