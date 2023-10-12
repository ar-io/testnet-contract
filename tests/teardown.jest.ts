import fs from 'fs';
import path from 'path';

import { arlocal } from './utils/services';

module.exports = async () => {
  removeDirectories();
  await arlocal.stop();
};

function removeDirectories() {
  ['./contract'].forEach((d) => {
    const dir = path.join(__dirname, d);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
