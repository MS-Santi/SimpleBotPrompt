import { Choice, recognizeChoices } from "botbuilder-choices";
import { ModelResult } from "@microsoft/recognizers-text";
import { Middleware, Activity, ConversationResourceResponse } from "botbuilder";
import { isUndefined } from "util";

export enum PromptType {
    numberRange,
    dateRange,
    choice,
    yesNo
}

export enum PromptStatus {
    noPrompt, //No prompt has been setup; Initial state
    inProgress, //A prompt has been setup; we are processing responses
    validated, //A valid input has been provided; terminal state
    failed, //The retry times has been reached; terminal state
    canceled //One of the safe words have been invoked; terminal state
}

export abstract class Prompt {
    text: string;
    type: PromptType;
    currentAttemp: Number;
    responses: ModelResult[];
}

export class PromptRange<T extends number | Date> extends Prompt {
    //TODO: Change to property getter/setter to ensure that min <= max
    min: T;
    max: T;
}

export class PromptChoice extends Prompt {

    choices: Choice[];
}

export class PromptRegex extends Prompt {

    regex: RegExp;
}

export class PromptContext {
    activePrompt: Prompt;
    maxRetries: number;
    safeWords: string[];
    status: PromptStatus = PromptStatus.noPrompt;

    constructor (maxRetries: number, safeWords: string[]) {
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
    }
}

export class PromptCycle implements Middleware {
    private maxRetries: number;
    private safeWords: string[];

    /**
     * Creates a new instance of an `PromptCycle` middleware.
     * @param maxRetries Number of times the prompt will be repeated before considered failed.
     * @param safeWords keywords that will stop the prompt cycle
     */
    constructor(maxRetries: number = 3, safeWords: string[] = <string[]>[]) {
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
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
                let newPromptText: string = this.retryPromptText(ctx.state.conversation.prompt.activePrompt.currentAttemp);
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
        if (ctx.state.conversation.prompt.status === PromptStatus.noPrompt  ||
            ctx.state.conversation.prompt.status === PromptStatus.validated ||
            ctx.state.conversation.prompt.status === PromptStatus.canceled  ||
            ctx.state.conversation.prompt.status === PromptStatus.failed) {

            //reset prompt
            ctx.state.conversation.prompt.activePrompt = undefined;
            ctx.state.conversation.prompt.status = PromptStatus.noPrompt;
        }
        return next();
    }

    private safeWordInvoked(utterance: string): boolean {
        utterance = utterance.toLowerCase().trim();

        if ((this.safeWords.filter(word => word === utterance).length) > 0) {
            return true;
        }
        return false;
    }

    private validatedResponses(utterance: string, prompt: PromptContext): ModelResult[] {

        let validResponses: ModelResult[];

        switch (prompt.activePrompt.type) {
            case PromptType.numberRange:
                //no-op
                break;
            case PromptType.dateRange:
                //no-op
                break;
            case PromptType.choice:
            case PromptType.yesNo:
                validResponses = recognizeChoices(utterance, (<PromptChoice>prompt.activePrompt).choices);
                break;

        }

        return validResponses;
    }

    private retryPromptText(attempt: number): string {
        return "didn't get that, pls try again";
    }

    public static promptForRange<T extends number | Date>(
        ctx: BotContext,
        promptText: string,
        minValue?: undefined | T,
        maxValue?: undefined | T) {

        let rangePrompt: PromptRange<number | Date>;

        if (typeof minValue === 'number') {
            rangePrompt = new PromptRange<number>();
            rangePrompt.type = PromptType.numberRange;
            if (minValue === undefined) {
                minValue = <T>Number.MIN_VALUE;
            }
            if (maxValue === undefined) {
                maxValue = <T>Number.MAX_VALUE;
            }
        }
        else {
            rangePrompt = new PromptRange<Date>();
            rangePrompt.type = PromptType.dateRange;
            if (minValue === undefined) {
                minValue = <T>(new Date(0));
            }
            if (maxValue === undefined) {
                maxValue = <T>(new Date(Number.MAX_VALUE));
            }
        }

        rangePrompt.text = promptText;
        rangePrompt.currentAttemp = 0;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;
        ctx.state.conversation.prompt.activePrompt = rangePrompt;

        ctx.reply(promptText);

    }

    public static promptForChoice(
        ctx: BotContext,
        txt: string,
        choices: Choice[]) {


        let prompt: PromptChoice = new PromptChoice();

        prompt.type = PromptType.choice;
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

            //TODO: Need to internationalize this function.

        let c: Choice[] = [{
            value: "yes",
            synonyms: ["aha", "yep", "of course", "sure", "yeppers", "si"]
        },
        {
            value: "no",
            synonyms: ["not", "nuh-uh", "nope"]
        }]

        this.promptForChoice(ctx, txt, c);
    }

    public static currentStatus(ctx: BotContext): PromptStatus {
        if (!isUndefined(ctx.state.conversation.prompt)) {
            return ctx.state.conversation.prompt.status;
        }
        else {
            return PromptStatus.noPrompt;
        }
    }
}

