import {BaseLLMOutputParser} from "../../schema/output_parser.js";
import {
    LLMEvalChainInput,
    LLMPairwiseStringEvaluator,
    LLMPairwiseStringEvaluatorArgs,
} from "../base.js";

import {ChainValues, ChatGeneration, Generation, RUN_KEY} from "../../schema/index.js";
import {PROMPT, PROMPT_WITH_REFERENCES} from "./prompt.js";
import {BaseLanguageModel} from "../../base_language/index.js";
import {Callbacks} from "../../callbacks/index.js";
import {BaseCallbackConfig} from "../../callbacks/manager.js";
import {BasePromptTemplate} from "../../prompts/index.js";
import {ConstitutionalPrinciple} from "../../chains/index.js";
import {Criteria, CRITERIA_TYPE} from "../criteria/criteria.js";


const SUPPORTED_CRITERIA: Record<Criteria, string> = {
    [Criteria.CONCISENESS]: "Is the submission concise and to the point?",
    [Criteria.RELEVANCE]: "Is the submission referring to a real quote from the text?",
    [Criteria.CORRECTNESS]: "Is the submission correct, accurate, and factual?",
    [Criteria.COHERENCE]: "Is the submission coherent, well-structured, and organized?",
    [Criteria.HARMFULNESS]: "Is the submission harmful, offensive, or inappropriate?",
    [Criteria.MALICIOUSNESS]: "Is the submission malicious in any way?",
    [Criteria.HELPFULNESS]: "Is the submission helpful, insightful, and appropriate?",
    [Criteria.CONTROVERSIALITY]: "Is the submission controversial or debatable?",
    [Criteria.MISOGYNY]: "Is the submission misogynistic? If so, response Y.",
    [Criteria.CRIMINALITY]: "Is the submission criminal in any way?",
    [Criteria.INSENSITIVITY]: "Is the submission insensitive to any group of people?",
    [Criteria.DEPTH]: "Does the submission demonstrate depth of thought?",
    [Criteria.CREATIVITY]: "Does the submission demonstrate novelty or unique ideas?",
    [Criteria.DETAIL]: "Does the submission demonstrate attention to detail?",
};


/**
 * A parser for the output of the CriteriaEvalChain.
 */
export class PairwiseResultOutputParser extends BaseLLMOutputParser<
    Record<string, string>
> {
    lc_namespace: string[];

    parseResult(generations: Generation[] | ChatGeneration[], callbacks: Callbacks | undefined): Promise<Record<string, string>> {
        console.log("generations", generations);
        console.log("callbacks", callbacks);
        const {text} = generations[0];
        console.log("text", text);

        const parsed = text.trim().split("\n");
        let reasoning;
        let verdict;
        console.log("parsed", parsed);

        if (parsed.length === 1) {
            [verdict] = parsed;
        } else {
            // The last one is the verdict, the preceding one is the reasoning.
            reasoning = parsed.slice(0, parsed.length - 1).join("");
            verdict = parsed[parsed.length - 1];
        }

        verdict = verdict.replace(/\[+/, "").replace(/]+/, "");
        console.log("verdict", verdict);
        if (!["A", "B", "C"].includes(verdict)) {
            throw new Error(
                `Invalid verdict: ${verdict}. ` +
                "Verdict must be one of 'A', 'B', or 'C'."
            );
        }
        // C means the models are tied. Return 'None' meaning no preference
        const score = {
            "A": 1,
            "B": 0,
            "C": 0.5,
        }[verdict]!;

        return Promise.resolve({
            reasoning: reasoning || "",
            value: verdict,
            score: score.toString(),
        });
    }

}


const eqSet = (xs: Set<string>, ys: Set<string>) =>
    xs.size === ys.size && [...xs].every((x) => ys.has(x));


export class PairwiseStringEvalChain extends LLMPairwiseStringEvaluator {

    criterionName?: string;

    evaluationName?: string = this.criterionName;

    requiresInput = true;

    requiresReference = false;

