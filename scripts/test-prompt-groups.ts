import { aiPlaygroundDb } from '../src/lib/db/ai-playground';

async function testPromptGroups() {
  console.log('Testing prompt groups...\n');

  // Test 1: Get all groups
  console.log('1. Fetching all prompt groups...');
  const groups = await aiPlaygroundDb.getPromptGroups();
  console.log(`Found ${groups.length} groups`);
  console.log('Groups:', JSON.stringify(groups, null, 2));

  // Test 2: Try to get first group with templates
  if (groups.length > 0) {
    const firstGroup = groups[0];
    console.log(`\n2. Fetching details for group: ${firstGroup.id}`);
    const groupWithTemplates = await aiPlaygroundDb.getPromptGroupWithTemplates(firstGroup.id);
    console.log('Group with templates:', JSON.stringify(groupWithTemplates, null, 2));
  } else {
    console.log('\n2. No groups found, creating a test group...');
    const newGroup = await aiPlaygroundDb.createPromptGroup({
      name: 'Test Group',
      description: 'A test prompt group',
      templates: [
        {
          key: 'common_cn',
          content: '你是一个AI助手',
          language: 'cn',
          category: 'common',
        },
      ],
      isSystemDefault: true,
    });
    console.log('Created group:', newGroup);
  }
}

testPromptGroups()
  .then(() => {
    console.log('\nTest completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
