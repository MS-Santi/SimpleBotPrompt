//import { Choice, recognizeChoices } from "botbuilder-choices";
import { NumberRecognizer, DateTimeRecognizer, OptionsRecognizer, Culture } from "@microsoft/recognizers-text-suite";
import { ModelResult, IModel } from "@microsoft/recognizers-text";
import { Middleware, Activity, ConversationResourceResponse } from "botbuilder";
import { isUndefined, isNull } from "util";

export enum PromptType {
    numberRange,
    dateRange,
    options,
    yesNo
}

export enum PromptStatus {
    noPrompt, //No prompt has been setup; Initial state
    inProgress, //A prompt has been setup; we are processing responses
    validated, //A valid input has been provided; terminal state
    failed, //The retry times has been reached; terminal state
    canceled //One of the safe words have been invoked; terminal state
}

export class Choice {
    value: string;
    synonyms: string[] = <string[]>[];
}

export class Prompt {
    text: string;
    type: PromptType;
    currentAttemp: Number;
    responses: ModelResult[];
    minNumber: number = null;
    maxNumber: number = null;
    minDate: Date = null;
    maxDate: Date = null;
    choices: Choice[];
    regExp: string;
}

export class PromptContext {
    activePrompt: Prompt;
    maxRetries: number;
    safeWords: string[];
    status: PromptStatus = PromptStatus.noPrompt;

    constructor(maxRetries: number, safeWords: string[]) {
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
    }
}

export class PromptCycle implements Middleware {
    private maxRetries: number;
    private safeWords: string[];
    private defaultCulture: string;

    /**
     * Creates a new instance of an `PromptCycle` middleware.
     * @param maxRetries Number of times the prompt will be repeated before considered failed.
     * @param safeWords keywords that will stop the prompt cycle
     */
    constructor(maxRetries: number = 3, safeWords: string[] = <string[]>[], defaultCulture = Culture.English) {
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
        this.defaultCulture = defaultCulture;
    }


    public receiveActivity(ctx: BotContext, next: () => Promise<void>): Promise<void> {

        // Initialize prompt state if not initialized
        ctx.state.conversation.prompt = ctx.state.conversation.prompt || new PromptContext(this.maxRetries, this.safeWords);

        //Do work if there is an active prompt only
        if (!isUndefined(ctx.state.conversation.prompt.activePrompt)) {
            //if the response is any of the safe words, set the prompt to canceled
            if (this.safeWordInvoked(ctx.request.text)) {
                ctx.state.conversation.prompt.status = PromptStatus.canceled;
                return next();
            }

            let validResponses: ModelResult[] = this.validatedResponses(ctx.request.text, ctx.state.conversation.prompt);

            if (validResponses.length > 0) {
                ctx.state.conversation.prompt.status = PromptStatus.validated;
                ctx.state.conversation.prompt.activePrompt.responses = validResponses;

                return next();
            }

            ctx.state.conversation.prompt.activePrompt.currentAttemp++
            if (ctx.state.conversation.prompt.activePrompt.currentAttemp >= this.maxRetries) {
                ctx.state.conversation.prompt.status = PromptStatus.failed;
                return next();
            }

            else {
                //TODO autoprocess reponse
                let newPromptText: string = this.retryPromptText(ctx.state.conversation.prompt);
                ctx.state.conversation.prompt.status = PromptStatus.inProgress;
                ctx.reply(newPromptText);
            }
        }
        else {
            return next();
        }
    }

    public postActivity(ctx: BotContext, activities: Partial<Activity>[], next: () => Promise<ConversationResourceResponse[]>): Promise<ConversationResourceResponse[]> {
        // 
        //        if ([PromptStatus.canceled, PromptStatus.failed, PromptStatus.validated, PromptStatus.noPrompt]
        //                .filter(() => ctx.state.conversation.prompt.activePrompt.status).length > 0) {
        if (ctx.state.conversation.prompt.status === PromptStatus.noPrompt ||
            ctx.state.conversation.prompt.status === PromptStatus.validated ||
            ctx.state.conversation.prompt.status === PromptStatus.canceled ||
            ctx.state.conversation.prompt.status === PromptStatus.failed) {

            //reset prompt
            ctx.state.conversation.prompt.activePrompt = undefined;
            ctx.state.conversation.prompt.status = PromptStatus.noPrompt;
        }
        return next();
    }


