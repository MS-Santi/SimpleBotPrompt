import { Middleware, Activity, ConversationResourceResponse } from 'botbuilder';
import { ModelResult } from '@microsoft/recognizers-text';
export declare enum PromptType {
    numberRange = 0,
    dateRange = 1,
    options = 2,
    yesNo = 3,
}
export declare enum PromptStatus {
    noPrompt = 0,
    inProgress = 1,
    validated = 2,
    failed = 3,
    canceled = 4,
}
export declare class Choice {
    value: string;
    synonyms: string[];
}
export declare class Prompt {
    text: string;
    type: PromptType;
    currentAttemp: Number;
    responses: ModelResult[];
    minNumber: number;
    maxNumber: number;
    minDate: Date;
    maxDate: Date;
    choices: Choice[];
    regExp: string;
}
export declare class PromptContext {
    activePrompt: Prompt;
    maxRetries: number;
    safeWords: string[];
    status: PromptStatus;
    constructor(maxRetries: number, safeWords: string[]);
}
export declare class PromptCycle implements Middleware {
    private maxRetries;
    private safeWords;
    private defaultCulture;
    /**
     * Creates a new instance of an `PromptCycle` middleware.
     * @param maxRetries Number of times the prompt will be repeated before considered failed.
     * @param safeWords keywords that will stop the prompt cycle
     * @param defaultCulture culture used for evaluation of responses
     */
    constructor(maxRetries?: number, safeWords?: string[], defaultCulture?: string);
    receiveActivity(ctx: BotContext, next: () => Promise<void>): Promise<void>;
    postActivity(ctx: BotContext, activities: Partial<Activity>[], next: () => Promise<ConversationResourceResponse[]>): Promise<ConversationResourceResponse[]>;
    static promptForNumber(ctx: BotContext, promptText: string, minValue?: number, maxValue?: number): void;
    static promptForDate(ctx: BotContext, promptText: string, minValue?: Date, maxValue?: Date): void;
    static promptForOption(ctx: BotContext, promptText: string, choices: Choice[]): void;
    static promptForYesNo(ctx: BotContext, promptText: string): void;
    static currentStatus(ctx: BotContext): PromptStatus;
    static simpleResponse(ctx: BotContext): any;
    private safeWordInvoked(utterance);
    private validatedResponses(utterance, prompt);
    private recognizeChoices(response, choices);
    private checkNumericRange(prompt, responses);
    private checkDateRange(prompt, responses);
    private retryPromptText(prompt);
    private validValuesText(prompt);
}
