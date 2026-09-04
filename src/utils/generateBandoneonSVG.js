/**
 * Genera un SVG dinámico del bandoneón basado en los datos JSON
 */

// Mapeo directo de (col, row) a coordenadas basándose en el SVG original
const POSITION_MAP_RIGHT = {
  '1,2': { cx: 18, cy: 181.43 },    // A3
  '2,1': { cx: 50.14, cy: 214.43 }, // A#3
  '2,3': { cx: 42, cy: 137.17 },    // B3
  '3,2': { cx: 70.95, cy: 171.13 }, // F4
  '3,4': { cx: 68.14, cy: 99.04 },  // C4
  '4,1': { cx: 100.4, cy: 199.73 }, // D#4
  '4,3': { cx: 95.9, cy: 131.03 },  // E4
  '4,5': { cx: 90.95, cy: 60.9 },   // C#4
  '5,2': { cx: 124.95, cy: 159.04 }, // A#4
  '5,4': { cx: 121.28, cy: 90.13 },  // D4
  '5,6': { cx: 118.4, cy: 20.49 },   // B6
  '6,1': { cx: 153.58, cy: 189.13 }, // F5
  '6,3': { cx: 154.56, cy: 121.44 }, // C#5
  '6,5': { cx: 148.93, cy: 53.89 },  // A6
  '7,2': { cx: 182.32, cy: 153.17 }, // G#4
  '7,4': { cx: 182.93, cy: 83.84 },  // G4
  '7,6': { cx: 182.93, cy: 19.64 },  // G#6
  '8,1': { cx: 208.07, cy: 184.63 }, // D#5
  '8,3': { cx: 212.95, cy: 116.27 }, // F#4
  '8,5': { cx: 214.91, cy: 51.29 },  // F#6
  '9,2': { cx: 237.8, cy: 149.37 },  // B4
  '9,4': { cx: 241.66, cy: 82.84 },  // A#5
  '9,6': { cx: 253.05, cy: 18 },     // G6
  '10,1': { cx: 263.69, cy: 182.63 }, // F#5
  '10,3': { cx: 271.05, cy: 116.13 }, // A4
  '10,5': { cx: 283.15, cy: 53.04 },  // E6
  '11,2': { cx: 294.55, cy: 151.23 }, // D5
  '11,4': { cx: 305.12, cy: 87.3 },   // C6
  '11,6': { cx: 319.15, cy: 18 },     // F6
  '12,1': { cx: 319.15, cy: 189.27 }, // A5
  '12,3': { cx: 327.89, cy: 124.44 }, // C5
  '12,5': { cx: 338.9, cy: 57.9 },    // D#6
  '13,2': { cx: 351.35, cy: 160.54 }, // G#5
  '13,4': { cx: 363.89, cy: 95.13 },  // D6
  '14,1': { cx: 374.14, cy: 198.43 }, // C#6
  '14,3': { cx: 383.89, cy: 132.36 }, // E5
  '15,2': { cx: 410.61, cy: 171.89 }, // B5
  '16,1': { cx: 432.61, cy: 216.43 }  // G5
};

// Mapeo de posiciones para mano izquierda basado en bandoneon_left_open.svg
const POSITION_MAP_LEFT = {
  '1,1': { cx: 18, cy: 172.28 },     // D2
  '2,2': { cx: 40, cy: 133.05 },     // E3
  '2,4': { cx: 48, cy: 56.84 },      // E2
  '3,1': { cx: 66, cy: 168.05 },     // B2
  '3,3': { cx: 66, cy: 93.94 },      // D3
  '4,2': { cx: 91.04, cy: 125.42 },  // G#3
  '4,4': { cx: 92.68, cy: 55.84 },   // A2
  '5,1': { cx: 116.53, cy: 156.42 }, // G4
  '5,3': { cx: 118.53, cy: 88.94 },  // A3
  '5,5': { cx: 118.51, cy: 21.47 },  // G#2
  '6,2': { cx: 144.35, cy: 119.68 }, // B3
  '6,4': { cx: 146.23, cy: 52.47 },  // G3
  '7,1': { cx: 171.06, cy: 151.05 }, // A4
  '7,3': { cx: 176.06, cy: 83.68 },  // C4
  '7,5': { cx: 176.06, cy: 18 },     // A#2
  '8,2': { cx: 199, cy: 117.68 },    // D4
  '8,4': { cx: 204.53, cy: 49.22 },  // D#3
  '9,1': { cx: 224.53, cy: 149.05 }, // D#4
  '9,3': { cx: 232.04, cy: 83.32 },  // E4
  '9,5': { cx: 238.14, cy: 19.14 },  // C#3
  '10,2': { cx: 255.14, cy: 117.68 }, // F#4
  '10,4': { cx: 264.14, cy: 52.47 },  // F4
  '11,1': { cx: 277, cy: 151.05 },    // F#3
  '11,3': { cx: 288, cy: 87.32 },     // C3
  '11,5': { cx: 305, cy: 25.68 },     // F3
  '12,2': { cx: 309.47, cy: 124.42 }, // C#4
  '12,4': { cx: 324.06, cy: 61.68 },  // A#3
  '13,1': { cx: 329.47, cy: 160.42 }, // D#2
  '13,3': { cx: 344.06, cy: 98.68 },  // G2
  '13,5': { cx: 357.43, cy: 36.47 },  // G#4
  '14,2': { cx: 362.06, cy: 136.68 }, // F#2
  '14,4': { cx: 380.06, cy: 72.84 },  // F2
  '15,1': { cx: 383.06, cy: 173.42 }  // C2
};

