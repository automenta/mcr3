const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'tests');

const testFiles = [];

function findTestFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTestFiles(filePath);
    } else if (file.endsWith('.test.js')) {
      testFiles.push(filePath);
    }
  }
}

findTestFiles(testDir);

async function runTests() {
  for (const file of testFiles) {
    console.log(`Running test: ${file}`);
    const result = await new Promise((resolve, reject) => {
      const child = spawn('node', [require.resolve('jest/bin/jest'), file], { stdio: 'inherit' });
      child.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Test failed: ${file}`));
        }
      });
    });
    if (!result) {
      process.exit(1);
    }
  }
  console.log('All tests passed!');
  process.exit(0);
}

runTests();
