"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var arweave_1 = require("arweave");
var fs = require("fs");
var path_1 = require("path");
var warp_contracts_1 = require("warp-contracts");
var warp_contracts_plugin_deploy_1 = require("warp-contracts-plugin-deploy");
var constants_1 = require("./constants");
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var arweave, warp, wallet, _a, _b, walletAddress, contractSrc, TEST_ARNS_CONTRACT_TX_ID, existingContractState, _c, approvedANTSourceCodeTxs, evolve, relevantState, forkedState, contractTxId;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // ~~ Initialize `LoggerFactory` ~~
                warp_contracts_1.LoggerFactory.INST.logLevel('error');
                arweave = arweave_1.init({});
                warp = warp_contracts_1.WarpFactory.forMainnet(__assign(__assign({}, warp_contracts_1.defaultCacheOptions), { inMemory: true }), true, arweave).use(new warp_contracts_plugin_deploy_1.DeployPlugin());
                _b = (_a = JSON).parse;
                return [4 /*yield*/, fs.readFileSync(constants_1.keyfile).toString()];
            case 1:
                wallet = _b.apply(_a, [_e.sent()]);
                return [4 /*yield*/, arweave.wallets.getAddress(wallet)];
            case 2:
                walletAddress = _e.sent();
                contractSrc = fs.readFileSync(path_1.join(__dirname, '../dist/contract.js'), 'utf8');
                TEST_ARNS_CONTRACT_TX_ID = 'bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U';
                return [4 /*yield*/, warp.contract(TEST_ARNS_CONTRACT_TX_ID).readState()];
            case 3:
                existingContractState = (_e.sent()).cachedValue.state;
                _c = existingContractState, approvedANTSourceCodeTxs = _c.approvedANTSourceCodeTxs, evolve = _c.evolve, relevantState = __rest(_c, ["approvedANTSourceCodeTxs", "evolve"]);
                forkedState = __assign(__assign({}, relevantState), { ticker: 'ARNS-TEST-V2', balances: (_d = {},
                        _d[walletAddress] = 10000000000000,
                        _d['ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo'] = 10000000000,
                        _d['1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo'] = 10000000000,
                        _d['7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk'] = 10000000000,
                        _d.KsUYFIGvpX9MCbhHvsHbPAnxLIMYpzifqNFtFSuuIHA = 10000000000,
                        _d['Kaajvkd2G--bS4qzKKECP1b2meEotzLwTPSoprSaQ_E'] = 10000000000,
                        _d.q6zIf3KQRMCW9fytR0YlKG4oqw6Cox4r_bk7mq6JZBM = 10000000000,
                        _d.QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ = 10000000000,
                        _d), reserved: {
                        www: {},
                        google: {
                            target: 'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo',
                        },
                        microsoft: {
                            target: 'ZjmB2vEUlHlJ7-rgJkYP09N5IzLPhJyStVrK5u9dDEo',
                        },
                        apple: {
                            target: 'KsUYFIGvpX9MCbhHvsHbPAnxLIMYpzifqNFtFSuuIHA',
                        },
                        adobe: {
                            target: '7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk',
                        },
                        news: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        atticus: {
                            target: '7waR8v4STuwPnTck1zFVkQqJh5K9q9Zik4Y5-5dV7nk',
                        },
                        turbo: {
                            target: '1H7WZIWhzwTH9FIcnuMqYkTsoyv1OTfGa_amvuYwrgo',
                        },
                        july: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        august: {
                            endTimestamp: Math.floor(new Date('08/01/2023').getTime() / 1000),
                        },
                        september: {
                            endTimestamp: Math.floor(new Date('09/01/2023').getTime() / 1000),
                        },
                        phil: {
                            target: 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ',
                        },
                        mataras: {
                            target: 'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ',
                        },
                        arielmelendez: {
                            endTimestamp: Math.floor(new Date('06/21/2023').getTime() / 1000),
                        },
                        one: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        two: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        four: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        five: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        six: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        seven: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        eight: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        nine: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        ten: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        admin: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        amazon: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        alexa: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        android: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        bestbuy: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        boston: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        blackrock: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        biogen: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        buzzfeed: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        eth: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        ethereum: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        coinbase: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        costco: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        disney: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        edison: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        facebook: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        files: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        help: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        meta: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        chatgpt: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        faq: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        netflix: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        nginx: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        nvidia: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        python: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        spotify: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        tinyurl: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        youtube: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        weather: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        verizon: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        zoo: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        openai: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                        llm: {
                            endTimestamp: Math.floor(new Date('07/01/2023').getTime() / 1000),
                        },
                    } });
                return [4 /*yield*/, warp.deploy({
                        wallet: wallet,
                        initState: JSON.stringify(forkedState),
                        src: contractSrc,
                        evaluationManifest: {
                            evaluationOptions: {
                                sourceType: "arweave" /* SourceType.ARWEAVE */,
                                unsafeClient: 'skip',
                                internalWrites: true,
                                useKVStorage: true,
                                maxCallDepth: 3,
                                remoteStateSyncEnabled: false,
                                waitForConfirmation: true,
                                updateCacheForEachInteraction: true,
                                maxInteractionEvaluationTimeSeconds: 60,
                                allowBigInt: false,
                                throwOnInternalWriteError: true,
                            },
                        },
                    }, true)];
            case 4:
                contractTxId = _e.sent();
                // ~~ Log contract id to the console ~~
                console.log(contractTxId);
                return [2 /*return*/];
        }
    });
}); })();
