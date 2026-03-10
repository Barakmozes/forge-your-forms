// Helper script to run SQL migrations against Supabase
const fs = require('fs');
const https = require('https');

const projectId = 'rsuolemihuqjvrcpqjpa';
const token = 'sbp_7b5ccf7e6d9c0561bf61460e96353842b6dd3f7e';

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration.js <path-to-sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf-8');
const body = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${projectId}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`✓ Migration ${migrationFile} succeeded (${res.statusCode})`);
      if (data && data !== '[]') console.log(data);
    } else {
      console.error(`✗ Migration ${migrationFile} failed (${res.statusCode})`);
      console.error(data);
      process.exit(1);
    }
  });
});
req.write(body);
req.end();
