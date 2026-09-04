import fs from 'fs';

function normalizeChord(chord) {
  if (!chord || chord === 'N') return '𝄾';
  return chord
    .replace(/:min/g, 'm')
    .replace(/:maj$/, '')
    .replace(/:maj/g, 'maj')
    .replace(/:/g, '');
}

function reconstruct() {
  const filePath = 'C:/Users/gabom/.gemini/antigravity/brain/cd569fb7-1023-48f6-bef9-8c014110f9d0/scratch/chordify_song_data.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const keys = Object.keys(data.loaderData);
  const loaderKey = keys[0];
  const chordsData = data.loaderData[loaderKey];
  
  const leadSheet = chordsData.leadSheet;
  if (!leadSheet || !leadSheet.data || !leadSheet.data.value) {
    console.log('No leadSheet data available.');
    return;
  }
  
  const sections = leadSheet.data.value;
  let textOutput = '';
  
  sections.forEach(section => {
    // Secciones: intro, verse, chorus, etc.
    // Usamos el "start" del primer contenido para el secTime
    const title = section.title || 'Sección';
    const firstContent = section.content && section.content[0];
    const secTimeSec = firstContent ? (firstContent.start / 1000).toFixed(1) : '0.0';
    
    textOutput += `\n[${title} @ ${secTimeSec}]\n`;
    
    if (section.content) {
      section.content.forEach(c => {
        if (c.line && c.line.lyricLine) {
          const lyrics = c.line.lyricLine.lyrics || '';
          const chords = c.line.lyricLine.chords || [];
          
          let lineText = '';
          let lyricIndex = 0;
          
          chords.forEach(item => {
            if (item.chord) {
              lineText += `[${normalizeChord(item.chord)}]`;
            } else if (item.step !== undefined) {
              const stepVal = item.step;
              lineText += lyrics.substring(lyricIndex, lyricIndex + stepVal);
              lyricIndex += stepVal;
            }
          });
          
          if (lyricIndex < lyrics.length) {
            lineText += lyrics.substring(lyricIndex);
          }
          
          textOutput += lineText + '\n';
        }
      });
    }
  });
  
  console.log('--- RECONSTRUCCIÓN DE SONG SHEET ---');
  console.log(textOutput.substring(0, 1000) + '\n...');
}

reconstruct();
