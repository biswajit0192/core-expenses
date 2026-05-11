import fs from 'fs';

const data = JSON.parse(fs.readFileSync('src/assets/design/design.json', 'utf8'));

console.log("Root keys:", Object.keys(data));

function findKeys(obj, path = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (obj[key].$value !== undefined) {
        keys.push(`${path}${key}: ${obj[key].$value}`);
      } else {
        keys = keys.concat(findKeys(obj[key], `${path}${key}.`));
      }
    }
  }
  return keys;
}

const allTokens = findKeys(data);
console.log(`Found ${allTokens.length} tokens. Sample:`);
console.log(allTokens.slice(0, 5));