    public static promptForNumber(
        ctx: BotContext,
        promptText: string,
        minValue: number = null,
        maxValue: number = null) {

        let rangePrompt: Prompt;


        rangePrompt = new Prompt();
        rangePrompt.type = PromptType.numberRange;

        //TODO: Check for min/max and swap if min > max

        rangePrompt.text = promptText;
        rangePrompt.currentAttemp = 0;
        rangePrompt.minNumber = minValue;
        rangePrompt.maxNumber = maxValue;
        ctx.state.conversation.prompt.activePrompt = rangePrompt;

        ctx.state.conversation.prompt.status = PromptStatus.inProgress;

        ctx.reply(promptText);
    }

    public static promptForDate(
        ctx: BotContext,
        promptText: string,
        minValue: Date = null,
        maxValue: Date = null) {

        let rangePrompt: Prompt;


        rangePrompt = new Prompt();
        rangePrompt.type = PromptType.dateRange;

        //TODO: check for min/max and swap if min > max

        rangePrompt.text = promptText;
        rangePrompt.currentAttemp = 0;
        rangePrompt.minDate = minValue;
        rangePrompt.maxDate = maxValue;
        ctx.state.conversation.prompt.activePrompt = rangePrompt;

        ctx.state.conversation.prompt.status = PromptStatus.inProgress;

        ctx.reply(promptText);

    }

    public static promptForOption(
        ctx: BotContext,
        txt: string,
        choices: Choice[]) {

        let prompt: Prompt = new Prompt();

        prompt.type = PromptType.options;
        prompt.text = txt;
        prompt.currentAttemp = 0;
        prompt.choices = choices;
        ctx.state.conversation.prompt.activePrompt = prompt;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;

        ctx.reply(txt);

    }

    public static promptForYesNo(
        ctx: BotContext,
        txt: string) {


        let prompt: Prompt = new Prompt();

        prompt.type = PromptType.yesNo;
        prompt.text = txt;
        prompt.currentAttemp = 0;
        ctx.state.conversation.prompt.activePrompt = prompt;

        ctx.state.conversation.prompt.status = PromptStatus.inProgress;

        ctx.reply(txt);
    }

    public static currentStatus(ctx: BotContext): PromptStatus {
        if (!isUndefined(ctx.state.conversation.prompt)) {
            return ctx.state.conversation.prompt.status;
        }
        else {
            return PromptStatus.noPrompt;
        }
    }

    public static simpleResponse(ctx: BotContext): any {

        let response: any = null;

        if (!isUndefined((<ModelResult>ctx.state.conversation.prompt.activePrompt.responses[0]).resolution.value)) {
            response = (<ModelResult>ctx.state.conversation.prompt.activePrompt.responses[0]).resolution.value;
        }
        else if (!isUndefined((<ModelResult>ctx.state.conversation.prompt.activePrompt.responses[0]).resolution.values)) {
            response = (<ModelResult>ctx.state.conversation.prompt.activePrompt.responses[0]).resolution.values[0].value;
        }

        return response;
    }

    private safeWordInvoked(utterance: string): boolean {

        if ((this.safeWords.filter(word => word.toLowerCase().trim() === utterance.toLowerCase().trim()).length) > 0) {
            return true;
        }
        return false;
    }

    private validatedResponses(utterance: string, prompt: PromptContext): ModelResult[] {

        let validResponses: ModelResult[];
        let model: IModel;

        switch (prompt.activePrompt.type) {
            case PromptType.numberRange:
                model = NumberRecognizer.instance.getNumberModel(this.defaultCulture)
                validResponses = this.checkNumericRange(prompt, model.parse(utterance));
                break;
            case PromptType.dateRange:
                model = DateTimeRecognizer.instance.getDateTimeModel(this.defaultCulture);
                validResponses = this.checkDateRange(prompt, model.parse(utterance));
                break;
            case PromptType.options:
                validResponses = this.recognizeChoices(utterance, prompt.activePrompt.choices);
                break;
            case PromptType.yesNo:
                model = OptionsRecognizer.instance.getBooleanModel(this.defaultCulture);
                validResponses = model.parse(utterance);
                break;
        }

        return validResponses;
    }

