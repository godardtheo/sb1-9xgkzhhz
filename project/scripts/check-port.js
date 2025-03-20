const killPort = require('kill-port');
const net = require('net');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      }
      resolve(true);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

async function checkPort(port) {
  try {
    const available = await isPortAvailable(port);
    
    if (!available) {
      console.error(`\x1b[31mPort ${port} is already in use!\x1b[0m`);
      
      try {
        await killPort(port);
        console.log(`\x1b[32mSuccessfully freed port ${port}\x1b[0m`);
      } catch (killError) {
        console.error(`\x1b[31mFailed to free port ${port}. Please try again.\x1b[0m`);
        process.exit(1);
      }
    } else {
      console.log(`\x1b[32mPort ${port} is available\x1b[0m`);
    }
  } catch (error) {
    console.error(`\x1b[31mError checking port: ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

// Check Metro bundler port
checkPort(8081);