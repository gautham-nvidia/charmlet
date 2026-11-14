import { setupAudience } from './audience.mjs';
import { showLoadError } from './site.js';
setupAudience().catch(showLoadError);
