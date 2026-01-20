async function test() {
  console.log('Starting database test...');
  try {
    const { db } = await import('../src/core/db');
    console.log('DB imported successfully');

    const database = db();
    console.log('DB instance created:', typeof database);

    // Try a simple query
    const result = await database.select().from(require('../src/config/db/schema').user).limit(1);
    console.log('Query result:', result.length, 'users');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
