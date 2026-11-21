import path from 'path';

import dotenv from 'dotenv';

// .env lives at the repo root, but npm workspace scripts run with
// cwd = apps/server, so resolve it relative to this file (src/ or dist/).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
