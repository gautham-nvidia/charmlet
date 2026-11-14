import catalogue from './catalogue.json' with { type: 'json' };
import { createAccessService } from './access-service.mjs';
import { createLedger } from './ledger.mjs';

export default {
  fetch(request, env) { return createAccessService(env, catalogue)(request); },
  scheduled(_event, env, context) {
    if (env.DB) context.waitUntil(createLedger(env.DB).clean(Date.now()));
  },
};
