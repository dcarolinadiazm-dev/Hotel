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
        fs.copyFileSync(srcPath, targetFile);
        console.log('✅ Firebird native addon vinculado correctamente a node_modules.');
    } catch (e) {
        console.warn('⚠️ No se pudo copiar addon.node:', e.message);
    }
}
