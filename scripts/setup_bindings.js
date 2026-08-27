const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'bin', 'addon.node');
const targetDir = path.join(__dirname, '..', 'node_modules', 'node-firebird-native-api', 'build', 'Release');
const targetFile = path.join(targetDir, 'addon.node');

if (fs.existsSync(srcPath)) {
    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        if (!fs.existsSync(targetFile)) {
            fs.copyFileSync(srcPath, targetFile);
            console.log('✅ Firebird native addon vinculado correctamente a node_modules.');
        }
    } catch (e) {
        // addon ya vinculado y en uso
    }
}
