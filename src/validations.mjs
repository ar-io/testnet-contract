'use strict';
export const validateAuctionBid = validate10;
const schema11 = {
  $id: '#/definitions/auctionBid',
  type: 'object',
  properties: {
    function: { type: 'string', pattern: '^(submitAuctionBid|buyRecord)$' },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    qty: { type: 'number', minimum: 0 },
    type: { type: 'string', pattern: '^(lease|permabuy)$' },
    contractTxId: { type: 'string', pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
  },
  required: ['name', 'contractTxId'],
  additionalProperties: true,
};
const pattern0 = new RegExp('^(submitAuctionBid|buyRecord)$', 'u');
const pattern1 = new RegExp(
  '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
  'u',
);
const pattern2 = new RegExp('^(lease|permabuy)$', 'u');
const pattern3 = new RegExp('^(atomic|[a-zA-Z0-9-_]{43})$', 'u');
function validate10(
  data,
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {},
) {
  /*# sourceURL="#/definitions/auctionBid" */ let vErrors = null;
  let errors = 0;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.contractTxId === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'contractTxId' },
        message: "must have required property '" + 'contractTxId' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.function !== undefined) {
      let data0 = data.function;
      if (typeof data0 === 'string') {
        if (!pattern0.test(data0)) {
          const err2 = {
            instancePath: instancePath + '/function',
            schemaPath: '#/properties/function/pattern',
            keyword: 'pattern',
            params: { pattern: '^(submitAuctionBid|buyRecord)$' },
            message:
              'must match pattern "' + '^(submitAuctionBid|buyRecord)$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err2];
          } else {
            vErrors.push(err2);
          }
          errors++;
        }
      } else {
        const err3 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.name !== undefined) {
      let data1 = data.name;
      if (typeof data1 === 'string') {
        if (!pattern1.test(data1)) {
          const err4 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/pattern',
            keyword: 'pattern',
            params: {
              pattern:
                '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
            },
            message:
              'must match pattern "' +
              '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$' +
              '"',
          };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.qty !== undefined) {
      let data2 = data.qty;
      if (typeof data2 == 'number' && isFinite(data2)) {
        if (data2 < 0 || isNaN(data2)) {
          const err6 = {
            instancePath: instancePath + '/qty',
            schemaPath: '#/properties/qty/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 0 },
            message: 'must be >= 0',
          };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = {
          instancePath: instancePath + '/qty',
          schemaPath: '#/properties/qty/type',
          keyword: 'type',
          params: { type: 'number' },
          message: 'must be number',
        };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.type !== undefined) {
      let data3 = data.type;
      if (typeof data3 === 'string') {
        if (!pattern2.test(data3)) {
          const err8 = {
            instancePath: instancePath + '/type',
            schemaPath: '#/properties/type/pattern',
            keyword: 'pattern',
            params: { pattern: '^(lease|permabuy)$' },
            message: 'must match pattern "' + '^(lease|permabuy)$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      } else {
        const err9 = {
          instancePath: instancePath + '/type',
          schemaPath: '#/properties/type/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.contractTxId !== undefined) {
      let data4 = data.contractTxId;
      if (typeof data4 === 'string') {
        if (!pattern3.test(data4)) {
          const err10 = {
            instancePath: instancePath + '/contractTxId',
            schemaPath: '#/properties/contractTxId/pattern',
            keyword: 'pattern',
            params: { pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
            message:
              'must match pattern "' + '^(atomic|[a-zA-Z0-9-_]{43})$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
      } else {
        const err11 = {
          instancePath: instancePath + '/contractTxId',
          schemaPath: '#/properties/contractTxId/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate10.errors = vErrors;
  return errors === 0;
}
export const validateBuyRecord = validate11;
const schema12 = {
  $id: '#/definitions/buyRecord',
  type: 'object',
  properties: {
    function: { type: 'string', const: 'buyRecord' },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    contractTxId: { type: 'string', pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
    years: { type: 'integer', minimum: 1 },
    type: { type: 'string', pattern: '^(lease|permabuy)$' },
    auction: { type: 'boolean' },
  },
  required: ['name', 'function'],
  additionalProperties: true,
};
function validate11(
  data,
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {},
) {
  /*# sourceURL="#/definitions/buyRecord" */ let vErrors = null;
  let errors = 0;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.function === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'function' },
        message: "must have required property '" + 'function' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.function !== undefined) {
      let data0 = data.function;
      if (typeof data0 !== 'string') {
        const err2 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
      if ('buyRecord' !== data0) {
        const err3 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/const',
          keyword: 'const',
          params: { allowedValue: 'buyRecord' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.name !== undefined) {
      let data1 = data.name;
      if (typeof data1 === 'string') {
        if (!pattern1.test(data1)) {
          const err4 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/pattern',
            keyword: 'pattern',
            params: {
              pattern:
                '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
            },
            message:
              'must match pattern "' +
              '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$' +
              '"',
          };
          if (vErrors === null) {
            vErrors = [err4];
          } else {
            vErrors.push(err4);
          }
          errors++;
        }
      } else {
        const err5 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.contractTxId !== undefined) {
      let data2 = data.contractTxId;
      if (typeof data2 === 'string') {
        if (!pattern3.test(data2)) {
          const err6 = {
            instancePath: instancePath + '/contractTxId',
            schemaPath: '#/properties/contractTxId/pattern',
            keyword: 'pattern',
            params: { pattern: '^(atomic|[a-zA-Z0-9-_]{43})$' },
            message:
              'must match pattern "' + '^(atomic|[a-zA-Z0-9-_]{43})$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err6];
          } else {
            vErrors.push(err6);
          }
          errors++;
        }
      } else {
        const err7 = {
          instancePath: instancePath + '/contractTxId',
          schemaPath: '#/properties/contractTxId/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.years !== undefined) {
      let data3 = data.years;
      if (
        !(
          typeof data3 == 'number' &&
          !(data3 % 1) &&
          !isNaN(data3) &&
          isFinite(data3)
        )
      ) {
        const err8 = {
          instancePath: instancePath + '/years',
          schemaPath: '#/properties/years/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (typeof data3 == 'number' && isFinite(data3)) {
        if (data3 < 1 || isNaN(data3)) {
          const err9 = {
            instancePath: instancePath + '/years',
            schemaPath: '#/properties/years/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 1 },
            message: 'must be >= 1',
          };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      }
    }
    if (data.type !== undefined) {
      let data4 = data.type;
      if (typeof data4 === 'string') {
        if (!pattern2.test(data4)) {
          const err10 = {
            instancePath: instancePath + '/type',
            schemaPath: '#/properties/type/pattern',
            keyword: 'pattern',
            params: { pattern: '^(lease|permabuy)$' },
            message: 'must match pattern "' + '^(lease|permabuy)$' + '"',
          };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
      } else {
        const err11 = {
          instancePath: instancePath + '/type',
          schemaPath: '#/properties/type/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.auction !== undefined) {
      if (typeof data.auction !== 'boolean') {
        const err12 = {
          instancePath: instancePath + '/auction',
          schemaPath: '#/properties/auction/type',
          keyword: 'type',
          params: { type: 'boolean' },
          message: 'must be boolean',
        };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate11.errors = vErrors;
  return errors === 0;
}
export const validateExtendRecord = validate12;
const schema13 = {
  $id: '#/definitions/extendRecord',
  type: 'object',
  properties: {
    function: { type: 'string', const: 'extendRecord' },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    years: { type: 'integer', minimum: 1, maximum: 5 },
  },
  required: ['name', 'years'],
  additionalProperties: false,
};
function validate12(
  data,
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {},
) {
  /*# sourceURL="#/definitions/extendRecord" */ let vErrors = null;
  let errors = 0;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.years === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'years' },
        message: "must have required property '" + 'years' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === 'function' || key0 === 'name' || key0 === 'years')) {
        const err2 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.function !== undefined) {
      let data0 = data.function;
      if (typeof data0 !== 'string') {
        const err3 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if ('extendRecord' !== data0) {
        const err4 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/const',
          keyword: 'const',
          params: { allowedValue: 'extendRecord' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.name !== undefined) {
      let data1 = data.name;
      if (typeof data1 === 'string') {
        if (!pattern1.test(data1)) {
          const err5 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/pattern',
            keyword: 'pattern',
            params: {
              pattern:
                '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
            },
            message:
              'must match pattern "' +
              '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$' +
              '"',
          };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      } else {
        const err6 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.years !== undefined) {
      let data2 = data.years;
      if (
        !(
          typeof data2 == 'number' &&
          !(data2 % 1) &&
          !isNaN(data2) &&
          isFinite(data2)
        )
      ) {
        const err7 = {
          instancePath: instancePath + '/years',
          schemaPath: '#/properties/years/type',
          keyword: 'type',
          params: { type: 'integer' },
          message: 'must be integer',
        };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (typeof data2 == 'number' && isFinite(data2)) {
        if (data2 > 5 || isNaN(data2)) {
          const err8 = {
            instancePath: instancePath + '/years',
            schemaPath: '#/properties/years/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 5 },
            message: 'must be <= 5',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data2 < 1 || isNaN(data2)) {
          const err9 = {
            instancePath: instancePath + '/years',
            schemaPath: '#/properties/years/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 1 },
            message: 'must be >= 1',
          };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      }
    }
  } else {
    const err10 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate12.errors = vErrors;
  return errors === 0;
}
export const validateIncreaseUndernameCount = validate13;
const schema14 = {
  $id: '#/definitions/increaseUndernameCount',
  type: 'object',
  properties: {
    function: { type: 'string', const: 'increaseUndernameCount' },
    name: {
      type: 'string',
      pattern: '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
    },
    qty: { type: 'number', minimum: 1, maximum: 9990 },
  },
  required: ['name', 'qty'],
  additionalProperties: false,
};
function validate13(
  data,
  { instancePath = '', parentData, parentDataProperty, rootData = data } = {},
) {
  /*# sourceURL="#/definitions/increaseUndernameCount" */ let vErrors = null;
  let errors = 0;
  if (data && typeof data == 'object' && !Array.isArray(data)) {
    if (data.name === undefined) {
      const err0 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'name' },
        message: "must have required property '" + 'name' + "'",
      };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.qty === undefined) {
      const err1 = {
        instancePath,
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'qty' },
        message: "must have required property '" + 'qty' + "'",
      };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === 'function' || key0 === 'name' || key0 === 'qty')) {
        const err2 = {
          instancePath,
          schemaPath: '#/additionalProperties',
          keyword: 'additionalProperties',
          params: { additionalProperty: key0 },
          message: 'must NOT have additional properties',
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.function !== undefined) {
      let data0 = data.function;
      if (typeof data0 !== 'string') {
        const err3 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if ('increaseUndernameCount' !== data0) {
        const err4 = {
          instancePath: instancePath + '/function',
          schemaPath: '#/properties/function/const',
          keyword: 'const',
          params: { allowedValue: 'increaseUndernameCount' },
          message: 'must be equal to constant',
        };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.name !== undefined) {
      let data1 = data.name;
      if (typeof data1 === 'string') {
        if (!pattern1.test(data1)) {
          const err5 = {
            instancePath: instancePath + '/name',
            schemaPath: '#/properties/name/pattern',
            keyword: 'pattern',
            params: {
              pattern:
                '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$',
            },
            message:
              'must match pattern "' +
              '^([a-zA-Z0-9][a-zA-Z0-9-]{0,49}[a-zA-Z0-9]|[a-zA-Z0-9]{1})$' +
              '"',
          };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      } else {
        const err6 = {
          instancePath: instancePath + '/name',
          schemaPath: '#/properties/name/type',
          keyword: 'type',
          params: { type: 'string' },
          message: 'must be string',
        };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.qty !== undefined) {
      let data2 = data.qty;
      if (typeof data2 == 'number' && isFinite(data2)) {
        if (data2 > 9990 || isNaN(data2)) {
          const err7 = {
            instancePath: instancePath + '/qty',
            schemaPath: '#/properties/qty/maximum',
            keyword: 'maximum',
            params: { comparison: '<=', limit: 9990 },
            message: 'must be <= 9990',
          };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data2 < 1 || isNaN(data2)) {
          const err8 = {
            instancePath: instancePath + '/qty',
            schemaPath: '#/properties/qty/minimum',
            keyword: 'minimum',
            params: { comparison: '>=', limit: 1 },
            message: 'must be >= 1',
          };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      } else {
        const err9 = {
          instancePath: instancePath + '/qty',
          schemaPath: '#/properties/qty/type',
          keyword: 'type',
          params: { type: 'number' },
          message: 'must be number',
        };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = {
      instancePath,
      schemaPath: '#/type',
      keyword: 'type',
      params: { type: 'object' },
      message: 'must be object',
    };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate13.errors = vErrors;
  return errors === 0;
}
