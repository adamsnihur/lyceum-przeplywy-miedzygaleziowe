/**
 * Lyceum: Przepływy Międzygałęziowe w Ujęciu Makroekonomicznym
 * Logika symulacji modelu Leontiefa, odwracanie macierzy, wizualizacja Canvas i Plotly
 */

// Stan globalny modelu
const state = {
  // Nazwy sektorów
  sectors: [
    { id: 'ind', name: 'Przemysł i Energetyka', short: 'Przemysł', color: '#2563eb' },
    { id: 'agr', name: 'Rolnictwo i Żywność', short: 'Rolnictwo', color: '#059669' },
    { id: 'ser', name: 'Usługi i Technologie', short: 'Usługi', color: '#d97706' }
  ],

  // Macierz współczynników kosztów technologicznych A [i][j]
  // i - wiersz (dostawca), j - kolumna (odbiorca)
  A: [
    [0.28, 0.22, 0.12], // Dostawy Przemysłu do: [Przemysłu, Rolnictwa, Usług]
    [0.04, 0.25, 0.05], // Dostawy Rolnictwa do: [Przemysłu, Rolnictwa, Usług]
    [0.18, 0.15, 0.32]  // Dostawy Usług do:      [Przemysłu, Rolnictwa, Usług]
  ],

  // Popyt końcowy Y (w mld PLN)
  Y: [420, 150, 680],

  // Wyliczane wielkości
  L: null,    // Macierz odwrotna Leontiefa (I - A)^-1
  X: null,    // Produkcja globalna
  Z: null,    // Przepływy międzygałęziowe z_ij = a_ij * X_j
  V: null,    // Wartość dodana brutto
  gdp: 0,     // Suma Y = Suma V = PKB

  // Mnożniki i wskaźniki Rasmussena
  multipliers: [],
  backwardLinkages: [],
  forwardLinkages: [],

  // Wybrany aktywny scenariusz
  activeScenario: 'baseline',

  // Quiz state
  quizAnswers: {},
  quizSubmitted: false
};

// =========================================================================
// ALGEBRA MACIERZOWA (Rozwiązanie 3x3)
// =========================================================================

/**
 * Mnożenie macierzy 3x3 przez wektor 3x1
 */
function matVecMul3(M, v) {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]
  ];
}

/**
 * Mnożenie macierzy 3x3 przez macierz 3x3
 */
function matMatMul3(A, B) {
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    }
  }
  return C;
}

/**
 * Wyznacznik macierzy 3x3
 */
function det3(M) {
  return (
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
  );
}

/**
 * Odwrócenie macierzy 3x3 metodą macierzy dołączonej
 */
function invert3(M) {
  const d = det3(M);
  if (Math.abs(d) < 1e-9) {
    throw new Error('Macierz osobliwa - brak jednoznacznego rozwiązania!');
  }

  const invDet = 1.0 / d;
  return [
    [
      (M[1][1] * M[2][2] - M[1][2] * M[2][1]) * invDet,
      (M[0][2] * M[2][1] - M[0][1] * M[2][2]) * invDet,
      (M[0][1] * M[1][2] - M[0][2] * M[1][1]) * invDet
    ],
    [
      (M[1][2] * M[2][0] - M[1][0] * M[2][2]) * invDet,
      (M[0][0] * M[2][2] - M[0][2] * M[2][0]) * invDet,
      (M[0][2] * M[1][0] - M[0][0] * M[1][2]) * invDet
    ],
    [
      (M[1][0] * M[2][1] - M[1][1] * M[2][0]) * invDet,
      (M[0][1] * M[2][0] - M[0][0] * M[2][1]) * invDet,
      (M[0][0] * M[1][1] - M[0][1] * M[1][0]) * invDet
    ]
  ];
}

// =========================================================================
// OBLICZENIA MODELU LEONTIEFA
// =========================================================================