/**
 * Genera el SVG del bandoneón con las notas correctas según el estado
 * @param {Array} bandoneonData - Datos del bandoneón de la mano
 * @param {string} state - 'open' o 'close'
 * @param {boolean} isDarkMode - Si está en modo oscuro
 * @param {string} hand - 'right' o 'left'
 * @returns {string} SVG como string
 */
export function generateBandoneonSVG(bandoneonData, state = 'open', isDarkMode = false, hand = 'right') {

  const noteField = state === 'open' ? 'openNote' : 'closeNote';

  // Seleccionar el mapeo correcto según la mano
  const positionMap = hand === 'right' ? POSITION_MAP_RIGHT : POSITION_MAP_LEFT;

  // ViewBox según la mano
  const viewBox = hand === 'right' ? '0 0 450.61 234.43' : '0 0 401.06 191.42';

  // Generar círculos y textos usando el mapeo directo
  let circles = '';
  let texts = '';

  bandoneonData.forEach((button) => {
    const key = `${button.col},${button.row}`;
    const pos = positionMap[key];

    if (!pos) {
      console.warn(`❌ Posición no encontrada para col:${button.col}, row:${button.row} en mano ${hand}`);
      return;
    }

    const note = button[noteField];

    circles += `<circle class="bandoneon-circle" cx="${pos.cx}" cy="${pos.cy}" r="18" data-col="${button.col}" data-row="${button.row}"/>`;
    texts += `<text class="bandoneon-note" transform="translate(${pos.cx} ${pos.cy})" data-col="${button.col}" data-row="${button.row}">${note}</text>`;
  });


  // Colores según el modo
  const colors = isDarkMode ? {
    circleFill: '#334155',
    circleStroke: '#e2e8f0',
    circleHover: '#475569',
    textFill: '#e2e8f0'
  } : {
    circleFill: '#f8fafc',
    circleStroke: '#23272F',
    circleHover: '#e2e8f0',
    textFill: '#23272F'
  };

  return `<svg id="bandoneon-dynamic" data-name="stage" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <defs>
      <style>
        .bandoneon-note {
          isolation: isolate;
          font-size: 12px;
          font-family: Montserrat, sans-serif;
          font-weight: bold;
          text-anchor: middle;
          dominant-baseline: central;
          fill: ${colors.textFill};
        }
        .bandoneon-circle {
          fill: ${colors.circleFill};
          stroke: ${colors.circleStroke};
          stroke-width: 1.5;
          transition: all 0.2s ease;
        }
        .bandoneon-circle:hover {
          fill: ${colors.circleHover};
          stroke-width: 2;
        }
      </style>
    </defs>
    ${circles}
    ${texts}
  </svg>`;
}

/**
 * Mapea los datos del bandoneón a las posiciones del SVG
 * @param {Array} bandoneonData - Datos del bandoneón
 * @param {string} hand - 'right' o 'left'
 * @returns {Array} Array con datos mapeados a posiciones
 */
export function mapBandoneonDataToPositions(bandoneonData, hand = 'right') {
  // Seleccionar el mapeo correcto según la mano
  const positionMap = hand === 'right' ? POSITION_MAP_RIGHT : POSITION_MAP_LEFT;

  // Crear un mapeo más inteligente basándose en row y col
  return bandoneonData.map((button, index) => {
    const key = `${button.col},${button.row}`;
    const position = positionMap[key] || { cx: 50 + (index * 30), cy: 100 };

    return {
      ...button,
      position,
      index
    };
  });
}