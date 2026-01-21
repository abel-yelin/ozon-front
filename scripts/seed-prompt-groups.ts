import { aiPlaygroundDb } from '../src/lib/db/ai-playground';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PromptTemplate {
  [key: string]: string;
}

interface PromptGroup {
  id: string;
  name: string;
  prompt_templates: PromptTemplate;
}

interface Config {
  prompt_groups: PromptGroup[];
}

async function seedPromptGroups() {
  console.log('Seeding prompt groups from config.json...');

  const configPath = process.env.IMAGE_STUDIO_PROMPT_CONFIG
    || join(process.cwd(), 'dev', 'ozon-backen', 'app', 'resources', 'image_studio_config.json');
  if (!existsSync(configPath)) {
    throw new Error(`Prompt config not found at ${configPath}`);
  }
  const configContent = readFileSync(configPath, 'utf-8');
  const config: Config = JSON.parse(configContent);

  for (const group of config.prompt_groups) {
    console.log(`Creating group: ${group.name}`);

    // Convert templates object to array
    const templates = Object.entries(group.prompt_templates)
      .filter(([_, content]) => content && content.trim() !== '') // Skip empty templates
      .map(([key, content]) => ({
        key,
        content: content as string,
        language: key.endsWith('_cn') ? 'cn' : 'en',
        category: key.startsWith('opt_')
          ? 'option'
          : key.startsWith('main')
          ? 'main'
          : key.startsWith('secondary')
          ? 'secondary'
          : 'common',
      }));

    try {
      await aiPlaygroundDb.createPromptGroup({
        userId: undefined, // System default (no user)
        name: group.name,
        description: `Imported from config.json - ${group.id}`,
        templates,
        isSystemDefault: true,
      });
      console.log(`  ✓ Created "${group.name}" with ${templates.length} templates`);
    } catch (error) {
      console.error(`  ✗ Failed to create "${group.name}":`, error);
    }
  }

  console.log('\nSeeding complete!');
  console.log(`Processed ${config.prompt_groups.length} prompt groups.`);
}

seedPromptGroups().catch(console.error);