function solveModel() {
  // 1. Sprawdź warunek Hawkinsa-Simona (sumy kolumn A < 1)
  const colSums = [0, 1, 2].map(j => state.A[0][j] + state.A[1][j] + state.A[2][j]);
  const isProductive = colSums.every(s => s < 0.999);

  // 2. Macierz (I - A)
  const I_minus_A = [
    [1 - state.A[0][0], -state.A[0][1], -state.A[0][2]],
    [-state.A[1][0], 1 - state.A[1][1], -state.A[1][2]],
    [-state.A[2][0], -state.A[2][1], 1 - state.A[2][2]]
  ];

  const determinant = det3(I_minus_A);

  // 3. Odwrócenie: L = (I - A)^-1
  state.L = invert3(I_minus_A);

  // 4. Produkcja globalna: X = L * Y
  state.X = matVecMul3(state.L, state.Y);

  // 5. Przepływy międzygałęziowe: z_ij = a_ij * X_j
  state.Z = [
    [state.A[0][0] * state.X[0], state.A[0][1] * state.X[1], state.A[0][2] * state.X[2]],
    [state.A[1][0] * state.X[0], state.A[1][1] * state.X[1], state.A[1][2] * state.X[2]],
    [state.A[2][0] * state.X[0], state.A[2][1] * state.X[1], state.A[2][2] * state.X[2]]
  ];

  // 6. Wartość dodana brutto: V_j = X_j - suma kolumny z_ij
  state.V = [
    state.X[0] - (state.Z[0][0] + state.Z[1][0] + state.Z[2][0]),
    state.X[1] - (state.Z[0][1] + state.Z[1][1] + state.Z[2][1]),
    state.X[2] - (state.Z[0][2] + state.Z[1][2] + state.Z[2][2])
  ];

  // 7. PKB (Suma Y = Suma V)
  state.gdp = state.Y[0] + state.Y[1] + state.Y[2];

  // 8. Mnożniki produkcji (sumy kolumn macierzy L)
  state.multipliers = [0, 1, 2].map(j => state.L[0][j] + state.L[1][j] + state.L[2][j]);

  // 9. Wskaźniki powiązań Rasmussena
  const totalLSum = state.multipliers.reduce((a, b) => a + b, 0);
  const avgL = totalLSum / 3;

  // Backward Linkages (kolumny)
  state.backwardLinkages = state.multipliers.map(m => m / avgL);

  // Forward Linkages (wiersze)
  const rowSums = [0, 1, 2].map(i => state.L[i][0] + state.L[i][1] + state.L[i][2]);
  state.forwardLinkages = rowSums.map(r => r / avgL);
}

// =========================================================================
// SYNCHRONIZACJA WIDOKU (DOM UPDATE)
// =========================================================================

function updateUI() {
  solveModel();

  // 1. KPI Wskaźniki Główne
  document.getElementById('kpiGdp').innerText = state.gdp.toFixed(1) + ' mld PLN';
  const totalX = state.X[0] + state.X[1] + state.X[2];
  document.getElementById('kpiTotalX').innerText = totalX.toFixed(1) + ' mld PLN';
  const intermediateTotal = totalX - state.gdp;
  document.getElementById('kpiIntermediate').innerText = intermediateTotal.toFixed(1) + ' mld PLN';
  const avgMultiplier = (totalX / state.gdp).toFixed(2);
  document.getElementById('kpiMultiplierAvg').innerText = avgMultiplier + 'x';

  // 2. Tablica Przepływów Międzygałęziowych (IO Table)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cell = document.getElementById(`cell_z_${i}_${j}`);
      if (cell) cell.innerText = state.Z[i][j].toFixed(1);
    }
    const cellY = document.getElementById(`cell_y_${i}`);
    if (cellY) cellY.innerText = state.Y[i].toFixed(1);

    const cellX = document.getElementById(`cell_x_row_${i}`);
    if (cellX) cellX.innerText = state.X[i].toFixed(1);
  }

  // Podsumowania kolumn (Zużycie pośrednie kolumny, Wartość dodana, Produkcja globalna)
  for (let j = 0; j < 3; j++) {
    const colInter = state.Z[0][j] + state.Z[1][j] + state.Z[2][j];
    const cellColInter = document.getElementById(`cell_inter_col_${j}`);
    if (cellColInter) cellColInter.innerText = colInter.toFixed(1);

    const cellV = document.getElementById(`cell_v_${j}`);
    if (cellV) cellV.innerText = state.V[j].toFixed(1);

    const cellXCol = document.getElementById(`cell_x_col_${j}`);
    if (cellXCol) cellXCol.innerText = state.X[j].toFixed(1);
  }

  // Komórki tożsamości
  document.getElementById('cell_sum_inter').innerText = intermediateTotal.toFixed(1);
  document.getElementById('cell_sum_y').innerText = state.gdp.toFixed(1);
  document.getElementById('cell_sum_v').innerText = (state.V[0] + state.V[1] + state.V[2]).toFixed(1);
  document.getElementById('cell_sum_grand_x').innerText = totalX.toFixed(1);

  // 3. Etykiety suwaków
  document.getElementById('valY0').innerText = state.Y[0] + ' mld PLN';
  document.getElementById('valY1').innerText = state.Y[1] + ' mld PLN';
  document.getElementById('valY2').innerText = state.Y[2] + ' mld PLN';

  // 4. Prezentacja Macierzy A i Macierzy Odwrotnej Leontiefa L
  renderMatricesDisplay();

  // 5. Prezentacja Wskaźników Rasmussena
  renderRasmussenBadges();

  // 6. Wykres Plotly: Dekompozycja fal mnożnika Neumanna
  renderNeumannChart();

  // 7. Wykres Plotly: Struktura produkcji (Wartość Dodana vs Zużycie Pośrednie)
  renderStructureChart();

  // 8. Rysowanie sieci na Canvas
  drawNetworkGraph();
}

