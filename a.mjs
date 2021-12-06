import fs from 'fs';
import path from 'path';

for (const item of fs.readdirSync('./packages')) {
    const testInSrcPath = path.join('./packages', item, 'src', 'test');
    const testPath = path.join('./packages', item, 'test');
    const tsconfigPath = path.join(testPath, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
        fs.rmSync(tsconfigPath)
    }
    if (fs.existsSync(testPath)) {
        fs.renameSync(testPath, testInSrcPath)
    }
}
