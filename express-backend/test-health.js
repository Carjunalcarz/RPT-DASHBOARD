const http = require('http');

function checkHealth(endpoint) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: endpoint,
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`\nResponse from ${endpoint}:`);
      console.log(`Status: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('Body:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Body:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`Error requesting ${endpoint}:`, error.message);
  });

  req.end();
}

console.log('Testing Health Endpoints...');
checkHealth('/health/mssql');
checkHealth('/health/supabase');
