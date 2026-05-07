import fs from 'fs';
import path from 'path';

const srcDir = process.cwd();
const destDir = path.join(process.cwd(), 'dist');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Lấy danh sách các thư mục bắt đầu bằng "run_"
const folders = fs.readdirSync(srcDir).filter(f => 
  f.startsWith('run_') && fs.statSync(path.join(srcDir, f)).isDirectory()
);

folders.forEach(folder => {
  const destFolder = path.join(destDir, folder);
  console.log(`Copying ${folder} to dist/ ...`);
  fs.cpSync(path.join(srcDir, folder), destFolder, { recursive: true });
});

console.log('Finished copying run_* folders.');