// =========================================================================
// RENDEROWANIE MACIERZY I WSKAŹNIKÓW
// =========================================================================

function renderMatricesDisplay() {
  const containerA = document.getElementById('matrixADisplay');
  if (containerA) {
    let htmlA = '<div class="grid grid-cols-3 gap-2 text-center font-mono text-xs">';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        htmlA += `<div class="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <span class="text-slate-400 block text-[10px]">a${i+1}${j+1}</span>
          <span class="font-bold text-slate-800">${state.A[i][j].toFixed(2)}</span>
        </div>`;
      }
    }
    htmlA += '</div>';
    containerA.innerHTML = htmlA;
  }

  const containerL = document.getElementById('matrixLDisplay');
  if (containerL) {
    let htmlL = '<div class="grid grid-cols-3 gap-2 text-center font-mono text-xs">';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const isDiag = (i === j);
        const bg = isDiag ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200';
        const txt = isDiag ? 'text-blue-700 font-bold' : 'text-slate-800 font-semibold';
        htmlL += `<div class="p-2 ${bg} border rounded-md">
          <span class="text-slate-400 block text-[10px]">l${i+1}${j+1}</span>
          <span class="${txt}">${state.L[i][j].toFixed(3)}</span>
        </div>`;
      }
    }
    htmlL += '</div>';
    containerL.innerHTML = htmlL;
  }
}

