'use strict';
export const validateBuyRecord = validate10;
const schema11 = {
  $id: '#/definitions/buyRecord',
  type: 'object',
  properties: {
    function: { type: 'string', const: 'buyRecord' },
    name: { type: 'string', pattern: '^(?!-)[a-zA-Z0-9-]{1,32}$' },
    contractTxId: { type: 'string', pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
    years: { type: 'integer', minimum: 1, maximum: 3 },
    tierNumber: { type: 'integer', minimum: 1, maximum: 3 },
  },
  required: ['name'],
  additionalProperties: false,
};
const pattern0 = new RegExp('^(?!-)[a-zA-Z0-9-]{1,32}$', 'u');
const pattern1 = new RegExp('^(atomic|[a-zA-Z0-9-_]{43})$', 'u');
function validate10(
  data,
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {},
) {
  /*# sourceURL="#/definitions/buyRecord" */ let vErrors = null;
  let errors = 0;
  if (errors === 0) {
    if (data && typeof data == 'object' && !Array.isArray(data)) {
      let missing0;
      if (data.name === undefined && (missing0 = 'name')) {
        validate10.errors = [
          {
            instancePath,
            schemaPath: '#/required',
            keyword: 'required',
            params: { missingProperty: missing0 },
            message: "must have required property '" + missing0 + "'",
          },
        ];
        return false;
      } else {
        const _errs1 = errors;
        for (const key0 in data) {
          if (
            !(
              key0 === 'function' ||
              key0 === 'name' ||
              key0 === 'contractTxId' ||
              key0 === 'years' ||
              key0 === 'tierNumber'
            )
          ) {
            validate10.errors = [
              {
                instancePath,
                schemaPath: '#/additionalProperties',
                keyword: 'additionalProperties',
                params: { additionalProperty: key0 },
                message: 'must NOT have additional properties',
              },
            ];
            return false;
            break;
          }
        }
        if (_errs1 === errors) {
          if (data.function !== undefined) {
            let data0 = data.function;
            const _errs2 = errors;
            if (typeof data0 !== 'string') {
              validate10.errors = [
                {
                  instancePath: instancePath + '/function',
                  schemaPath: '#/properties/function/type',
                  keyword: 'type',
                  params: { type: 'string' },
                  message: 'must be string',
                },
              ];
              return false;
            }
            if ('buyRecord' !== data0) {
              validate10.errors = [
                {
                  instancePath: instancePath + '/function',
                  schemaPath: '#/properties/function/const',
                  keyword: 'const',
                  params: { allowedValue: 'buyRecord' },
                  message: 'must be equal to constant',
                },
              ];
              return false;
            }
            var valid0 = _errs2 === errors;
          } else {
            var valid0 = true;
          }
          if (valid0) {
            if (data.name !== undefined) {
              let data1 = data.name;
              const _errs4 = errors;
              if (errors === _errs4) {
                if (typeof data1 === 'string') {
                  if (!pattern0.test(data1)) {
                    validate10.errors = [
                      {
                        instancePath: instancePath + '/name',
                        schemaPath: '#/properties/name/pattern',
                        keyword: 'pattern',
                        params: { pattern: '^(?!-)[a-zA-Z0-9-]{1,32}$' },
                        message:
                          'must match pattern "' +
                          '^(?!-)[a-zA-Z0-9-]{1,32}$' +
                          '"',
                      },
                    ];
                    return false;
                  }
                } else {
                  validate10.errors = [
                    {
                      instancePath: instancePath + '/name',
                      schemaPath: '#/properties/name/type',
                      keyword: 'type',
                      params: { type: 'string' },
                      message: 'must be string',
                    },
                  ];
                  return false;
                }
              }
              var valid0 = _errs4 === errors;
            } else {
              var valid0 = true;
            }
            if (valid0) {
              if (data.contractTxId !== undefined) {
                let data2 = data.contractTxId;
                const _errs6 = errors;
                if (errors === _errs6) {
                  if (typeof data2 === 'string') {
                    if (!pattern1.test(data2)) {
                      validate10.errors = [
                        {
                          instancePath: instancePath + '/contractTxId',
                          schemaPath: '#/properties/contractTxId/pattern',
                          keyword: 'pattern',
                          params: { pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
                          message:
                            'must match pattern "' +
                            '^(atomic|[a-zA-Z0-9-_]{43})$' +
                            '"',
                        },
                      ];
                      return false;
                    }
                  } else {
                    validate10.errors = [
                      {
                        instancePath: instancePath + '/contractTxId',
                        schemaPath: '#/properties/contractTxId/type',
                        keyword: 'type',
                        params: { type: 'string' },
                        message: 'must be string',
                      },
                    ];
                    return false;
                  }
                }
                var valid0 = _errs6 === errors;
              } else {
                var valid0 = true;
              }
              if (valid0) {
                if (data.years !== undefined) {
                  let data3 = data.years;
                  const _errs8 = errors;
                  if (
                    !(
                      typeof data3 == 'number' &&
                      !(data3 % 1) &&
                      !isNaN(data3) &&
                      isFinite(data3)
                    )
                  ) {
                    validate10.errors = [
                      {
                        instancePath: instancePath + '/years',
                        schemaPath: '#/properties/years/type',
                        keyword: 'type',
                        params: { type: 'integer' },
                        message: 'must be integer',
                      },
                    ];
                    return false;
                  }
                  if (errors === _errs8) {
                    if (typeof data3 == 'number' && isFinite(data3)) {
                      if (data3 > 3 || isNaN(data3)) {
                        validate10.errors = [
                          {
                            instancePath: instancePath + '/years',
                            schemaPath: '#/properties/years/maximum',
                            keyword: 'maximum',
                            params: { comparison: '<=', limit: 3 },
                            message: 'must be <= 3',
                          },
                        ];
                        return false;
                      } else {
                        if (data3 < 1 || isNaN(data3)) {
                          validate10.errors = [
                            {
                              instancePath: instancePath + '/years',
                              schemaPath: '#/properties/years/minimum',
                              keyword: 'minimum',
                              params: { comparison: '>=', limit: 1 },
                              message: 'must be >= 1',
                            },
                          ];
                          return false;
                        }
                      }
                    }
                  }
                  var valid0 = _errs8 === errors;
                } else {
                  var valid0 = true;
                }
                if (valid0) {
                  if (data.tierNumber !== undefined) {
                    let data4 = data.tierNumber;
                    const _errs10 = errors;
                    if (
                      !(
                        typeof data4 == 'number' &&
                        !(data4 % 1) &&
                        !isNaN(data4) &&
                        isFinite(data4)
                      )
                    ) {
                      validate10.errors = [
                        {
                          instancePath: instancePath + '/tierNumber',
                          schemaPath: '#/properties/tierNumber/type',
                          keyword: 'type',
                          params: { type: 'integer' },
                          message: 'must be integer',
                        },
                      ];
                      return false;
                    }
                    if (errors === _errs10) {
                      if (typeof data4 == 'number' && isFinite(data4)) {
                        if (data4 > 3 || isNaN(data4)) {
                          validate10.errors = [
                            {
                              instancePath: instancePath + '/tierNumber',
                              schemaPath: '#/properties/tierNumber/maximum',
                              keyword: 'maximum',
                              params: { comparison: '<=', limit: 3 },
                              message: 'must be <= 3',
                            },
                          ];
                          return false;
                        } else {
                          if (data4 < 1 || isNaN(data4)) {
                            validate10.errors = [
                              {
                                instancePath: instancePath + '/tierNumber',
                                schemaPath: '#/properties/tierNumber/minimum',
                                keyword: 'minimum',
                                params: { comparison: '>=', limit: 1 },
                                message: 'must be >= 1',
                              },
                            ];
                            return false;
                          }
                        }
                      }
                    }
                    var valid0 = _errs10 === errors;
                  } else {
                    var valid0 = true;
                  }
                }
              }
            }
          }
        }
      }
    } else {
      validate10.errors = [
        {
          instancePath,
          schemaPath: '#/type',
          keyword: 'type',
          params: { type: 'object' },
          message: 'must be object',
        },
      ];
      return false;
    }
  }
  validate10.errors = vErrors;
  return errors === 0;
}
