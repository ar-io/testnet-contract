(() => {
  // src/contracts/actions/read/balance.ts
  var balance = async (state, { input: { target } }) => {
    const ticker = state.ticker;
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
        ticker,
        balance: -1
      }
    };
  };

  // src/contracts/actions/write/buyRecord.ts
  var MAX_NAME_LENGTH = 20;
  var TX_ID_LENGTH = 43;
  var buyRecord = async (state, { caller, input: { record } }) => {
    const balances = state.balances;
    const records = state.records;
    const name = record.name;
    const contractTransactionId = record.contractTransactionId;
    if (!balances[caller]) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    const namePattern = new RegExp("^[a-zA-Z0-9_-]");
    const nameRes = namePattern.test(name);
    if (typeof name !== "string" || name.length > MAX_NAME_LENGTH || !nameRes || name === "www" || name === "") {
      throw new ContractError("Invalid GNS Record Name");
    }
    let qty;
    switch (name.length) {
      case 1:
        qty = 1e7;
        break;
      case 2:
        qty = 5e7;
        break;
      case 3:
        qty = 25e6;
        break;
      case 4:
        qty = 1e7;
        break;
      case 5:
        qty = 5e6;
        break;
      case 6:
        qty = 25e5;
        break;
      case 7:
        qty = 2e6;
        break;
      case 8:
        qty = 15e5;
        break;
      case 9:
        qty = 125e4;
        break;
      case 10:
        qty = 1e6;
        break;
      case 11:
        qty = 9e5;
        break;
      case 12:
        qty = 8e5;
        break;
      case 13:
        qty = 7e5;
        break;
      case 14:
        qty = 6e5;
        break;
      case 15:
        qty = 5e5;
        break;
      case 16:
        qty = 4e5;
        break;
      case 17:
        qty = 3e5;
        break;
      case 18:
        qty = 2e5;
        break;
      case 19:
        qty = 1e5;
        break;
      case 20:
        qty = 5e4;
        break;
      default:
        throw new ContractError("Invalid string length");
    }
    if (balances[caller] < qty) {
      throw new ContractError(`Caller balance not high enough to purchase this name for ${qty} token(s)!`);
    }
    const txIdPattern = new RegExp("^[a-zA-Z0-9_-]{43}$");
    const txIdres = txIdPattern.test(contractTransactionId);
    if (typeof contractTransactionId !== "string" || contractTransactionId.length !== TX_ID_LENGTH || !txIdres) {
      throw new ContractError("Invalid GNT Smartweave Contract Address");
    }
    if (records.some((existingRecord) => existingRecord.name === record.name)) {
      throw new ContractError("This name already exists");
    }
    balances[caller] -= qty;
    state.records.push({ name, contractTransactionId });
    return { state };
  };

  // src/contracts/actions/write/evolve.ts
  var evolve = async (state, { caller, input: { value } }) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError("Caller cannot evolve the contract");
    }
    state.evolve = value;
    return { state };
  };

  // src/contracts/actions/write/mintTokens.ts
  var mintTokens = async (state, { caller, input: { qty } }) => {
    const balances = state.balances;
    const owner = state.owner;
    if (qty <= 0) {
      throw new ContractError("Invalid token mint");
    }
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (caller !== owner) {
      throw new ContractError("Caller cannot mint tokes");
    }
    balances[caller] ? balances[caller] += qty : balances[caller] = qty;
    return { state };
  };

  // src/contracts/actions/write/transferTokens.ts
  var transferTokens = async (state, { caller, input: { target, qty } }) => {
    const balances = state.balances;
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (!target) {
      throw new ContractError("No target specified");
    }
    if (qty <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer");
    }
    if (!balances[caller]) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }
    balances[caller] -= qty;
    if (target in balances) {
      balances[`${target}`] += qty;
    } else {
      balances[`${target}`] = qty;
    }
    return { state };
  };

  // src/contracts/contract.ts
  async function handle(state, action) {
    const input = action.input;
    switch (input.function) {
      case "transfer":
        return await transferTokens(state, action);
      case "mint":
        return await mintTokens(state, action);
      case "buyRecord":
        return await buyRecord(state, action);
      case "evolve":
        return await evolve(state, action);
      case "balance":
        return await balance(state, action);
      default:
        throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
    }
  }
})();
