import { QuestionCollection } from "inquirer";
import { isValidDomainName } from "./utilities";

export default {
    updateGateway: (): QuestionCollection => {
        const questionList: QuestionCollection = [
            {
                name: "label",
                type: "input",
                message: "Enter your gateway label > ",
                default: "Permagate",
                validate: (value) => value.length > 0 ? true : "Please Enter Valid Name"
            },
            {
                name: "fqdn",
                type: "input",
                message: "Enter your domain for this gateway > ",
                default: "permagate.io" ,
                validate: (value) => isValidDomainName(value) ? true : "Please Enter Vaid Domain Name"
            }
        ]
        return questionList;
    },
    joinNetwork: (): QuestionCollection => {
        const questionList: QuestionCollection = [
            {
                name: "qty",
                type: "number",
                message: "Enter Stake Quantity > ",
                default: 10000
            },
            {
                name: "label",
                type: "input",
                message: "Enter your gateway label > ",
                default: "Permagate",
                validate: (value) => value.length > 0 ? true : "Please Enter Valid Name"
            },
            {
                name: "fqdn",
                type: "input",
                message: "Enter your domain for this gateway > ",
                default: "permagate.io" ,
                validate: (value) => {
                    const regexDomainValidation: RegExp = new RegExp("^(?!-)[A-Za-z0-9-]+([\\-\\.]{1}[a-z0-9]+)*\\.[A-Za-z]{2,6}$")
                    return regexDomainValidation.test(value) ? true : "Please Enter Valid Domain"
                }
            },
            {
                name: "port",
                type: "number",
                message: "Enter port used for this gateway > ",
                default: 443,
                validate: (value) => {
                    return (value >=0 && value <= 65535) ? true : "Please Enter Valid Port Number";
                }
            },
            {
                name: "protocol",
                type: "list",
                message: "Enter protocol used for this gateway > ",
                choices: ["https","http"]
            },
            {
                name: "properties",
                type: "input",
                message: "Enter gateway properties (optional) > ",
                default: "FH1aVetOoulPGqgYukj0VE0wIhDy90WiQoV3U2PeY44",
                validate: (value) => value.length === 43 ? true : "Please Enter Valid Properties"
            },{
                name: "note",
                type: "input",
                message: "Enter short note to further describe this gateway > ",
                default: "Owned and operated by DTF."
            }
        ]
        return questionList;
    },
    transferTokens: (): QuestionCollection=> {
        const questionList: QuestionCollection = [
            {
                name: "target",
                type: "input",
                message: "Enter the recipient target of the token transfer > ",
                validate: (value) => value.length === 43 ? true : "Please Enter Valid Properties"
            },{
                name: "qty",
                type: "number",
                message: "Enter the amount of tokens to be transferred > ",
                validate: (value) => value > 0 ? true : "Please Enter Valid Amount"
            }
        ]
        return questionList;
    },
    increaseOperatorStake: (): QuestionCollection => {
        const questionList: QuestionCollection = [
            {
                name: "qty",
                type: "number",
                message: "Enter Stake Quantity > ",
                default: 10000
            }
        ]
        return questionList;
    }
};