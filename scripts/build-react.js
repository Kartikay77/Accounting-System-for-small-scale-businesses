const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const reactDir = path.join(root, 'REACT');
const reactDist = path.join(reactDir, 'dist');
const destination = path.join(root, 'public', 'react-salary');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execFileSync(npmCommand, ['install'], { cwd: reactDir, stdio: 'inherit' });
execFileSync(npmCommand, ['run', 'build'], { cwd: reactDir, stdio: 'inherit' });

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(reactDist, destination, { recursive: true });
console.log(`React salary module copied to ${destination}`);
