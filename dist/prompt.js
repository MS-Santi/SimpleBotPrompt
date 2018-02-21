"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var botbuilder_choices_1 = require("botbuilder-choices");
var util_1 = require("util");
var PromptType;
(function (PromptType) {
    PromptType[PromptType["numberRange"] = 0] = "numberRange";
    PromptType[PromptType["dateRange"] = 1] = "dateRange";
    PromptType[PromptType["choice"] = 2] = "choice";
    PromptType[PromptType["yesNo"] = 3] = "yesNo";
})(PromptType = exports.PromptType || (exports.PromptType = {}));
var PromptStatus;
(function (PromptStatus) {
    PromptStatus[PromptStatus["noPrompt"] = 0] = "noPrompt";
    PromptStatus[PromptStatus["inProgress"] = 1] = "inProgress";
    PromptStatus[PromptStatus["validated"] = 2] = "validated";
    PromptStatus[PromptStatus["failed"] = 3] = "failed";
    PromptStatus[PromptStatus["canceled"] = 4] = "canceled"; //One of the safe words have been invoked; terminal state
})(PromptStatus = exports.PromptStatus || (exports.PromptStatus = {}));
var Prompt = /** @class */ (function () {
    function Prompt() {
    }
    return Prompt;
}());
exports.Prompt = Prompt;
var PromptRange = /** @class */ (function (_super) {
    __extends(PromptRange, _super);
    function PromptRange() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PromptRange;
}(Prompt));
exports.PromptRange = PromptRange;
var PromptChoice = /** @class */ (function (_super) {
    __extends(PromptChoice, _super);
    function PromptChoice() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PromptChoice;
}(Prompt));
exports.PromptChoice = PromptChoice;
var PromptRegex = /** @class */ (function (_super) {
    __extends(PromptRegex, _super);
    function PromptRegex() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return PromptRegex;
}(Prompt));
exports.PromptRegex = PromptRegex;
var PromptContext = /** @class */ (function () {
    function PromptContext(maxRetries, safeWords) {
        this.status = PromptStatus.noPrompt;
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
    }
    return PromptContext;
}());
exports.PromptContext = PromptContext;
var PromptCycle = /** @class */ (function () {
    /**
     * Creates a new instance of an `PromptCycle` middleware.
     * @param maxRetries Number of times the prompt will be repeated before considered failed.
     * @param safeWords keywords that will stop the prompt cycle
     */
    function PromptCycle(maxRetries, safeWords) {
        if (maxRetries === void 0) { maxRetries = 3; }
        if (safeWords === void 0) { safeWords = []; }
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
    }
    PromptCycle.prototype.receiveActivity = function (ctx, next) {
        // Initialize prompt state if not initialized
        ctx.state.conversation.prompt = ctx.state.conversation.prompt || new PromptContext(this.maxRetries, this.safeWords);
        //Do work if there is an active prompt only
        if (!util_1.isUndefined(ctx.state.conversation.prompt.activePrompt)) {
            //if the response is any of the safe words, set the prompt to canceled
            if (this.safeWordInvoked(ctx.request.text)) {
                ctx.state.conversation.prompt.status = PromptStatus.canceled;
                return next();
            }
            var validresponses = new Array();
            if (this.isValid(ctx.request.text, ctx.state.conversation.prompt, validresponses)) {
                ctx.state.conversation.prompt.status = PromptStatus.validated;
                ctx.state.conversation.prompt.validResponses = validresponses;
                return next();
            }
            ctx.state.conversation.prompt.activePrompt.currentAttemp++;
            if (ctx.state.conversation.prompt.activePrompt.currentAttemp >= this.maxRetries) {
                ctx.state.conversation.prompt.status = PromptStatus.failed;
                return next();
            }
            else {
                //TODO autoprocess reponse
                var newPromptText = this.retryPromptText(ctx.state.conversation.prompt.activePrompt.currentAttemp);
                ctx.state.conversation.prompt.status = PromptStatus.inProgress;
                ctx.reply(newPromptText);
            }
        }
        else {
            return next();
        }
    };
    PromptCycle.prototype.postActivity = function (ctx, activities, next) {
        // 
        //        if ([PromptStatus.canceled, PromptStatus.failed, PromptStatus.validated, PromptStatus.noPrompt]
        //                .filter(() => ctx.state.conversation.prompt.activePrompt.status).length > 0) {
        if (ctx.state.conversation.prompt.status === PromptStatus.noPrompt ||
            ctx.state.conversation.prompt.status === PromptStatus.validated ||
            ctx.state.conversation.prompt.status === PromptStatus.canceled ||
            ctx.state.conversation.prompt.status === PromptStatus.failed) {
            //reset prompt
            ctx.state.conversation.prompt.activePrompt = undefined;
        }
        return next();
    };
    PromptCycle.prototype.safeWordInvoked = function (utterance) {
        utterance = utterance.toLowerCase().trim();
        if ((this.safeWords.filter(function (word) { return word === utterance; }).length) > 0) {
            return true;
        }
        return false;
    };
    PromptCycle.prototype.isValid = function (utterance, prompt, validResponses) {
        switch (prompt.activePrompt.type) {
            case PromptType.numberRange:
                //no-op
                break;
            case PromptType.dateRange:
                //no-op
                break;
            case PromptType.choice:
            case PromptType.yesNo:
                validResponses = botbuilder_choices_1.recognizeChoices(utterance, prompt.activePrompt.choices);
                break;
        }
        return (validResponses.length > 0);
    };
    PromptCycle.prototype.retryPromptText = function (attempt) {
        return "didn't get that, pls try again";
    };
    PromptCycle.promptForRange = function (ctx, promptText, minValue, maxValue) {
        var rangePrompt;
        if (typeof minValue === 'number') {
            rangePrompt = new PromptRange();
            rangePrompt.type = PromptType.numberRange;
            if (minValue === undefined) {
                minValue = Number.MIN_VALUE;
            }
            if (maxValue === undefined) {
                maxValue = Number.MAX_VALUE;
            }
        }
        else {
            rangePrompt = new PromptRange();
            rangePrompt.type = PromptType.dateRange;
            if (minValue === undefined) {
                minValue = (new Date(0));
            }
            if (maxValue === undefined) {
                maxValue = (new Date(Number.MAX_VALUE));
            }
        }
        rangePrompt.text = promptText;
        rangePrompt.currentAttemp = 0;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;
        ctx.state.conversation.prompt.activePrompt = rangePrompt;
        ctx.reply(promptText);
    };
    PromptCycle.promptForChoice = function (ctx, txt, choices) {
        var prompt = new PromptChoice();
        prompt.type = PromptType.choice;
        prompt.text = txt;
        prompt.currentAttemp = 0;
        prompt.choices = choices;
        ctx.state.conversation.prompt.activePrompt = prompt;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;
        ctx.reply(txt);
    };
    PromptCycle.promptForYesNo = function (ctx, txt) {
        //TODO: Need to internationalize this function.
        var c = [{
                value: "yes",
                synonyms: ["aha", "yep", "of course", "sure", "yeppers", "si"]
            },
            {
                value: "no",
                synonyms: ["not", "nuh-uh", "nope"]
            }];
        this.promptForChoice(ctx, txt, c);
    };
    PromptCycle.currentStatus = function (ctx) {
        if (!util_1.isUndefined(ctx.state.conversation.prompt)) {
            return ctx.state.conversation.prompt.status;
        }
        else {
            return PromptStatus.noPrompt;
        }
    };
    return PromptCycle;
}());
exports.PromptCycle = PromptCycle;
//# sourceMappingURL=prompt.js.map