function renderRasmussenBadges() {
  for (let s = 0; s < 3; s++) {
    const multEl = document.getElementById(`mult_s_${s}`);
    if (multEl) multEl.innerText = state.multipliers[s].toFixed(3);

    const blEl = document.getElementById(`bl_s_${s}`);
    if (blEl) {
      const bl = state.backwardLinkages[s];
      blEl.innerText = bl.toFixed(2);
      blEl.className = bl >= 1.0 ? 'font-bold text-emerald-600' : 'text-slate-600';
    }

    const flEl = document.getElementById(`fl_s_${s}`);
    if (flEl) {
      const fl = state.forwardLinkages[s];
      flEl.innerText = fl.toFixed(2);
      flEl.className = fl >= 1.0 ? 'font-bold text-blue-600' : 'text-slate-600';
    }

    const classEl = document.getElementById(`class_s_${s}`);
    if (classEl) {
      const bl = state.backwardLinkages[s];
      const fl = state.forwardLinkages[s];
      let classification = '';
      let badgeStyle = '';

      if (bl >= 1.0 && fl >= 1.0) {
        classification = 'Kluczowy (Obustronny)';
        badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
      } else if (bl >= 1.0 && fl < 1.0) {
        classification = 'Ciągnący Popytowo (Motor)';
        badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (bl < 1.0 && fl >= 1.0) {
        classification = 'Bazowy Zaopatrzeniowy';
        badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
      } else {
        classification = 'Niezależny';
        badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200';
      }
      classEl.innerText = classification;
      classEl.className = `inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeStyle}`;
    }
  }
}

// =========================================================================
// WYKRESY PLOTLY
// =========================================================================

/**
 * Wykres 1: Fale mnożnika w szeregu Neumanna (I, A, A^2, A^3, ...)
 * Pokazuje jak impuls popytowy rozchodzi się falami w gospodarce
 */
function renderNeumannChart() {
  const chartDiv = document.getElementById('neumannChart');
  if (!chartDiv || typeof Plotly === 'undefined') return;

  // Obliczenie fal dla wektora popytu Y
  // Faza 0: Y
  const wave0 = [...state.Y];
  // Faza 1: A * Y
  const wave1 = matVecMul3(state.A, state.Y);
  // Faza 2: A^2 * Y
  const A2 = matMatMul3(state.A, state.A);
  const wave2 = matVecMul3(A2, state.Y);
  // Faza 3: A^3 * Y
  const A3 = matMatMul3(A2, state.A);
  const wave3 = matVecMul3(A3, state.Y);
  // Reszta do sumy L * Y
  const sumWaves = [0, 1, 2].map(i => wave0[i] + wave1[i] + wave2[i] + wave3[i]);
  const waveRest = [0, 1, 2].map(i => Math.max(0, state.X[i] - sumWaves[i]));

  const traces = [
    {
      x: ['Przemysł', 'Rolnictwo', 'Usługi'],
      y: wave0,
      name: 'Faza 0: Popyt Końcowy (I·Y)',
      type: 'bar',
      marker: { color: '#2563eb' }
    },
    {
      x: ['Przemysł', 'Rolnictwo', 'Usługi'],
      y: wave1,
      name: 'Faza 1: Dostawcy Bezpośredni (A·Y)',
      type: 'bar',
      marker: { color: '#059669' }
    },
    {
      x: ['Przemysł', 'Rolnictwo', 'Usługi'],
      y: wave2,
      name: 'Faza 2: Dostawcy II Rzędu (A²·Y)',
      type: 'bar',
      marker: { color: '#d97706' }
    },
    {
      x: ['Przemysł', 'Rolnictwo', 'Usługi'],
      y: wave3,
      name: 'Faza 3: Dostawcy III Rzędu (A³·Y)',
      type: 'bar',
      marker: { color: '#7c3aed' }
    },
    {
      x: ['Przemysł', 'Rolnictwo', 'Usługi'],
      y: waveRest,
      name: 'Kolejne Fale (A⁴+...)',
      type: 'bar',
      marker: { color: '#94a3b8' }
    }
  ];

  const layout = {
    barmode: 'stack',
    margin: { l: 50, r: 20, t: 30, b: 40 },
    height: 320,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Plus Jakarta Sans', color: '#0f172a', size: 11 },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } },
    yaxis: {
      title: 'Produkcja Globalna (mld PLN)',
      gridcolor: '#e2e8f0',
      zerolinecolor: '#cbd5e1'
    },
    xaxis: {
      gridcolor: '#e2e8f0'
    }
  };

  const config = { responsive: true, displayModeBar: false };
  Plotly.react(chartDiv, traces, layout, config);
}

/**
 * Wykres 2: Struktura Makroekonomiczna (Wartość Dodana vs Zużycie Pośrednie)
 */
function renderStructureChart() {
  const chartDiv = document.getElementById('structureChart');
  if (!chartDiv || typeof Plotly === 'undefined') return;

  const intermediateCosts = [0, 1, 2].map(j => state.Z[0][j] + state.Z[1][j] + state.Z[2][j]);

  const trace1 = {
    x: ['Przemysł', 'Rolnictwo', 'Usługi'],
    y: state.V,
    name: 'Wartość Dodana (PKB)',
    type: 'bar',
    marker: { color: '#10b981' }
  };

  const trace2 = {
    x: ['Przemysł', 'Rolnictwo', 'Usługi'],
    y: intermediateCosts,
    name: 'Zużycie Pośrednie (Koszty)',
    type: 'bar',
    marker: { color: '#64748b' }
  };

  const layout = {
    barmode: 'group',
    margin: { l: 50, r: 20, t: 30, b: 40 },
    height: 320,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Plus Jakarta Sans', color: '#0f172a', size: 11 },
    legend: { orientation: 'h', y: -0.2, font: { size: 10 } },
    yaxis: {
      title: 'Wartość (mld PLN)',
      gridcolor: '#e2e8f0'
    }
  };

  const config = { responsive: true, displayModeBar: false };
  Plotly.react(chartDiv, [trace1, trace2], layout, config);
}

// =========================================================================
// CANVAS: SIEĆ POWIĄZAŃ MIĘDZYSEKTOROWYCH (INTERACTIVE NETWORK GRAPH)
// =========================================================================

let animFrame = null;
let animParticles = [];

function initParticles() {
  animParticles = [];
  for (let i = 0; i < 40; i++) {
    animParticles.push({
      from: Math.floor(Math.random() * 3),
      to: Math.floor(Math.random() * 3),
      t: Math.random(),
      speed: 0.003 + Math.random() * 0.004
    });
  }
}

function drawNetworkGraph() {
  const canvas = document.getElementById('networkCanvas');
  if (!canvas || !state.X || !state.Z) return;
  const ctx = canvas.getContext('2d');

  // Skalowanie Retina/HiDPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  // Czyścimy tło
  ctx.clearRect(0, 0, w, h);

  // Pozycje 3 sektorów w trójkącie
  const nodeRadius = 38;
  const nodes = [
    { x: w * 0.25, y: h * 0.75, name: 'Przemysł', color: '#2563eb', val: state.X[0] },
    { x: w * 0.75, y: h * 0.75, name: 'Rolnictwo', color: '#059669', val: state.X[1] },
    { x: w * 0.50, y: h * 0.24, name: 'Usługi', color: '#d97706', val: state.X[2] }
  ];

  // 1. Rysujemy strumienie międzysektorowe (krawędzie ze strzałkami)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const flow = state.Z[i][j];
      if (i === j) {
        // Pętla wewnętrzna (zużycie wewnątrzsektorowe)
        drawSelfLoop(ctx, nodes[i], flow, i);
      } else {
        // Krawędź skierowana od dostawcy i do odbiorcy j
        drawDirectedEdge(ctx, nodes[i], nodes[j], flow, nodeRadius);
      }
    }
  }

  // 2. Rysujemy animowane cząstki przepływu (reprezentujące towary/usługi)
  drawFlowParticles(ctx, nodes, nodeRadius);

  // 3. Rysujemy węzły sektorów
  nodes.forEach((n, idx) => {
    // Cień węzła
    ctx.beginPath();
    ctx.arc(n.x, n.y, nodeRadius + 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.fill();

    // Koło główne
    ctx.beginPath();
    ctx.arc(n.x, n.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = n.color;
    ctx.stroke();

    // Ikona / Nazwa
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px "Plus Jakarta Sans"';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(n.name, n.x, n.y - 7);

    // Wartość produkcji
    ctx.font = '600 11px "JetBrains Mono"';
    ctx.fillStyle = n.color;
    ctx.fillText(n.val.toFixed(0) + ' mld', n.x, n.y + 10);
  });

  ctx.restore();
}

function drawDirectedEdge(ctx, fromNode, toNode, flow, radius) {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const ux = dx / dist;
  const uy = dy / dist;

  // Przesunięcie łuku by nie nakładały się strumienie tam i z powrotem
  const perpX = -uy * 14;
  const perpY = ux * 14;

  const startX = fromNode.x + ux * radius + perpX;
  const startY = fromNode.y + uy * radius + perpY;
  const endX = toNode.x - ux * (radius + 6) + perpX;
  const endY = toNode.y - uy * (radius + 6) + perpY;

  // Grubość proporcjonalna do przepływu (od 1px do 8px)
  const lineWidth = Math.max(1.2, Math.min(7.5, (flow / 80) * 3));

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Grot strzałki
  const arrowAngle = Math.atan2(endY - startY, endX - startX);
  const arrowLen = 7 + lineWidth * 0.4;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
    endY - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
    endY - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = '#64748b';
  ctx.fill();

  // Etykieta przepływu w połowie krawędzi
  const midX = (startX + endX) / 2 + perpX * 0.5;
  const midY = (startY + endY) / 2 + perpY * 0.5;
  ctx.font = '500 10px "JetBrains Mono"';
  ctx.fillStyle = '#475569';
  ctx.fillText(flow.toFixed(1) + ' mld', midX, midY);
}

function drawSelfLoop(ctx, node, flow, idx) {
  // Pętla na zewnątrz trójkąta
  let offsetX = 0;
  let offsetY = 0;
  if (idx === 0) { offsetX = -36; offsetY = 25; }
  else if (idx === 1) { offsetX = 36; offsetY = 25; }
  else { offsetX = 0; offsetY = -40; }

  const loopRadius = 18;
  const cx = node.x + offsetX;
  const cy = node.y + offsetY;

  ctx.beginPath();
  ctx.arc(cx, cy, loopRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = Math.max(1, (flow / 120) * 3.5);
  ctx.stroke();

  ctx.font = '500 9px "JetBrains Mono"';
  ctx.fillStyle = '#64748b';
  ctx.fillText(flow.toFixed(0), cx, cy);
}

function drawFlowParticles(ctx, nodes, radius) {
  animParticles.forEach(p => {
    p.t += p.speed;
    if (p.t > 1) {
      p.t = 0;
      p.from = Math.floor(Math.random() * 3);
      let to = Math.floor(Math.random() * 3);
      while (to === p.from) to = Math.floor(Math.random() * 3);
      p.to = to;
    }

    if (p.from === p.to) return;
    const fromN = nodes[p.from];
    const toN = nodes[p.to];

    const dx = toN.x - fromN.x;
    const dy = toN.y - fromN.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist;
    const uy = dy / dist;
    const perpX = -uy * 14;
    const perpY = ux * 14;

    const startX = fromN.x + ux * radius + perpX;
    const startY = fromN.y + uy * radius + perpY;
    const endX = toN.x - ux * radius + perpX;
    const endY = toN.y - uy * radius + perpY;

    const px = startX + (endX - startX) * p.t;
    const py = startY + (endY - startY) * p.t;

    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = fromN.color;
    ctx.fill();
  });
}

function loopAnimation() {
  drawNetworkGraph();
  animFrame = requestAnimationFrame(loopAnimation);
}

// =========================================================================
// SCENARIUSZE SZOKÓW MAKROEKONOMICZNYCH
// =========================================================================

const scenarios = {
  baseline: {
    name: 'Stan Bazowy (Gospodarka Zrównoważona)',
    Y: [420, 150, 680],
    A: [
      [0.28, 0.22, 0.12],
      [0.04, 0.25, 0.05],
      [0.18, 0.15, 0.32]
    ],
    desc: 'Zrównoważona struktura gospodarki z dominacją usług w popycie końcowym i silnym przemysłem.'
  },
  cpk: {
    name: 'Wielki Program Infrastrukturalny (+60 mld PLN)',
    Y: [480, 150, 680],
    A: [
      [0.28, 0.22, 0.12],
      [0.04, 0.25, 0.05],
      [0.18, 0.15, 0.32]
    ],
    desc: 'Wzrost popytu końcowego na przemysł i budownictwo o 60 mld PLN (inwestycje kolejowe, energetyka jądrowa).'
  },
  energy_shock: {
    name: 'Szok Kosztów Energii (+wzrost a11, a12, a13)',
    Y: [420, 150, 680],
    A: [
      [0.34, 0.27, 0.17], // Wzrost nakładów na przemysł i nośniki energii
      [0.04, 0.25, 0.05],
      [0.18, 0.15, 0.32]
    ],
    desc: 'Drastyczny wzrost cen energii zwiększa materiałochłonność każdego sektora, zmuszając do wyższej produkcji globalnej dla tego samego popytu końcowego.'
  },
  tech_boom: {
    name: 'Boom Usług Cyfrowych & Eksportu IT (+70 mld PLN)',
    Y: [420, 150, 750],
    A: [
      [0.28, 0.22, 0.12],
      [0.04, 0.25, 0.05],
      [0.18, 0.15, 0.35]
    ],
    desc: 'Wzrost eksportu usług biznesowych oraz intensyfikacja cyfryzacji procesów wewnątrz sektora usług.'
  },
  recession: {
    name: 'Kryzys Konsumpcyjny (-15% we wszystkich sektorach)',
    Y: [357, 127.5, 578],
    A: [
      [0.28, 0.22, 0.12],
      [0.04, 0.25, 0.05],
      [0.18, 0.15, 0.32]
    ],
    desc: 'Szok popytowy o charakterze ogólnogospodarczym: spadek konsumpcji i inwestycji w całym kraju.'
  }
};

function applyScenario(scenarioKey) {
  const sc = scenarios[scenarioKey];
  if (!sc) return;

  state.activeScenario = scenarioKey;
  state.Y = [...sc.Y];
  state.A = sc.A.map(row => [...row]);

  // Synchronizacja kontrolek formularza
  document.getElementById('sliderY0').value = state.Y[0];
  document.getElementById('sliderY1').value = state.Y[1];
  document.getElementById('sliderY2').value = state.Y[2];

  document.getElementById('scenarioDesc').innerHTML = `
    <strong>${sc.name}:</strong> ${sc.desc}
  `;

  // Podświetlenie przycisku scenariusza
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.classList.remove('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
    if (btn.dataset.scenario === scenarioKey) {
      btn.classList.add('active', 'border-blue-500', 'bg-blue-50', 'text-blue-700');
    }
  });

  updateUI();
}

// =========================================================================
// QUIZ WIEDZY
// =========================================================================

const quizQuestions = [
  {
    id: 'q1',
    question: 'Czym różni się zużycie pośrednie od popytu końcowego w tablicy przepływów międzygałęziowych?',
    options: [
      { text: 'Zużycie pośrednie to dobra konsumowane w bieżącym procesie produkcji innych dóbr, a popyt końcowy to dobra opuszczające proces wytwórczy (konsumpcja, inwestycje, eksport).', correct: true },
      { text: 'Zużycie pośrednie dotyczy tylko importu surowców, a popyt końcowy to wyłącznie produkcja krajowa.', correct: false },
      { text: 'Zużycie pośrednie jest składnikiem PKB, a popyt końcowy nie wchodzi do rachunku PKB.', correct: false },
      { text: 'Pomiędzy tymi pojęciami nie ma różnicy - to synonimy w rachunkowości narodowej.', correct: false }
    ],
    explanation: 'Dobra zużycia pośredniego (surowce, komponenty, energia) są w całości przekształcane lub pochłaniane w bieżącej produkcji. Wliczenie ich do PKB spowodowałoby błąd wielokrotnego liczenia (double counting). Popyt końcowy to produkt końcowy gospodarki.'
  },
  {
    id: 'q2',
    question: 'Jaka jest interpretacja ekonomiczna elementu $l_{ij}$ w macierzy odwrotnej Leontiefa $L = (I - A)^{-1}$?',
    options: [
      { text: 'Określa, ile jednostek dobra $i$ trzeba dostarczyć bezpośrednio i pośrednio, aby zaspokoić 1 jednostkę popytu końcowego na dobro $j$.', correct: true },
      { text: 'Oznacza procentowy udział gałęzi $i$ w zyskach gałęzi $j$.', correct: false },
      { text: 'To wyłącznie bezpośrednia ilość dobra $i$ zużywana do wyprodukowania jednostki dobra $j$ (bez dostawców pośrednich).', correct: false },
      { text: 'Jest to elastyczność cenowa popytu na dobro $i$ względem ceny dobra $j$.', correct: false }
    ],
    explanation: 'Element $l_{ij}$ to pełny współczynnik nakładów (total requirements). Uwzględnia on całą nieskończoną kaskadę dostawców: bezpośrednich ($a_{ij}$), poddostawców ($A^2$), pod-poddostawców ($A^3$) i tak dalej.'
  },
  {
    id: 'q3',
    question: 'Dlaczego w zbilansowanej tablicy Leontiefa suma popytu końcowego ($\sum Y_i$) jest ściśle równa sumie wartości dodanej ($\sum V_j$)?',
    options: [
      { text: 'Wynika to z fundamentalnej tożsamości makroekonomicznej: suma produkcji globalnej wierszami równa się sumie kolumnami, a przepływy pośrednie redukują się po obu stronach bilansu.', correct: true },
      { text: 'Jest to przypadkowa zbieżność liczbowa w modelu 3-sektorowym.', correct: false },
      { text: 'Ponieważ rząd ustala ceny w taki sposób, by zyski pokrywały wydatki konsumentów.', correct: false },
      { text: 'Suma ta jest równa tylko wtedy, gdy w gospodarce nie ma podatków ani eksportu.', correct: false }
    ],
    explanation: 'Ponieważ $\sum X_i = \sum_{i,j} z_{ij} + \sum Y_i$ oraz $\sum X_j = \sum_{i,j} z_{ij} + \sum V_j$, odejmując obustronnie sumę zużycia pośredniego $\sum z_{ij}$, otrzymujemy $\sum Y_i = \sum V_j = \\text{PKB}$. To metoda wydatkowa vs metoda dochodowa liczenia PKB.'
  },
  {
    id: 'q4',
    question: 'Co oznacza, że sektor posiada wskaźnik powiązań w tył (Backward Linkage) $BL_j > 1$ według Rasmussena?',
    options: [
      { text: 'Sektor ten wywiera ponadprzeciętnie silny impuls popytowy na resztę gospodarki - jego rozwój silnie ciągnie dostawców.', correct: true },
      { text: 'Sektor jest zacofany technologicznie i traci konkurencyjność międzynarodową.', correct: false },
      { text: 'Sektor nie korzysta z surowców krajowych, lecz opiera się wyłącznie na imporcie.', correct: false },
      { text: 'Sektor ma zerowy wpływ na produkcję pozostałych gałęzi.', correct: false }
    ],
    explanation: 'Wskaźnik $BL_j > 1$ (siła rozproszenia / Power of Dispersion) oznacza, że jednostkowy wzrost popytu końcowego na wyroby tego sektora generuje większy sumaryczny wzrost produkcji u jego dostawców niż przeciętny sektor w gospodarce.'
  },
  {
    id: 'q5',
    question: 'Kiedy rozwinięcie macierzy odwrotnej Leontiefa w szereg Neumanna $(I - A)^{-1} = I + A + A^2 + A^3 + \dots$ jest zbieżne?',
    options: [
      { text: 'Gdy promień spektralny macierzy $A$ jest mniejszy od 1 ($\rho(A) < 1$), co w praktyce oznacza spełnienie warunków produktywności Hawkinsa-Simona.', correct: true },
      { text: 'Zawsze, dla dowolnej macierzy kwadratowej o niezerowych współczynnikach.', correct: false },
      { text: 'Tylko wtedy, gdy macierz $A$ jest diagonalna (brak powiązań między gałęziami).', correct: false },
      { text: 'Nigdy - szereg ten jest z definicji rozbieżny w realnej gospodarce.', correct: false }
    ],
    explanation: 'Zbieżność szeregu geometrycznego macierzy wymaga $\\rho(A) < 1$. W ekonomii oznacza to, że produkcja każdego dobra nie pochłania więcej nakładów niż sama wytwarza (gospodarka jest netto-produktywna).'
  }
];

function renderQuiz() {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  let html = '';
  quizQuestions.forEach((q, qIdx) => {
    html += `
      <div class="saas-card p-5 space-y-3" id="card-${q.id}">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center font-mono">
            ${qIdx + 1}
          </span>
          <h4 class="text-sm font-bold text-slate-900">${q.question}</h4>
        </div>

        <div class="space-y-2 pt-1">
    `;

    q.options.forEach((opt, oIdx) => {
      html += `
        <button class="quiz-option" data-qid="${q.id}" data-oidx="${oIdx}" onclick="selectQuizOption('${q.id}', ${oIdx})">
          <span class="w-5 h-5 rounded-full border border-slate-300 shrink-0 flex items-center justify-center text-[10px] font-mono text-slate-500 font-bold">
            ${String.fromCharCode(65 + oIdx)}
          </span>
          <span>${opt.text}</span>
        </button>
      `;
    });

    html += `
        </div>
        <div id="expl-${q.id}" class="hidden p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed mt-2">
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.renderMathInElement) {
    renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
  }
}

function selectQuizOption(qid, oidx) {
  state.quizAnswers[qid] = oidx;

  // Zaktualizuj styl zaznaczenia
  const buttons = document.querySelectorAll(`button[data-qid="${qid}"]`);
  buttons.forEach(btn => {
    btn.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-900');
    if (parseInt(btn.dataset.oidx) === oidx) {
      btn.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-900');
    }
  });

  // Włącz przycisk sprawdzenia jeśli wszystkie pytania odpowiedziane
  const answeredCount = Object.keys(state.quizAnswers).length;
  const submitBtn = document.getElementById('btnSubmitQuiz');
  if (submitBtn) {
    submitBtn.innerText = `Sprawdź Odpowiedzi (${answeredCount}/${quizQuestions.length})`;
    submitBtn.disabled = answeredCount < quizQuestions.length;
  }
}

function checkQuiz() {
  let score = 0;
  quizQuestions.forEach(q => {
    const selectedIdx = state.quizAnswers[q.id];
    const card = document.getElementById(`card-${q.id}`);
    const explBox = document.getElementById(`expl-${q.id}`);
    const buttons = card.querySelectorAll('.quiz-option');

    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      const isCorrect = q.options[idx].correct;
      if (isCorrect) {
        btn.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        btn.classList.add('wrong');
      }
    });

    const userSelectedCorrect = (selectedIdx !== undefined && q.options[selectedIdx].correct);
    if (userSelectedCorrect) {
      score++;
    }

    if (explBox) {
      explBox.classList.remove('hidden');
      explBox.innerHTML = `
        <div class="font-bold mb-1 ${userSelectedCorrect ? 'text-emerald-700' : 'text-rose-700'}">
          ${userSelectedCorrect ? '✓ Poprawna odpowiedź!' : '✗ Błędna odpowiedź.'}
        </div>
        <div>${q.explanation}</div>
      `;
      if (window.renderMathInElement) {
        renderMathInElement(explBox, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]
        });
      }
    }
  });

  state.quizSubmitted = true;
  const resultAlert = document.getElementById('quizResultAlert');
  if (resultAlert) {
    resultAlert.classList.remove('hidden');
    const pct = Math.round((score / quizQuestions.length) * 100);
    resultAlert.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-bold text-slate-900">Twój wynik: ${score} / ${quizQuestions.length} (${pct}%)</div>
          <div class="text-xs text-slate-600 mt-0.5">
            ${score === 5 ? 'Doskonale! Perfekcyjne zrozumienie modelu Leontiefa.' : 'Przejrzyj wyjaśnienia powyżej, aby skorygować pojęcia.'}
          </div>
        </div>
        <button onclick="resetQuiz()" class="btn-secondary text-xs">Rozwiąż ponownie</button>
      </div>
    `;
  }
}

function resetQuiz() {
  state.quizAnswers = {};
  state.quizSubmitted = false;
  const resultAlert = document.getElementById('quizResultAlert');
  if (resultAlert) resultAlert.classList.add('hidden');
  renderQuiz();
  const submitBtn = document.getElementById('btnSubmitQuiz');
  if (submitBtn) {
    submitBtn.innerText = 'Sprawdź Odpowiedzi (0/5)';
    submitBtn.disabled = true;
  }
}

// =========================================================================
// KOPIOWANIE KODU PYTHON
// =========================================================================

function copyPythonCode() {
  const codeEl = document.getElementById('pythonCodeText');
  if (!codeEl) return;
  const code = codeEl.innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btnCopyPython');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span>✓ Skopiowano!</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });
}

// =========================================================================
// INICJALIZACJA
// =========================================================================

window.addEventListener('DOMContentLoaded', () => {
  // 1. Listenery suwaków popytu końcowego Y
  const sliderY0 = document.getElementById('sliderY0');
  const sliderY1 = document.getElementById('sliderY1');
  const sliderY2 = document.getElementById('sliderY2');

  if (sliderY0) {
    sliderY0.addEventListener('input', (e) => {
      state.Y[0] = parseFloat(e.target.value);
      updateUI();
    });
  }
  if (sliderY1) {
    sliderY1.addEventListener('input', (e) => {
      state.Y[1] = parseFloat(e.target.value);
      updateUI();
    });
  }
  if (sliderY2) {
    sliderY2.addEventListener('input', (e) => {
      state.Y[2] = parseFloat(e.target.value);
      updateUI();
    });
  }

  // 2. Przyciski scenariuszy
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyScenario(btn.dataset.scenario);
    });
  });

  // 3. Quiz
  renderQuiz();
  const submitBtn = document.getElementById('btnSubmitQuiz');
  if (submitBtn) {
    submitBtn.addEventListener('click', checkQuiz);
  }

  // 4. Kopiowanie Pythona
  const copyBtn = document.getElementById('btnCopyPython');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyPythonCode);
  }

  // 5. Startowy render (rozwiązanie modelu i przygotowanie tablic)
  updateUI();

  // 6. Inicjalizacja cząstek i pętli animacji grafu
  initParticles();
  loopAnimation();

  // 7. KaTeX Auto-Render na całej stronie
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  // 8. Podświetlenie aktywnego linku w spisie treści podczas scrollowania
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('section[id]').forEach(sec => observer.observe(sec));
});
