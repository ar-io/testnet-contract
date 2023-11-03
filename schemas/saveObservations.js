const saveObservationsSchema = {
  $id: '#/definitions/saveObservations',
  type: 'object',
  properties: {
    function: {
      type: 'string',
      const: 'saveObservations',
    },
    observerReportTxId: {
      type: 'string',
      pattern: '^[a-zA-Z0-9-_]{43}$',
    },
    failedGateways: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z0-9-_]{43}$',
      },
      uniqueItems: true,
      minItems: 0,
    },
  },
  required: ['failedGateways', 'observerReportTxId'],
  additionalProperties: false,
};

module.exports = {
  saveObservationsSchema,
};
