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
      description: 'The transaction ID of the submitted report',
    },
    failedGateways: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z0-9-_]{43}$',
        description:
          'The unique list of gateway addresses the observer has marked as failed',
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
