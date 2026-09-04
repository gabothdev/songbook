import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('ug_debug.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- Parsing UG Search Results HTML ---');

// In the new layout, search results are links. Let's find their containers.
// A common structure is that a row or card contains the link for the song, artist link, type (Chords/Tabs/etc.), rating, and votes.
// Let's print out the siblings, parent children, etc. for a few matching links.

$('a').each(function() {
  const href = $(this).attr('href') || '';
  if (href.includes('/tab/carlos-gardel/mano-a-mano-chords-1656057')) {
    console.log('\nFound Target Link:', $(this).text(), href);
    console.log('Class:', $(this).attr('class'));
    
    // Print the parent's HTML structure
    const parent = $(this).parent();
    console.log('Parent Tag:', parent[0].name, 'Class:', parent.attr('class'));
    console.log('Parent HTML:\n', parent.html().slice(0, 800));

    // Print the grandparent's HTML structure
    const grandparent = parent.parent();
    console.log('Grandparent Tag:', grandparent[0].name, 'Class:', grandparent.attr('class'));
    console.log('Grandparent HTML:\n', grandparent.html().slice(0, 1500));
  }
});
