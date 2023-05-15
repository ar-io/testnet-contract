
  // src/actions/read/balance.ts
  var balance = async (state, { input: { target } }) => {
    const balances = state.balances;
    if (typeof target !== "string") {
      throw new ContractError("Must specify target to get balance for");
    }
    if (typeof balances[target] !== "number") {
      throw new ContractError("Cannot get balance, target does not exist");
    }
    return {
      result: {
        target,
        balance: balances[target]
      }
    };
  };

  // src/constants.ts
  var MAX_DELEGATES = 1e3;
  var MAX_YEARS = 3;
  var MAX_NAME_LENGTH = 32;
  var MAX_NOTE_LENGTH = 256;
  var MAX_GATEWAY_LABEL_LENGTH = 16;
  var MAX_PORT_NUMBER = 65535;
  var MAX_FOUNDATION_ACTION_PERIOD = 720 * 30;
  var SECONDS_IN_A_YEAR = 31536e3;
  var SECONDS_IN_GRACE_PERIOD = 1814400;
  var RESERVED_ATOMIC_TX_ID = "atomic";
  var FOUNDATION_ACTION_ACTIVE_STATUS = "active";
  var FOUNDATION_ACTION_FAILED_STATUS = "failed";
  var FOUNDATION_ACTION_PASSED_STATUS = "passed";
  var FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS = "evolved";
  var NETWORK_JOIN_STATUS = "joined";
  var NETWORK_LEAVING_STATUS = "leaving";
  var NETWORK_HIDDEN_STATUS = "hidden";
  var MAX_ALLOWED_EVOLUTION_DELAY = 720 * 30;
  var MINIMUM_ALLOWED_EVOLUTION_DELAY = 3;
  var MINIMUM_ALLOWED_NAME_LENGTH = 5;
  var ALLOWED_ACTIVE_TIERS = [1, 2, 3];
  var DEFAULT_ANNUAL_PERCENTAGE_FEE = 0.1;
  var DEFAULT_ARNS_NAME_RESERVED_MESSAGE = "Name is reserved.";
  var INVALID_INPUT_MESSAGE = "Invalid input for interaction";
  var DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE = `Names shorter than ${MINIMUM_ALLOWED_NAME_LENGTH} characters must be reserved in order to be purchased.`;
  var DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE = "This name already exists in an active lease";
  var DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE = "Name does not exist in the ArNS Contract!";
  var DEFAULT_INSUFFICIENT_FUNDS_MESSAGE = "Insufficient funds for this transaction.";
  var DEFAULT_INVALID_TARGET_MESSAGE = "Invalid target specified";
  var DEFAULT_INVALID_TIER_MESSAGE = "Invalid tier.";
  var DEFAULT_INVALID_ID_TIER_MESSAGE = "Invalid tier ID. Must be present in state before it can be used as a current tier.";
  var DEFAULT_INVALID_YEARS_MESSAGE = `Invalid number of years. Must be an integer and less than ${MAX_YEARS}`;
  var DEFAULT_CURRENT_TIERS = [
    "a27dbfe4-6992-4276-91fb-5b97ae8c3ffa",
    "93685bbb-8246-4e7e-bef8-d2e7e6c5d44a",
    "b6c8ee18-2481-4c1b-886c-dbe6b606486a"
  ];
  var DEFAULT_TIERS = {
    current: DEFAULT_CURRENT_TIERS,
    history: [
      {
        id: DEFAULT_CURRENT_TIERS[0],
        fee: 100,
        settings: {
          maxUndernames: 100
        }
      },
      {
        id: DEFAULT_CURRENT_TIERS[1],
        fee: 1e3,
        settings: {
          maxUndernames: 1e3
        }
      },
      {
        id: DEFAULT_CURRENT_TIERS[2],
        fee: 1e4,
        settings: {
          maxUndernames: 1e4
        }
      }
    ]
  };

  // src/actions/read/gateways.ts
  var getGateway = async (state, { input: { target } }) => {
    const gateways = state.gateways;
    if (!(target in gateways)) {
      throw new ContractError("This target does not have a registered gateway.");
    }
    const gatewayObj = gateways[target];
    return {
      result: gatewayObj
    };
  };
  var getGatewayTotalStake = async (state, { input: { target } }) => {
    const gateways = state.gateways;
    if (!(target in gateways)) {
      throw new ContractError("This target does not have a registered gateway.");
    }
    const gatewayTotalStake = gateways[target].operatorStake + gateways[target].delegatedStake;
    return {
      result: gatewayTotalStake
    };
  };
  var getGatewayRegistry = async (state) => {
    const gateways = state.gateways;
    return {
      result: gateways
    };
  };
  var getRankedGatewayRegistry = async (state) => {
    const gateways = state.gateways;
    const filteredGateways = {};
    Object.keys(gateways).forEach((address) => {
      if (gateways[address].status === NETWORK_JOIN_STATUS) {
        filteredGateways[address] = gateways[address];
      }
    });
    const rankedGateways = {};
    Object.keys(filteredGateways).sort((addressA, addressB) => {
      const gatewayA = filteredGateways[addressA];
      const gatewayB = filteredGateways[addressB];
      const totalStakeA = gatewayA.operatorStake + gatewayA.delegatedStake;
      const totalStakeB = gatewayB.operatorStake + gatewayB.delegatedStake;
      return totalStakeB - totalStakeA;
    }).forEach((address) => {
      rankedGateways[address] = filteredGateways[address];
    });
    return {
      result: rankedGateways
    };
  };

  // src/actions/read/record.ts
  var getRecord = async (state, { input: { name } }) => {
    const records = state.records;
    const allTiers = state.tiers.history;
    if (typeof name !== "string") {
      throw new ContractError("Must specify the ArNS Name");
    }
    if (!(name in records)) {
      throw new ContractError("This name does not exist");
    }
    const arnsName = records[name];
    const associatedTier = allTiers.find((t) => t.id === arnsName.tier);
    if (!associatedTier) {
      throw new ContractError("The name is associated with an invalid tier.");
    }
    return {
      result: {
        name,
        ...arnsName,
        tier: {
          ...associatedTier
        }
      }
    };
  };

  // src/actions/read/tiers.ts
  var getTier = async (state, { input: { tierNumber } }) => {
    const tiers = state.tiers;
    const currentTiers = tiers.current;
    const validTiers = tiers.history;
    if (!Number.isInteger(tierNumber) || !Object.keys(currentTiers).map((k) => +k).includes(tierNumber)) {
      throw new ContractError(
        `Invalid tier selected. Available options ${Object.keys(currentTiers)}`
      );
    }
    const selectedTier = validTiers.find(
      (t) => t.id === currentTiers[tierNumber]
    );
    if (!selectedTier) {
      throw new ContractError("Tier was not published to state. Try again.");
    }
    return {
      result: {
        ...selectedTier
      }
    };
  };
  var getActiveTiers = async (state) => {
    const tiers = state.tiers;
    const current = tiers.current;
    const allTiers = tiers.history;
    const activeTiers = Object.entries(current).map(([tier, id]) => {
      const tierObj = allTiers.find((t) => t.id === id);
      return {
        tier,
        ...tierObj
      };
    });
    return {
      result: activeTiers
    };
  };

  // src/utilities.ts
  function calculateTotalRegistrationFee(name, fees, tier, years) {
    const initialNamePurchaseFee = fees[name.length.toString()];
    return initialNamePurchaseFee + calculateAnnualRenewalFee(name, fees, tier, years);
  }
  function calculateAnnualRenewalFee(name, fees, tier, years) {
    const initialNamePurchaseFee = fees[name.length.toString()];
    const nameAnnualRegistrationFee = initialNamePurchaseFee * DEFAULT_ANNUAL_PERCENTAGE_FEE;
    const tierAnnualFee = tier.fee;
    return (nameAnnualRegistrationFee + tierAnnualFee) * years;
  }
  function isValidFQDN(fqdn) {
    const fqdnRegex = /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{1,6}$/;
    return fqdnRegex.test(fqdn);
  }
  function isValidArweaveBase64URL(base64URL) {
    const base64URLRegex = new RegExp("^[a-zA-Z0-9_-]{43}$");
    return base64URLRegex.test(base64URL);
  }

  // src/validations.mjs
  var validateBuyRecord = validate10;
  var pattern0 = new RegExp("^(?!-)[a-zA-Z0-9-]{1,32}$", "u");
  var pattern1 = new RegExp("^(atomic|[a-zA-Z0-9-_]{43})$", "u");
  function validate10(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
    ;
    let vErrors = null;
    let errors = 0;
    if (errors === 0) {
      if (data && typeof data == "object" && !Array.isArray(data)) {
        let missing0;
        if (data.name === void 0 && (missing0 = "name")) {
          validate10.errors = [{ instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: missing0 }, message: "must have required property '" + missing0 + "'" }];
          return false;
        } else {
          const _errs1 = errors;
          for (const key0 in data) {
            if (!(key0 === "function" || key0 === "name" || key0 === "contractTxId" || key0 === "years" || key0 === "tierNumber")) {
              validate10.errors = [{ instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" }];
              return false;
              break;
            }
          }
          if (_errs1 === errors) {
            if (data.function !== void 0) {
              let data0 = data.function;
              const _errs2 = errors;
              if (typeof data0 !== "string") {
                validate10.errors = [{ instancePath: instancePath + "/function", schemaPath: "#/properties/function/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                return false;
              }
              if ("buyRecord" !== data0) {
                validate10.errors = [{ instancePath: instancePath + "/function", schemaPath: "#/properties/function/const", keyword: "const", params: { allowedValue: "buyRecord" }, message: "must be equal to constant" }];
                return false;
              }
              var valid0 = _errs2 === errors;
            } else {
              var valid0 = true;
            }
            if (valid0) {
              if (data.name !== void 0) {
                let data1 = data.name;
                const _errs4 = errors;
                if (errors === _errs4) {
                  if (typeof data1 === "string") {
                    if (!pattern0.test(data1)) {
                      validate10.errors = [{ instancePath: instancePath + "/name", schemaPath: "#/properties/name/pattern", keyword: "pattern", params: { pattern: "^(?!-)[a-zA-Z0-9-]{1,32}$" }, message: 'must match pattern "^(?!-)[a-zA-Z0-9-]{1,32}$"' }];
                      return false;
                    }
                  } else {
                    validate10.errors = [{ instancePath: instancePath + "/name", schemaPath: "#/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                    return false;
                  }
                }
                var valid0 = _errs4 === errors;
              } else {
                var valid0 = true;
              }
              if (valid0) {
                if (data.contractTxId !== void 0) {
                  let data2 = data.contractTxId;
                  const _errs6 = errors;
                  if (errors === _errs6) {
                    if (typeof data2 === "string") {
                      if (!pattern1.test(data2)) {
                        validate10.errors = [{ instancePath: instancePath + "/contractTxId", schemaPath: "#/properties/contractTxId/pattern", keyword: "pattern", params: { pattern: "^(atomic|[a-zA-Z0-9-_]{43})$" }, message: 'must match pattern "^(atomic|[a-zA-Z0-9-_]{43})$"' }];
                        return false;
                      }
                    } else {
                      validate10.errors = [{ instancePath: instancePath + "/contractTxId", schemaPath: "#/properties/contractTxId/type", keyword: "type", params: { type: "string" }, message: "must be string" }];
                      return false;
                    }
                  }
                  var valid0 = _errs6 === errors;
                } else {
                  var valid0 = true;
                }
                if (valid0) {
                  if (data.years !== void 0) {
                    let data3 = data.years;
                    const _errs8 = errors;
                    if (!(typeof data3 == "number" && (!(data3 % 1) && !isNaN(data3)) && isFinite(data3))) {
                      validate10.errors = [{ instancePath: instancePath + "/years", schemaPath: "#/properties/years/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                      return false;
                    }
                    if (errors === _errs8) {
                      if (typeof data3 == "number" && isFinite(data3)) {
                        if (data3 > 3 || isNaN(data3)) {
                          validate10.errors = [{ instancePath: instancePath + "/years", schemaPath: "#/properties/years/maximum", keyword: "maximum", params: { comparison: "<=", limit: 3 }, message: "must be <= 3" }];
                          return false;
                        } else {
                          if (data3 < 1 || isNaN(data3)) {
                            validate10.errors = [{ instancePath: instancePath + "/years", schemaPath: "#/properties/years/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" }];
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
                    if (data.tierNumber !== void 0) {
                      let data4 = data.tierNumber;
                      const _errs10 = errors;
                      if (!(typeof data4 == "number" && (!(data4 % 1) && !isNaN(data4)) && isFinite(data4))) {
                        validate10.errors = [{ instancePath: instancePath + "/tierNumber", schemaPath: "#/properties/tierNumber/type", keyword: "type", params: { type: "integer" }, message: "must be integer" }];
                        return false;
                      }
                      if (errors === _errs10) {
                        if (typeof data4 == "number" && isFinite(data4)) {
                          if (data4 > 3 || isNaN(data4)) {
                            validate10.errors = [{ instancePath: instancePath + "/tierNumber", schemaPath: "#/properties/tierNumber/maximum", keyword: "maximum", params: { comparison: "<=", limit: 3 }, message: "must be <= 3" }];
                            return false;
                          } else {
                            if (data4 < 1 || isNaN(data4)) {
                              validate10.errors = [{ instancePath: instancePath + "/tierNumber", schemaPath: "#/properties/tierNumber/minimum", keyword: "minimum", params: { comparison: ">=", limit: 1 }, message: "must be >= 1" }];
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
        validate10.errors = [{ instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" }];
        return false;
      }
    }
    validate10.errors = vErrors;
    return errors === 0;
  }

  // src/actions/write/buyRecord.ts
  var BuyRecord = class {
    function = "buyRecord";
    name;
    contractTxId;
    years;
    tierNumber;
    constructor(input) {
      if (!validateBuyRecord(input)) {
        throw new ContractError(INVALID_INPUT_MESSAGE);
      }
      const { name, contractTxId = RESERVED_ATOMIC_TX_ID, years = 1, tierNumber = 1 } = input;
      this.name = name;
      this.contractTxId = contractTxId;
      this.years = years;
      this.tierNumber = tierNumber;
    }
  };
  var buyRecord = (state, { caller, input }) => {
    const buyRecordInput = new BuyRecord(input);
    const {
      name,
      contractTxId,
      years,
      tierNumber
    } = buyRecordInput;
    const { balances, records, reserved, fees, tiers = DEFAULT_TIERS } = state;
    const { current: currentTiers, history: allTiers } = tiers;
    const currentBlockTime = +SmartWeave.block.timestamp;
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (years > MAX_YEARS || years <= 0) {
      throw new ContractError(
        'Invalid value for "years". Must be an integer greater than zero and less than the max years'
      );
    }
    const activeTierNumbers = currentTiers.map((_, indx) => indx + 1);
    if (!activeTierNumbers.includes(tierNumber)) {
      throw new ContractError(
        `Invalid value for "tier". Must be one of: ${activeTierNumbers.join(
          ","
        )}`
      );
    }
    const selectedTierID = currentTiers[tierNumber - 1];
    const purchasedTier = allTiers.find((t) => t.id === selectedTierID) ?? DEFAULT_TIERS[0];
    if (!purchasedTier) {
      throw new ContractError("The tier purchased is not in the states history.");
    }
    const endTimestamp = currentBlockTime + SECONDS_IN_A_YEAR * years;
    const formattedName = name.toLowerCase();
    if (!reserved[formattedName] && formattedName.length < MINIMUM_ALLOWED_NAME_LENGTH) {
      throw new ContractError(DEFAULT_ARNS_NAME_LENGTH_DISALLOWED_MESSAGE);
    }
    if (reserved[formattedName]) {
      const { target, endTimestamp: reservedEndTimestamp } = reserved[formattedName];
      const handleReservedName = () => {
        const reservedByCaller = target === caller;
        const reservedExpired = reservedEndTimestamp && reservedEndTimestamp <= +SmartWeave.block.timestamp;
        if (reservedByCaller || reservedExpired) {
          delete reserved[formattedName];
          return;
        }
        throw new ContractError(DEFAULT_ARNS_NAME_RESERVED_MESSAGE);
      };
      handleReservedName();
    }
    const totalFee = calculateTotalRegistrationFee(
      formattedName,
      fees,
      purchasedTier,
      years
    );
    if (balances[caller] < totalFee) {
      throw new ContractError(
        `Caller balance not high enough to purchase this name for ${totalFee} token(s)!`
      );
    }
    const selectedContractTxId = contractTxId === RESERVED_ATOMIC_TX_ID ? SmartWeave.transaction.id : contractTxId;
    if (records[formattedName] && records[formattedName].endTimestamp + SECONDS_IN_GRACE_PERIOD > +SmartWeave.block.timestamp) {
      throw new ContractError(DEFAULT_NON_EXPIRED_ARNS_NAME_MESSAGE);
    }
    balances[caller] -= totalFee;
    records[formattedName] = {
      contractTxId: selectedContractTxId,
      endTimestamp,
      tier: selectedTierID
    };
    state.records = records;
    state.reserved = reserved;
    state.balances = balances;
    return { state };
  };

  // src/actions/write/evolve.ts
  var evolve = async (state, { input }) => {
    const foundationActions = state.foundation?.actions ?? [];
    const actionId = input.value;
    const action = foundationActions.find(
      (action2) => action2.id === actionId
    );
    const actionIndex = foundationActions.indexOf(action);
    if (action && action.type === "delayedEvolve" && action.status === FOUNDATION_ACTION_PASSED_STATUS && action.value.evolveHeight <= +SmartWeave.block.height) {
      state.foundation.actions[actionIndex].status = FOUNDATION_DELAYED_EVOLVE_COMPLETED_STATUS;
      state.evolve = foundationActions[actionIndex].value.contractSrcTxId;
    } else {
      throw new ContractError("Invalid contract evolution operation.");
    }
    return { state };
  };

  // src/actions/write/extendRecord.ts
  var extendRecord = async (state, { caller, input }) => {
    const balances = state.balances;
    const records = state.records;
    const currentBlockTime = +SmartWeave.block.timestamp;
    const allTiers = state.tiers.history;
    const fees = state.fees;
    const { name, years } = input;
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (!records[name]) {
      throw new ContractError(DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
    }
    if (!Number.isInteger(years) || years > MAX_YEARS) {
      throw new ContractError(DEFAULT_INVALID_YEARS_MESSAGE);
    }
    if (records[name].endTimestamp > currentBlockTime) {
      throw new ContractError(
        `This name cannot be extended until the grace period begins.`
      );
    }
    if (records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <= currentBlockTime) {
      throw new ContractError(
        `This name has expired and must repurchased before it can be extended.`
      );
    }
    const purchasedTier = allTiers.find((t) => t.id === records[name].tier) ?? DEFAULT_TIERS.history[0];
    const totalExtensionAnnualFee = calculateAnnualRenewalFee(
      name,
      fees,
      purchasedTier,
      years
    );
    if (balances[caller] < totalExtensionAnnualFee) {
      throw new ContractError(
        `Caller balance not high enough to extend this name lease for ${totalExtensionAnnualFee} token(s) for ${years}!`
      );
    }
    balances[caller] -= totalExtensionAnnualFee;
    records[name].endTimestamp += SECONDS_IN_A_YEAR * years;
    return { state };
  };

  // src/actions/write/finalizeLeave.ts
  var finalizeLeave = async (state, { caller, input: { target = caller } }) => {
    const gateways = state.gateways;
    const balances = state.balances;
    if (!(target in gateways)) {
      throw new ContractError("This target is not a registered gateway.");
    }
    if (gateways[target].status !== NETWORK_LEAVING_STATUS || gateways[target].end > +SmartWeave.block.height) {
      throw new ContractError("This Gateway can not leave the network yet");
    }
    balances[target] = gateways[target].vaults.reduce(
      (totalVaulted, vault) => totalVaulted + vault.balance,
      balances[target]
    );
    for (const delegate of Object.keys(gateways[target].delegates)) {
      const totalQtyDelegated = gateways[target].delegates[delegate].reduce(
        (totalQtyDelegated2, d) => totalQtyDelegated2 += d.balance,
        0
      );
      balances[delegate] = balances[delegate] ?? 0 + totalQtyDelegated;
    }
    delete gateways[target];
    state.balances = balances;
    state.gateways = gateways;
    return { state };
  };

  // src/actions/write/finalizeOperatorStakeDecrease.ts
  var finalizeOperatorStakeDecrease = async (state, { caller, input: { target = caller } }) => {
    const gateways = state.gateways;
    const balances = state.balances;
    if (!(target in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    const vaults = gateways[caller].vaults;
    const remainingVaults = [];
    for (const vault of vaults) {
      if (vault.end !== 0 && vault.end <= +SmartWeave.block.height) {
        balances[target] = (balances[target] ?? 0) + vault.balance;
        gateways[target].operatorStake -= vault.balance;
        continue;
      }
      remainingVaults.push(vault);
    }
    gateways[caller].vaults = remainingVaults;
    state.balances = balances;
    state.gateways = gateways;
    return { state };
  };

  // src/actions/write/foundationAction.ts
  var foundationAction = async (state, { caller, input: { type, note, value, id } }) => {
    const foundation = state.foundation;
    const actionId = id ?? SmartWeave.transaction.id;
    const action = foundation.actions.find(
      (action2) => action2.id === actionId
    );
    let actionIndex = foundation.actions.indexOf(action);
    if (!foundation.addresses.includes(caller)) {
      throw new ContractError(
        `${caller} Caller needs to be in the foundation wallet list.`
      );
    }
    if (type && note && value && !id) {
      if (typeof note !== "string" || note.length > MAX_NOTE_LENGTH) {
        throw new ContractError("Note format not recognized.");
      }
      switch (type) {
        case "addAddress":
          if (typeof value === "string") {
            if (!isValidArweaveBase64URL(value)) {
              throw new ContractError(
                'The target of this action is an invalid Arweave address?"'
              );
            }
            if (foundation.addresses.includes(value)) {
              throw new ContractError(
                "Target is already added as a Foundation address"
              );
            }
          }
          break;
        case "removeAddress":
          if (typeof value === "string") {
            if (!foundation.addresses.includes(value)) {
              throw new ContractError(
                "Target is not in the list of Foundation addresses"
              );
            }
          }
          break;
        case "setMinSignatures":
          if (typeof value === "number") {
            if (!Number.isInteger(value) || value <= 0 || value > foundation.addresses.length) {
              throw new ContractError(
                "Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation."
              );
            }
          }
          break;
        case "setActionPeriod":
          if (typeof value === "number") {
            if (!Number.isInteger(value) || value <= 0 || value > MAX_FOUNDATION_ACTION_PERIOD) {
              throw new ContractError(
                "Invalid value for transfer period. Must be a positive integer"
              );
            }
          }
          break;
        case "setNameFees":
          if (Object.keys(value).length === MAX_NAME_LENGTH) {
            for (let i = 1; i <= MAX_NAME_LENGTH; i++) {
              if (!Number.isInteger(value[i.toString()]) || value[i.toString()] <= 0) {
                throw new ContractError(
                  `Invalid value for fee ${i}. Must be an integer greater than 0`
                );
              }
            }
          } else {
            throw new ContractError(
              `Invalid amount of fees.  Must be less than ${MAX_NAME_LENGTH}`
            );
          }
          break;
        case "createNewTier":
          if (!Number.isInteger(value.fee)) {
            throw new ContractError("Fee must be a valid number.");
          }
          if (!Number.isInteger(value.settings.maxUndernames)) {
            throw new ContractError("Max undernames must be a valid number.");
          }
          value.id = SmartWeave.transaction.id;
          break;
        case "setActiveTier":
          if (!Number.isInteger(value.tierNumber) || !ALLOWED_ACTIVE_TIERS.includes(value.tierNumber)) {
            throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
          }
          if (!state.tiers.history.find(
            (tier) => tier.id === value.tierId
          )) {
            throw new ContractError(DEFAULT_INVALID_ID_TIER_MESSAGE);
          }
          break;
        case "delayedEvolve":
          if (typeof value.contractSrcTxId !== "string" || !isValidArweaveBase64URL(
            value.contractSrcTxId
          ) || // must be a valid arweave transaction ID
          value.contractSrcTxId === state.evolve) {
            throw new ContractError("Invalid contract evolution source code.");
          }
          if (value.evolveHeight) {
            if (!Number.isInteger(value.evolveHeight) || value.evolveHeight - +SmartWeave.block.height >= MAX_ALLOWED_EVOLUTION_DELAY || value.evolveHeight - +SmartWeave.block.height < MINIMUM_ALLOWED_EVOLUTION_DELAY) {
              throw new ContractError(
                `Invalid contract evolution block height of ${value.evolveHeight}. Current height of ${+SmartWeave.block.height}`
              );
            } else {
              value.evolveHeight = +SmartWeave.block.height + MINIMUM_ALLOWED_EVOLUTION_DELAY;
            }
          }
          break;
        default:
          throw new ContractError("Invalid action parameters.");
      }
      const foundationAction2 = {
        id: actionId,
        status: FOUNDATION_ACTION_ACTIVE_STATUS,
        type,
        note,
        signed: [caller],
        startHeight: +SmartWeave.block.height,
        value
      };
      actionIndex = state.foundation.actions.push(foundationAction2) - 1;
    } else if (id) {
      if (!action) {
        throw new ContractError("This action does not exist.");
      }
      if (action.status !== FOUNDATION_ACTION_ACTIVE_STATUS) {
        throw new ContractError("This action is not active.");
      }
      if (+SmartWeave.block.height >= action.startHeight + foundation.actionPeriod && action.status === FOUNDATION_ACTION_ACTIVE_STATUS && action.signed.length < foundation.minSignatures) {
        state.foundation.actions[actionIndex].status = FOUNDATION_ACTION_FAILED_STATUS;
        return { state };
      }
      if (!action.signed.includes(caller)) {
        state.foundation.actions[actionIndex].signed.push(caller);
      }
    } else {
      throw new ContractError(
        "Invalid parameters to initiate a new foundation action or sign an existing one."
      );
    }
    if (state.foundation.actions[actionIndex].signed.length >= foundation.minSignatures) {
      const value2 = state.foundation.actions[actionIndex].value;
      const type2 = state.foundation.actions[actionIndex].type;
      switch (type2) {
        case "addAddress":
          if (foundation.addresses.includes(value2.toString())) {
            throw new ContractError(
              "Target is already added as a Foundation address"
            );
          }
          state.foundation.addresses.push(value2.toString());
          break;
        case "removeAddress":
          if (!foundation.addresses.includes(value2.toString())) {
            throw new ContractError(
              "Target is not in the list of Foundation addresses"
            );
          }
          state.foundation.addresses.splice(
            foundation.addresses.indexOf(value2.toString()),
            1
          );
          break;
        case "setMinSignatures":
          state.foundation.minSignatures = +value2;
          break;
        case "setActionPeriod":
          state.foundation.actionPeriod = +value2;
          break;
        case "setNameFees":
          state.fees = value2;
          break;
        case "createNewTier":
          state.tiers.history.push(value2);
          break;
        case "setActiveTier":
          state.tiers.current[value2.tierNumber] = value2.tierId;
          break;
        case "delayedEvolve":
          break;
        default:
          throw new ContractError("Invalid action type.");
      }
      state.foundation.actions[actionIndex].status = FOUNDATION_ACTION_PASSED_STATUS;
    }
    return { state };
  };

  // src/actions/write/increaseOperatorStake.ts
  var increaseOperatorStake = async (state, { caller, input }) => {
    const balances = state.balances;
    const gateways = state.gateways;
    const settings = state.settings.registry;
    const { qty } = input;
    if (!(caller in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
      throw new ContractError(
        "This Gateway is in the process of leaving the network and cannot have its stake adjusted"
      );
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError("Quantity must be a positive integer.");
    }
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to stake ${qty} token(s)!`
      );
    }
    if (qty < settings.minDelegatedStakeAmount) {
      throw new ContractError(
        `Quantity must be greater than or equal to the minimum delegated stake amount ${settings.minDelegatedStakeAmount}.`
      );
    }
    state.balances[caller] -= qty;
    state.gateways[caller].operatorStake += qty;
    state.gateways[caller].vaults.push({
      balance: qty,
      start: +SmartWeave.block.height,
      end: 0
    });
    return { state };
  };

  // src/actions/write/initiateLeave.ts
  var initiateLeave = async (state, { caller }) => {
    const settings = state.settings.registry;
    const gateways = state.gateways;
    if (!(caller in gateways)) {
      throw new ContractError("This target is not a registered gateway.");
    }
    if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
      throw new ContractError(
        "This Gateway is in the process of leaving the network"
      );
    }
    if (gateways[caller].start + settings.minGatewayJoinLength > +SmartWeave.block.height) {
      throw new ContractError("This Gateway has not been joined long enough");
    }
    const gatewayLeaveHeight = +SmartWeave.block.height + settings.gatewayLeaveLength;
    const vaults = gateways[caller].vaults;
    for (const vault of vaults) {
      if (vault.end === 0 || vault.end > gatewayLeaveHeight) {
        vault.end = gatewayLeaveHeight;
      }
    }
    gateways[caller].vaults = vaults;
    gateways[caller].end = gatewayLeaveHeight;
    gateways[caller].status = NETWORK_LEAVING_STATUS;
    state.gateways = gateways;
    return { state };
  };

  // src/actions/write/initiateOperatorStakeDecrease.ts
  var initiateOperatorStakeDecrease = async (state, { caller, input }) => {
    const settings = state.settings.registry;
    const gateways = state.gateways;
    const { id } = input;
    if (!(caller in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    if (gateways[caller].status === NETWORK_LEAVING_STATUS) {
      throw new ContractError(
        "This Gateway is in the process of leaving the network and cannot have its stake adjusted"
      );
    }
    if (typeof id !== "number" || id > gateways[caller].vaults.length || id < 0) {
      throw new ContractError("Invalid vault index provided");
    }
    if (gateways[caller].operatorStake - gateways[caller].vaults[id].balance < settings.minNetworkJoinStakeAmount) {
      throw new ContractError(
        "Not enough operator stake to maintain the minimum"
      );
    }
    if (gateways[caller].vaults[id].start + settings.minLockLength > +SmartWeave.block.height) {
      throw new ContractError("This vault has not been locked long enough");
    }
    if (gateways[caller].vaults[id].end === 0) {
      gateways[caller].vaults[id].end = +SmartWeave.block.height + settings.operatorStakeWithdrawLength;
    } else {
      throw new ContractError(
        `This vault is already being unlocked at ${gateways[caller].vaults[id].end}`
      );
    }
    state.gateways = gateways;
    return { state };
  };

  // src/actions/write/joinNetwork.ts
  var joinNetwork = async (state, { caller, input }) => {
    const balances = state.balances;
    const settings = state.settings.registry;
    const gateways = state.gateways;
    const {
      qty,
      label,
      fqdn,
      port,
      protocol,
      openDelegation = false,
      delegateAllowList = [],
      note
    } = input;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(DEFAULT_INSUFFICIENT_FUNDS_MESSAGE);
    }
    if (qty < settings.minNetworkJoinStakeAmount) {
      throw new ContractError(
        `Quantity must be greater than or equal to the minimum network join stake amount ${settings.minNetworkJoinStakeAmount}.`
      );
    }
    if (typeof label !== "string" || label.length > MAX_GATEWAY_LABEL_LENGTH) {
      throw new ContractError("Label format not recognized.");
    }
    if (!Number.isInteger(port) || port > MAX_PORT_NUMBER) {
      throw new ContractError("Invalid port number.");
    }
    if (!(protocol === "http" || protocol === "https")) {
      throw new ContractError("Invalid protocol, must be http or https.");
    }
    const isFQDN = isValidFQDN(fqdn);
    if (fqdn === void 0 || typeof fqdn !== "string" || !isFQDN) {
      throw new ContractError(
        "Please provide a fully qualified domain name to access this gateway"
      );
    }
    if (note && typeof note !== "string" && note > MAX_NOTE_LENGTH) {
      throw new ContractError("Invalid note.");
    }
    if (typeof openDelegation !== "boolean") {
      throw new ContractError("Open Delegation must be true or false.");
    }
    if (!Array.isArray(delegateAllowList)) {
      throw new ContractError(
        "Delegate allow list must contain an array of valid Arweave addresses."
      );
    }
    if (delegateAllowList.length > MAX_DELEGATES) {
      throw ContractError("Invalid number of delegates.");
    }
    for (let i = 0; i < delegateAllowList.length; i += 1) {
      if (!isValidArweaveBase64URL(delegateAllowList[i])) {
        throw new ContractError(
          `${delegateAllowList[i]} is an invalid Arweave address. Delegate allow list must contain valid arweave addresses.`
        );
      }
    }
    if (caller in gateways) {
      throw new ContractError("This Gateway's wallet is already registered");
    }
    state.balances[caller] -= qty;
    state.gateways[caller] = {
      operatorStake: qty,
      delegatedStake: 0,
      vaults: [
        {
          balance: qty,
          start: +SmartWeave.block.height,
          end: 0
        }
      ],
      delegates: {},
      settings: {
        label,
        fqdn,
        port,
        protocol,
        openDelegation,
        delegateAllowList,
        note
      },
      status: NETWORK_JOIN_STATUS,
      start: +SmartWeave.block.height,
      // TODO: timestamp vs. height
      end: 0
    };
    return { state };
  };

  // src/actions/write/transferTokens.ts
  var transferTokens = async (state, { caller, input }) => {
    const balances = state.balances;
    const { target, qty } = input;
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (!target) {
      throw new ContractError("No target specified");
    }
    if (qty <= 0 || caller === target) {
      throw new ContractError(DEFAULT_INVALID_TARGET_MESSAGE);
    }
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(DEFAULT_INSUFFICIENT_FUNDS_MESSAGE);
    }
    if (target in balances) {
      balances[target] += qty;
    } else {
      balances[target] = qty;
    }
    balances[caller] -= qty;
    state.balances = balances;
    return { state };
  };

  // src/actions/write/updateGatewaySettings.ts
  var updateGatewaySettings = async (state, { caller, input }) => {
    const gateways = state.gateways;
    const {
      label,
      fqdn,
      port,
      protocol,
      openDelegation,
      delegateAllowList,
      note,
      status
    } = input;
    if (!(caller in gateways)) {
      throw new ContractError("This caller does not have a registered gateway.");
    }
    if (label) {
      if (typeof label !== "string" || label.length > MAX_GATEWAY_LABEL_LENGTH) {
        throw new ContractError("Label format not recognized.");
      } else {
        gateways[caller].settings.label = label;
      }
    }
    if (port) {
      if (!Number.isInteger(port) || port > MAX_PORT_NUMBER) {
        throw new ContractError("Invalid port number.");
      } else {
        gateways[caller].settings.port = port;
      }
    }
    if (protocol) {
      if (!(protocol === "http" || protocol === "https")) {
        throw new ContractError("Invalid protocol, must be http or https.");
      } else {
        gateways[caller].settings.protocol = protocol;
      }
    }
    if (fqdn) {
      const isFQDN = isValidFQDN(fqdn);
      if (typeof fqdn !== "string" || !isFQDN) {
        throw new ContractError(
          "Please provide a fully qualified domain name to access this gateway"
        );
      } else {
        gateways[caller].settings.fqdn = fqdn;
      }
    }
    if (note) {
      if (typeof note !== "string") {
        throw new ContractError("Note format not recognized.");
      }
      if (note.length > MAX_NOTE_LENGTH) {
        throw new ContractError("Note is too long.");
      } else {
        gateways[caller].settings.note = note;
      }
    }
    if (openDelegation !== void 0) {
      if (typeof openDelegation !== "boolean") {
        throw new ContractError("Open Delegation must be true or false.");
      } else {
        gateways[caller].settings.openDelegation = openDelegation;
      }
    }
    if (delegateAllowList) {
      if (!Array.isArray(delegateAllowList)) {
        throw new ContractError(
          "Delegate allow list must contain an array of valid Arweave addresses."
        );
      }
      for (let i = 0; i < delegateAllowList.length; i += 1) {
        if (!isValidArweaveBase64URL(delegateAllowList[i])) {
          throw new ContractError(
            `${delegateAllowList[i]} is an invalid Arweave address. Delegate allow list must contain valid arweave addresses.`
          );
        }
      }
      gateways[caller].settings.delegateAllowList = delegateAllowList;
    }
    if (status) {
      if (!(status === NETWORK_HIDDEN_STATUS || status === NETWORK_JOIN_STATUS)) {
        throw new ContractError(
          `Invalid gateway status, must be set to ${NETWORK_HIDDEN_STATUS} or ${NETWORK_JOIN_STATUS}`
        );
      } else {
        gateways[caller].status = status;
      }
    }
    state.gateways[caller] = gateways[caller];
    return { state };
  };

  // src/actions/write/upgradeTier.ts
  var upgradeTier = async (state, { caller, input: { name, tierNumber } }) => {
    const balances = state.balances;
    const records = state.records;
    const currentTiers = state.tiers.current;
    const allTiers = state.tiers.history;
    const currentBlockTime = +SmartWeave.block.timestamp;
    if (!balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (!records[name]) {
      throw new ContractError(DEFAULT_ARNS_NAME_DOES_NOT_EXIST_MESSAGE);
    }
    const currentNameTier = allTiers.find((t) => t.id === records[name].tier) ?? DEFAULT_TIERS.history[0];
    const allowedTierNumbers = [...Array.from(DEFAULT_CURRENT_TIERS).keys()].map(
      (k) => k + 1
    );
    const currentTierNumber = (currentTiers.indexOf(tierNumber) ?? 0) + 1;
    if (!allowedTierNumbers.includes(tierNumber) || tierNumber <= currentTierNumber) {
      throw new ContractError(DEFAULT_INVALID_TIER_MESSAGE);
    }
    const selectedUpgradeTier = allTiers.find(
      (t) => t.id === currentTiers[tierNumber]
    );
    if (!selectedUpgradeTier) {
      throw new ContractError(
        "The tier associated with the provided tier number does not exist. Try again."
      );
    }
    if (currentNameTier.id === selectedUpgradeTier.id) {
      throw new ContractError("Cannot upgrade to the same tier.");
    }
    if (records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD < currentBlockTime) {
      throw new ContractError(
        `This name's lease has expired.  It must be purchased first before being extended.`
      );
    }
    const previousTierFee = currentNameTier.fee;
    const newTierFee = selectedUpgradeTier.fee;
    const tierFeeDifference = newTierFee - previousTierFee;
    const amountOfSecondsLeft = records[name].endTimestamp - currentBlockTime;
    const amountOfYearsLeft = amountOfSecondsLeft / SECONDS_IN_A_YEAR;
    const totalTierFeeUpgrade = tierFeeDifference * amountOfYearsLeft;
    if (balances[caller] < totalTierFeeUpgrade) {
      throw new ContractError(
        `Caller balance not high enough to extend this name lease for ${totalTierFeeUpgrade} token(s)!`
      );
    }
    balances[caller] -= totalTierFeeUpgrade;
    records[name].tier = selectedUpgradeTier.id;
    state.balances = balances;
    state.records = records;
    return { state };
  };

  // src/contract.ts
  async function handle(state, action) {
    const input = action.input;
    switch (input.function) {
      case "transfer":
        return transferTokens(state, action);
      case "buyRecord":
        return buyRecord(state, action);
      case "extendRecord":
        return extendRecord(state, action);
      case "evolve":
        return evolve(state, action);
      case "balance":
        return balance(state, action);
      case "record":
        return getRecord(state, action);
      case "tier":
        return getTier(state, action);
      case "activeTiers":
        return getActiveTiers(state);
      case "gateway":
        return getGateway(state, action);
      case "gatewayTotalStake":
        return getGatewayTotalStake(state, action);
      case "gatewayRegistry":
        return getGatewayRegistry(state);
      case "rankedGatewayRegistry":
        return getRankedGatewayRegistry(state);
      case "upgradeTier":
        return upgradeTier(state, action);
      case "joinNetwork":
        return joinNetwork(state, action);
      case "initiateLeave":
        return initiateLeave(state, action);
      case "finalizeLeave":
        return finalizeLeave(state, action);
      case "increaseOperatorStake":
        return increaseOperatorStake(state, action);
      case "initiateOperatorStakeDecrease":
        return initiateOperatorStakeDecrease(state, action);
      case "finalizeOperatorStakeDecrease":
        return finalizeOperatorStakeDecrease(state, action);
      case "updateGatewaySettings":
        return updateGatewaySettings(state, action);
      case "foundationAction":
        return foundationAction(state, action);
      default:
        throw new ContractError(
          `No function supplied or function not recognized: "${input.function}"`
        );
    }
  }

