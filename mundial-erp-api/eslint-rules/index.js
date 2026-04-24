'use strict';

/**
 * Plugin ESLint local para o Mundial ERP.
 * Registra as regras customizadas consumidas pelo `eslint.config.mjs`.
 *
 * Ver ADR-001, ADR-002, ADR-003.
 */

const noDirectPrimaryAssigneeCacheWrite = require('./no-direct-primary-assignee-cache-write');
const noDirectActivityWrite = require('./no-direct-activity-write');
const noDirectEventEmitterInHotPath = require('./no-direct-event-emitter-in-hot-path');

module.exports = {
  rules: {
    'no-direct-primary-assignee-cache-write': noDirectPrimaryAssigneeCacheWrite,
    'no-direct-activity-write': noDirectActivityWrite,
    'no-direct-event-emitter-in-hot-path': noDirectEventEmitterInHotPath,
  },
};
