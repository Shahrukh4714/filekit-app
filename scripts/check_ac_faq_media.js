const fs = require('fs');
const css = fs.readFileSync('css/styles.css', 'utf8');

const matches = [...css.matchAll(/@media[^{]+\{[\s\S]*?\.fk-ac-faq[\s\S]*?\}/gi)].map(m => m[0]);
console.log('Media queries containing fk-ac-faq:');
matches.forEach(m => console.log(m.substring(0, 300)));
