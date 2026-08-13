const fs = require('fs');
const path = require('path');

// All colors to replace with primary
const allColors = [
  'blue','indigo','violet','purple','fuchsia','sky','cyan','teal','pink','rose',
  'orange','amber','yellow','lime','green','emerald','red'
];

const colorPattern = new RegExp(
  '\\b(bg|text|border|ring|shadow|from|to|via|fill|stroke|outline|decoration|caret|divide)-(' + allColors.join('|') + ')-(50|100|200|300|400|500|600|700|800|900)\\b',
  'g'
);

let totalFiles = 0;
let totalReplacements = 0;

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (!['node_modules', '.next', '.git', '.system_generated', 'scripts'].includes(f)) walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      let count = 0;
      const newContent = content.replace(colorPattern, (match, prefix, color, shade) => {
        count++;
        return prefix + '-primary-' + shade;
      });
      if (count > 0) {
        fs.writeFileSync(p, newContent, 'utf8');
        totalFiles++;
        totalReplacements += count;
        console.log('Updated [' + count + ' replacements]: ' + p);
      }
    }
  });
}

walk('d:/Projelerim/habernexus-doc/apps/web');
console.log('\nTotal files updated: ' + totalFiles);
console.log('Total replacements: ' + totalReplacements);