    private recognizeChoices(response: string, choices: Choice[]): ModelResult[] {


        let results: ModelResult[] = <ModelResult[]>[];

        let matches = choices.map((item: Choice) => {
            if (response.toLowerCase().trim().indexOf(item.value.toLowerCase().trim()) >= 0 ||
                item.synonyms.map((syn: string) => {
                    return response.toLowerCase().trim().indexOf(syn.toLowerCase().trim()) >= 0
                }).some((item: boolean) => {
                    return item;
                })) {
                return item;
            }
            return null;
        });

        matches.forEach((item) => {
            if (!isNull(item)) {
                let mr = new ModelResult();
                mr.text = item.value;
                mr.typeName = "choices";
                mr.resolution = { value: item.value };

                results.push(mr);
            }
        })
        return results;
    }

    private checkNumericRange(prompt: PromptContext, responses: ModelResult[]) {

        let inRange: ModelResult[] = [];
        responses.forEach((r) => {
            if ((isNull(prompt.activePrompt.minNumber) || r.resolution.value >= prompt.activePrompt.minNumber) &&
                (isNull(prompt.activePrompt.maxNumber) || r.resolution.value <= prompt.activePrompt.maxNumber)) {

                inRange.push(r);
            }
        })

        return inRange;
    }

    private checkDateRange(prompt: PromptContext, responses: ModelResult[]) {

        let inRange: ModelResult[] = [];
        responses.forEach((r) => {
            if (r.resolution.values[0].type === "date") { //ignore results that render a Period. Only accept dates.
                if ((isNull(prompt.activePrompt.minDate) || r.resolution.value >= prompt.activePrompt.minDate) &&
                    (isNull(prompt.activePrompt.maxDate) || r.resolution.value <= prompt.activePrompt.maxDate)) {

                    inRange.push(r);
                }
            }
        })

        return inRange;
    }

    private retryPromptText(prompt: PromptContext): string {
        //TODO: need to internationalize this method

        let msg: string = "";

        switch (prompt.activePrompt.currentAttemp) {
            case 0:
            case 1:
                msg = "I Didn't understand that, please, try again.";
                break;
            case 2:
                msg = "I am sorry I am not understanding. " + this.validValuesText(prompt);

                break;
            default:
                msg = "I am sorry. " + this.validValuesText(prompt);
                break
        }
        return msg;
    }

    private validValuesText(prompt: PromptContext): string {
        //TODO: need to internationalize this method    
        let txt: string;
        let first: boolean;

        switch (prompt.activePrompt.type) {
            case PromptType.yesNo:
                txt = "Only yes/no - true/false responses are valid.";
                break;
            case PromptType.options:
                txt = "Only one of the given choices is valid.";
                break;
            case PromptType.numberRange:
                first = true;
                txt = "Only a numeric value ";
                if (!isNull(prompt.activePrompt.minNumber)) {
                    txt += `greater than ${prompt.activePrompt.minNumber} `;
                    first = false;
                }
                if (!isNull(prompt.activePrompt.maxNumber)) {

                    txt += (first ? "" : "and ") + `less than ${prompt.activePrompt.maxNumber} `;
                }
                txt += "is valid.";

                break;
            case PromptType.dateRange:
                first = true;
                txt = "Only a date ";
                if (!isNull(prompt.activePrompt.minDate)) {
                    txt += `later than ${prompt.activePrompt.minNumber} `;
                    first = false;
                }
                if (!isNull(prompt.activePrompt.maxDate)) {

                    txt += (first ? "" : "and ") + `earlier than ${prompt.activePrompt.maxDate} `;
                }
                txt += "is valid.";
                break;
        }

        return txt;
    }

}