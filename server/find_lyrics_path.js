import fs from 'fs';

function findPath() {
  const filePath = 'C:/Users/gabom/.gemini/antigravity/brain/cd569fb7-1023-48f6-bef9-8c014110f9d0/scratch/chordify_song_data.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Buscar de forma recursiva cualquier objeto que contenga la clave "lyrics"
  const paths = [];
  
  function search(obj, currentPath) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj.lyrics !== undefined) {
      paths.push({ path: currentPath, valueSample: typeof obj.lyrics === 'string' ? obj.lyrics : JSON.stringify(obj.lyrics).substring(0, 100) });
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => {
        search(item, `${currentPath}[${idx}]`);
      });
    } else {
      Object.keys(obj).forEach(key => {
        search(obj[key], `${currentPath}.${key}`);
      });
    }
  }
  
  search(data, 'root');
  
  console.log('Rutas encontradas con la clave "lyrics":');
  paths.slice(0, 15).forEach(p => {
    console.log(`Path: ${p.path}`);
    console.log(`Sample: ${p.valueSample}\n`);
  });
  
  // Vamos a ver la estructura alrededor de una de estas rutas
  // Por ejemplo, tomamos la primera ruta y subimos un nivel o inspeccionamos su objeto contenedor
  const firstPath = paths[0].path;
  console.log('Evaluando la primera ruta...');
  // Queremos evaluar el objeto que contiene las letras
  // Si subimos del tipo root.loaderData.XYZ.abc.lyrics al objeto padre
  // Vamos a buscar en el loaderData directamente
  const keys = Object.keys(data.loaderData);
  const loaderKey = keys[0];
  const chordsData = data.loaderData[loaderKey];
  
  console.log('\n--- CLAVES DE LOADER DATA ---');
  console.log(Object.keys(chordsData));
  
  // Si chordsData tiene otras claves
  if (chordsData.lyrics) {
    console.log('\nLyrics de primer nivel en loaderData:');
    console.log(JSON.stringify(chordsData.lyrics).substring(0, 500) + '...');
  }
  
  // Imprimir un fragmento del árbol de loaderData donde están las letras
  // Por ejemplo, si está en chordsData.chordifyData o similar
  // Busquemos en chordsData.chords.value.lyrics o en otros lugares
  if (chordsData.chords && chordsData.chords.value) {
     console.log('chordsData.chords.value keys:', Object.keys(chordsData.chords.value));
  }
}

findPath();
