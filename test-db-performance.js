const { Client } = require('pg');

async function testDatabasePerformance() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
    statement_timeout: 10000,
  });

  const results = {
    connectionTime: 0,
    queryTimes: [],
    avgQueryTime: 0,
    minQueryTime: 0,
    maxQueryTime: 0,
  };

  try {
    // Test 1: Connection time
    const connectStart = process.hrtime.bigint();
    await client.connect();
    const connectEnd = process.hrtime.bigint();
    results.connectionTime = Number((connectEnd - connectStart) / 1000000n); // Convert to ms

    console.log(`✅ Connected in ${results.connectionTime.toFixed(2)}ms`);

    // Test 2: Simple queries (5 runs)
    for (let i = 0; i < 5; i++) {
      const queryStart = process.hrtime.bigint();
      const res = await client.query('SELECT NOW()');
      const queryEnd = process.hrtime.bigint();
      const queryTime = Number((queryEnd - queryStart) / 1000000n);
      results.queryTimes.push(queryTime);
    }

    results.avgQueryTime = results.queryTimes.reduce((a, b) => a + b, 0) / results.queryTimes.length;
    results.minQueryTime = Math.min(...results.queryTimes);
    results.maxQueryTime = Math.max(...results.queryTimes);

    console.log(`\n📊 Query Performance (5 runs):`);
    console.log(`   Min: ${results.minQueryTime.toFixed(2)}ms`);
    console.log(`   Max: ${results.maxQueryTime.toFixed(2)}ms`);
    console.log(`   Avg: ${results.avgQueryTime.toFixed(2)}ms`);

    // Test 3: Complex query (simulating real usage)
    const complexStart = process.hrtime.bigint();
    await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM production_tasks
      LIMIT 1
    `);
    const complexEnd = process.hrtime.bigint();
    const complexTime = Number((complexEnd - complexStart) / 1000000n);

    console.log(`\n🔍 Complex Query Time: ${complexTime.toFixed(2)}ms`);

    // Test 4: Connection pool efficiency
    const poolStart = process.hrtime.bigint();
    for (let i = 0; i < 10; i++) {
      await client.query('SELECT 1');
    }
    const poolEnd = process.hrtime.bigint();
    const poolTime = Number((poolEnd - poolStart) / 1000000n);

    console.log(`\n⚡ 10 Sequential Queries: ${poolTime.toFixed(2)}ms (avg: ${(poolTime / 10).toFixed(2)}ms per query)`);

    console.log(`\n✅ Database connection appears ${results.connectionTime < 100 ? 'FAST ✨' : results.connectionTime < 500 ? 'NORMAL 👍' : 'SLOW ⚠️'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testDatabasePerformance();
