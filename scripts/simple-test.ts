console.log('=== Test 1: Import ===');
try {
  const config = require('../src/config/db/schema');
  console.log('Schema loaded, aiPromptGroup exists?', !!config.aiPromptGroup);
  console.log('aiPromptTemplateV2 exists?', !!config.aiPromptTemplateV2);
  console.log('aiUserPromptPreference exists?', !!config.aiUserPromptPreference);
} catch (e) {
  console.error('Failed to load schema:', e instanceof Error ? e.message : String(e));
}

console.log('\n=== Test 2: Check Drizzle Config ===');
try {
  const fs = require('fs');
  const configPath = './src/core/db/config.ts';
  console.log('Config file exists?', fs.existsSync(configPath));
} catch (e) {
  console.error('Error:', e instanceof Error ? e.message : String(e));
}

console.log('\n=== Test 3: Check Migration Files ===');
try {
  const fs = require('fs');
  const drizzleDir = './drizzle';
  if (fs.existsSync(drizzleDir)) {
    const files = fs.readdirSync(drizzleDir);
    console.log('Migration files:', files);
  } else {
    console.log('No drizzle directory found');
  }
} catch (e) {
  console.error('Error:', e instanceof Error ? e.message : String(e));
}

console.log('\n=== DONE ===');
