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
  const apiKey = ""; // API Key proveída por el entorno
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  const data = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, hubo un problema al generar la respuesta.";
};

// --- COMPONENTES AUXILIARES ---

// Renderizador simple de Markdown para textos con **negritas**
const FormattedText = ({ text }) => {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} className="mb-2 leading-relaxed inherit-text-color">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // Usamos inherit para que tome el color del contenedor padre (ej. blanco o negro)
            return <strong key={j} className="font-bold text-inherit opacity-100">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
};

// --- COMPONENTE FILA ---
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
          className="text-[10px] flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 px-2 py-1 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
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
                <line
                  x1={margin.left}
                  y1={y}
                  x2={isLoaded ? width - margin.right : margin.left}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="2,2"
                  strokeWidth="1"
                  style={{ transition: `x2 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${rowIndex * 0.08}s` }}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  fontSize="10"
                  fill="#9ca3af"
                  textAnchor="end"
                  opacity={isLoaded ? 1 : 0}
                  style={{ transition: `opacity 0.8s ease-out ${rowIndex * 0.08}s` }}
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {values.map((val, barIndex) => {
            const barHeight = (val / 100) * innerHeight;
            const x = margin.left + (barIndex * spacing) + (spacing / 2) - (barWidth / 2);
            const targetY = margin.top + innerHeight - barHeight;
            const isHovered = hoveredIndex === barIndex;

            return (
              <g 
                key={barIndex}
                onMouseEnter={() => setHoveredIndex(barIndex)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect x={x - 10} y={margin.top} width={barWidth + 20} height={innerHeight} fill="transparent" />
                <rect
                  x={x}
                  y={isLoaded ? targetY : baselineY}
                  width={barWidth}
                  height={isLoaded ? barHeight : 0}
                  fill={color}
                  opacity={isHovered ? 0.9 : 0.8}
                  rx="1.5"
                  style={{
                    transition: animationDone 
                      ? 'opacity 0.2s ease-out' 
                      : `y 1s cubic-bezier(0.16, 1, 0.3, 1) ${rowIndex * 0.08 + 0.3}s, height 1s cubic-bezier(0.16, 1, 0.3, 1) ${rowIndex * 0.08 + 0.3}s`
                  }}
                />
                <text
                  x={x + barWidth / 2}
                  y={height - 2}
                  fontSize="10"
                  fill={isHovered ? "#4b5563" : "#9ca3af"}
                  textAnchor="middle"
                  fontWeight={isHovered ? "bold" : "normal"}
                  opacity={isLoaded ? 1 : 0}
                  style={{ transition: animationDone ? 'all 0.2s ease' : `opacity 0.8s ease-out ${rowIndex * 0.08 + 0.6}s` }}
                >
                  {years[barIndex]}
                </text>

                {isHovered && (
                  <g className="animate-fade-in">
                    <rect x={x + barWidth / 2 - 18} y={targetY - 20} width="36" height="16" fill="#1f2937" rx="3" />
                    <text x={x + barWidth / 2} y={targetY - 8} fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">
                      {val}%
                    </text>
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

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [globalAnalysis, setGlobalAnalysis] = useState({ isLoading: false, data: null });
  const [actionPlanModal, setActionPlanModal] = useState({ isOpen: false, isLoading: false, competency: null, data: null, color: null, position: null });
  const modalRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setActionPlanModal(prev => ({ ...prev, isOpen: false }));
      }
    }

    if (actionPlanModal.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.addEventListener("mousedown", handleClickOutside);
    };
  }, [actionPlanModal.isOpen]);

  // INSTRUCCIÓN DE SISTEMA REVISADA: Directo al grano. Sin saludos.
  const systemInstruction = `Eres un asesor estratégico de la FEN de la Universidad de Chile.
Reglas estrictas:
1. NO saludes. NO hagas preámbulos. NO agradezcas.
2. Inicia SIEMPRE tu respuesta directamente con la frase exacta: "Se sugieren los siguientes enfoques estratégicos:" seguida de viñetas.
3. El tono debe ser altamente profesional y respetuoso de la trayectoria docente, planteando "oportunidades de enriquecimiento" y "evolución de instrumentos" (no uses palabras como 'error' o 'urgente').
4. Sintético y ejecutivo (máximo 2-3 viñetas concisas).
Emite tus respuestas en formato de texto o markdown sencillo.`;

  const handleGenerateGlobalAnalysis = async () => {
    setGlobalAnalysis({ isLoading: true, data: null });
    const prompt = `Analiza la matriz de datos de compatibilidad (2021-2025) de los exámenes de grado con las competencias del perfil de egreso en Ingeniería Comercial, Licenciatura en Administración.

Datos de compatibilidad actuales:
Especialidad: 64%
Comunicación Efectiva: 56%
Discernimiento Ético: 15%

Redacta un breve resumen ejecutivo (máximo 2 párrafos) dirigido al cuerpo académico. 
1. Reconoce la solidez y el buen nivel de los exámenes en el área de Especialidad (64%) como base de la formación.
2. Plantea de forma elegante la oportunidad de integrar más elementos de Comunicación Efectiva (56%) y, de manera muy especial, de explorar nuevas formas para que el Discernimiento Ético (15%) gane más presencia en la evaluación, alineándose con las tendencias globales en la formación de líderes empresariales (basado en el Informe Análisis de exámenes de Grado).
No uses saludos. Empieza directamente con el análisis.`;
    
    try {
      const result = await callGeminiAPI(prompt, systemInstruction);
      setGlobalAnalysis({ isLoading: false, data: result });
    } catch (error) {
      setGlobalAnalysis({ isLoading: false, data: "Ocurrió un error al generar el análisis. Inténtalo de nuevo." });
    }
  };

  const handleGenerateActionPlan = async (name, values, category, color, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      top: rect.bottom + window.scrollY + 10,
      left: rect.left + window.scrollX,
    };

    setActionPlanModal({ isOpen: true, isLoading: true, competency: name, data: null, color: color, position: position });
    
    let prompt = `Para la competencia '${name}' (categoría: '${category}').\n\n`;
    
    // Inserción de ejemplos de los cuadernillos con el nuevo estilo directo
    if (category === 'Desempeños de la Especialidad') {
       prompt += `Sugiere replicar excelentes modelos de preguntas analíticas ya existentes en la facultad. Por ejemplo:
- Menciona cómo el Examen de RRHH (Verano 2025) solicita: "Proponga al menos dos objetivos organizacionales..."
- Menciona cómo el Examen de Marketing (Otoño 2021) pregunta: "¿A qué tipo de estrategia de crecimiento corresponde...?"
Explica brevemente por qué este tipo de preguntas miden eficazmente la adaptabilidad y el análisis de escenarios.`;
    } else if (category === 'Desempeños Comunicación Efectiva') {
       prompt += `Sugiere la posibilidad de diversificar las herramientas de evaluación (como ensayos o propuestas de negocios), tal como señala el "Informe de Análisis", para brindar a los estudiantes más espacios donde demuestren su capacidad de argumentar y adaptar su mensaje a distintos públicos.`;
    } else if (category === 'Desempeños Discernimiento Ético') {
       prompt += `Sugiere reflexionar sobre cómo incorporar variables éticas en la toma de decisiones dentro de los mismos casos de estudio (por ejemplo, evaluando impactos a largo plazo o aspectos de sostenibilidad), apoyándote en las recomendaciones del "Informe de Análisis" para elevar el porcentaje de evaluación de forma orgánica.`;
    }

    try {
      const result = await callGeminiAPI(prompt, systemInstruction);
      setActionPlanModal(prev => ({ ...prev, isLoading: false, data: result }));
    } catch (error) {
      setActionPlanModal(prev => ({ ...prev, isLoading: false, data: "Error al generar el plan de acción." }));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 font-sans flex justify-center relative">
      <div className="w-full max-w-5xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h4 className="text-[10px] font-bold tracking-widest text-[#1E3A8A] uppercase mb-2">FEN Universidad de Chile · Ingeniería Comercial Licenciatura en Ciencias de la Administración de Empresas</h4>
            <h1 className="text-2xl font-serif font-bold text-[#111827] mb-1">Evolución de la Compatibilidad de los exámenes de grado</h1>
            <p className="text-gray-500 text-sm">% de compatibilidad (coherencia y completitud) con las competencias declaradas (2021 - 2025)</p>
          </div>
          
          <button 
            onClick={handleGenerateGlobalAnalysis}
            disabled={globalAnalysis.isLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${globalAnalysis.isLoading ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]/50 cursor-wait' : 'bg-[#1E3A8A] text-white hover:bg-[#1e3a8a] shadow-md hover:shadow-lg'}`}
          >
            <span>✨</span> {globalAnalysis.isLoading ? 'Generando síntesis...' : 'Síntesis Ejecutiva IA'}
          </button>
        </div>

        {/* Panel de Resultados del Análisis Global (Colores Ajustados: Azul Claro y Texto Blanco) */}
        {(globalAnalysis.isLoading || globalAnalysis.data) && (
          <div className="mb-10 bg-[#1E3A8A] border border-[#1e40af] p-6 rounded-xl animate-fade-in relative overflow-hidden shadow-lg">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 text-white opacity-10 text-8xl">✨</div>
             
             <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-white/20 pb-3">
               <span className="text-blue-200">✨</span> Perspectiva Estratégica Asistida por IA
             </h3>
             
             {globalAnalysis.isLoading ? (
               <div className="flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-white/30 rounded w-full"></div>
                  <div className="h-4 bg-white/30 rounded w-11/12"></div>
                  <div className="h-4 bg-white/30 rounded w-4/5 mt-2"></div>
               </div>
             ) : (
               <div className="relative z-10 text-white text-sm">
                 <div className="text-white opacity-95">
                   <FormattedText text={globalAnalysis.data} />
                 </div>
               </div>
             )}
          </div>
        )}
        
        <div className="flex flex-col gap-10">
          {groupedData.map((group, groupIndex) => (
            <div key={groupIndex} className="flex flex-col">
              
              <div className="flex flex-col md:flex-row md:items-end border-b-[3px] mb-2 pb-2 px-2 gap-4" style={{ borderColor: group.color }}>
                <div className="w-full md:w-1/3 flex justify-start md:justify-end">
                  <h2 className="text-[15px] font-bold uppercase tracking-wide text-left md:text-right" style={{ color: group.color }}>
                    {group.category}
                  </h2>
                </div>
                
                <div className="hidden md:block w-2/3 h-6">
                  <svg viewBox={`0 0 ${chartConfig.width} 24`} className="w-full h-full overflow-visible">
                    <text x={chartConfig.margin.left - 8} y="20" fontSize="10" fill="#9ca3af" textAnchor="end" fontWeight="bold">%</text>
                    <text x={chartConfig.margin.left + (chartConfig.width - chartConfig.margin.left - chartConfig.margin.right) / 2} y="20" fontSize="10" fill="#9ca3af" textAnchor="middle" fontWeight="bold" letterSpacing="0.05em">PROGRESO ANUAL</text>
                  </svg>
                </div>
              </div>

              <div className="flex flex-col">
                {group.items.map((row, itemIndex) => {
                  const globalRowIndex = groupIndex * 10 + itemIndex;
                  return (
                    <MiniChartRow 
                      key={row.name} 
                      name={row.name} 
                      values={row.values} 
                      category={group.category}
                      color={group.color} 
                      isLoaded={isLoaded}
                      rowIndex={globalRowIndex}
                      onGenerateActionPlan={handleGenerateActionPlan}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {actionPlanModal.isOpen && (
        <div className="absolute z-50" style={{ top: actionPlanModal.position?.top, left: actionPlanModal.position?.left }}>
          <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-[400px] w-full overflow-hidden animate-fade-in border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <span style={{ color: actionPlanModal.color }}>✨</span> Ideas para explorar
              </h3>
              <button 
                onClick={() => setActionPlanModal({ isOpen: false, isLoading: false, competency: null, data: null, color: null, position: null })}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Dimensión:</p>
                <p className="text-xs font-medium text-gray-800 border-l-2 pl-2" style={{ borderColor: actionPlanModal.color }}>
                  {actionPlanModal.competency}
                </p>
              </div>

              <div className="bg-gray-50/50 rounded-lg p-3 text-xs min-h-[100px]">
                {actionPlanModal.isLoading ? (
                   <div className="flex flex-col gap-2 justify-center items-center h-full text-gray-400 py-4">
                      <div className="animate-spin text-lg">✨</div>
                      <p className="text-[10px]">Elaborando sugerencias...</p>
                   </div>
                ) : (
                  <div className="text-gray-700 text-[13px]">
                     <FormattedText text={actionPlanModal.data || ""} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