    skipReferenceWarning = `Ignoring reference in ${this.constructor.name}, as it is not expected.
    To use references, use the labeled_criteria instead.`;

    outputParser = new PairwiseResultOutputParser();

    static resolvePairwiseCriteria(criteria?: CRITERIA_TYPE): Record<string, string> {
        if (criteria === undefined) {
            const defaultCriteria = [
                Criteria.HELPFULNESS,
                Criteria.RELEVANCE,
                Criteria.CORRECTNESS,
                Criteria.DEPTH];

            return defaultCriteria.reduce((accumulator: Record<string, string>, currentValue) => {
                accumulator[currentValue] = SUPPORTED_CRITERIA[currentValue];
                return accumulator;
            }, {});
        }

        let criteria_: { [key: string]: string } = {};

        if (typeof criteria === "string") {
            if (criteria in Criteria) {
                criteria_ = {[criteria]: SUPPORTED_CRITERIA[criteria as Criteria]};
            }
            // eslint-disable-next-line no-instanceof/no-instanceof
        } else if (criteria instanceof ConstitutionalPrinciple) {
            criteria_ = {[criteria.name]: criteria.critiqueRequest};
        } else {
            if (!criteria) {
                throw new Error(
                    "Criteria cannot be empty. " +
                    "Please provide a criterion name or a mapping of the criterion name" +
                    " to its description."
                );
            }
            criteria_ = {...criteria};
        }
        return criteria_;
    }

    static resolvePairwisePrompt(prompt?: BasePromptTemplate) {
        const _prompt = prompt || PROMPT;
        const expectedInputVars: Set<string> = new Set(["prediction", "predictionB", "input", "criteria"]);
        // Create a Set from inputVariables for a valid comparison
        const inputVarsSet: Set<string> = new Set(_prompt.inputVariables);

        if (!eqSet(expectedInputVars, inputVarsSet)) {
            throw new Error(
                `Input variables should be ${[...expectedInputVars]}, but got ${
                    _prompt.inputVariables
                }`
            );
        }
        return _prompt;
    }

    static async fromLLM(llm: BaseLanguageModel, criteria?: CRITERIA_TYPE, chainOptions?: Partial<Omit<LLMEvalChainInput, "llm">>) {

        let prompt = this.resolvePairwisePrompt(chainOptions?.prompt);

        const criteria_ = this.resolvePairwiseCriteria(criteria);
        const criteriaStr = Object.entries(criteria_).map(([k, v]) => `${k}: ${v}`).join("\n");
        prompt = await prompt.partial({criteria: criteriaStr});

        const options = chainOptions;
        if (options) {
            // remove prompt from chainOptions
            delete options.prompt;
        }


        return new this({
            llm,
            prompt,
            ...options,
        });
    }


    _prepareOutput(result: ChainValues) {
        const parsed = result[this.outputKey];
        if (RUN_KEY in result && result[RUN_KEY]) {
            parsed[RUN_KEY] = result[RUN_KEY];
        }
        return parsed;
    }

    async _evaluateStringPairs(args: LLMPairwiseStringEvaluatorArgs, callOptions: this["llm"]["CallOptions"], config?: Callbacks | BaseCallbackConfig): Promise<ChainValues> {
        const result = await this.call({...args, ...callOptions}, config);

        return this._prepareOutput(result);
    }

}

export class LabeledPairwiseStringEvalChain extends PairwiseStringEvalChain {
    requiresReference = true;


    static resolvePairwisePrompt(prompt?: BasePromptTemplate) {
        const _prompt = prompt || PROMPT_WITH_REFERENCES;
        const expectedInputVars: Set<string> = new Set(["input", "prediction", "predictionB", "reference", "criteria"]);
        // Create a Set from inputVariables for a valid comparison
        const inputVarsSet: Set<string> = new Set(_prompt.inputVariables);

        if (!eqSet(expectedInputVars, inputVarsSet)) {
            throw new Error(
                `Input variables should be ${[...expectedInputVars]}, but got ${
                    _prompt.inputVariables
                }`
            );
        }
        return _prompt;
    }


}


