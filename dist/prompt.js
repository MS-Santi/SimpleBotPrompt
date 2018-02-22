"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import { Choice, recognizeChoices } from "botbuilder-choices";
var recognizers_text_suite_1 = require("@microsoft/recognizers-text-suite");
var recognizers_text_1 = require("@microsoft/recognizers-text");
var util_1 = require("util");
var PromptType;
(function (PromptType) {
    PromptType[PromptType["numberRange"] = 0] = "numberRange";
    PromptType[PromptType["dateRange"] = 1] = "dateRange";
    PromptType[PromptType["options"] = 2] = "options";
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
var Choice = /** @class */ (function () {
    function Choice() {
        this.synonyms = [];
    }
    return Choice;
}());
exports.Choice = Choice;
var Prompt = /** @class */ (function () {
    function Prompt() {
        this.minNumber = null;
        this.maxNumber = null;
        this.minDate = null;
        this.maxDate = null;
    }
    return Prompt;
}());
exports.Prompt = Prompt;
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
    function PromptCycle(maxRetries, safeWords, defaultCulture) {
        if (maxRetries === void 0) { maxRetries = 3; }
        if (safeWords === void 0) { safeWords = []; }
        if (defaultCulture === void 0) { defaultCulture = recognizers_text_suite_1.Culture.English; }
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
        this.defaultCulture = defaultCulture;
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
            var validResponses = this.validatedResponses(ctx.request.text, ctx.state.conversation.prompt);
            if (validResponses.length > 0) {
                ctx.state.conversation.prompt.status = PromptStatus.validated;
                ctx.state.conversation.prompt.activePrompt.responses = validResponses;
                return next();
            }
            ctx.state.conversation.prompt.activePrompt.currentAttemp++;
            if (ctx.state.conversation.prompt.activePrompt.currentAttemp >= this.maxRetries) {
                ctx.state.conversation.prompt.status = PromptStatus.failed;
                return next();
            }
            else {
                //TODO autoprocess reponse
                var newPromptText = this.retryPromptText(ctx.state.conversation.prompt);
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
            ctx.state.conversation.prompt.status = PromptStatus.noPrompt;
        }
        return next();
    };
    PromptCycle.promptForNumber = function (ctx, promptText, minValue, maxValue) {
        if (minValue === void 0) { minValue = null; }
        if (maxValue === void 0) { maxValue = null; }
        var rangePrompt;
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
    };
    PromptCycle.promptForDate = function (ctx, promptText, minValue, maxValue) {
        if (minValue === void 0) { minValue = null; }
        if (maxValue === void 0) { maxValue = null; }
        var rangePrompt;
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
    };
    PromptCycle.promptForOption = function (ctx, txt, choices) {
        var prompt = new Prompt();
        prompt.type = PromptType.options;
        prompt.text = txt;
        prompt.currentAttemp = 0;
        prompt.choices = choices;
        ctx.state.conversation.prompt.activePrompt = prompt;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;
        ctx.reply(txt);
    };
    PromptCycle.promptForYesNo = function (ctx, txt) {
        var prompt = new Prompt();
        prompt.type = PromptType.yesNo;
        prompt.text = txt;
        prompt.currentAttemp = 0;
        ctx.state.conversation.prompt.activePrompt = prompt;
        ctx.state.conversation.prompt.status = PromptStatus.inProgress;
        ctx.reply(txt);
    };
    PromptCycle.currentStatus = function (ctx) {
        if (!util_1.isUndefined(ctx.state.conversation.prompt)) {
            return ctx.state.conversation.prompt.status;
        }
        else {
            return PromptStatus.noPrompt;
        }
    };
    PromptCycle.simpleResponse = function (ctx) {
        var response = null;
        if (!util_1.isUndefined(ctx.state.conversation.prompt.activePrompt.responses[0].resolution.value)) {
            response = ctx.state.conversation.prompt.activePrompt.responses[0].resolution.value;
        }
        else if (!util_1.isUndefined(ctx.state.conversation.prompt.activePrompt.responses[0].resolution.values)) {
            response = ctx.state.conversation.prompt.activePrompt.responses[0].resolution.values[0].value;
        }
        return response;
    };
    PromptCycle.prototype.safeWordInvoked = function (utterance) {
        if ((this.safeWords.filter(function (word) { return word.toLowerCase().trim() === utterance.toLowerCase().trim(); }).length) > 0) {
            return true;
        }
        return false;
    };
    PromptCycle.prototype.validatedResponses = function (utterance, prompt) {
        var validResponses;
        var model;
        switch (prompt.activePrompt.type) {
            case PromptType.numberRange:
                model = recognizers_text_suite_1.NumberRecognizer.instance.getNumberModel(this.defaultCulture);
                validResponses = this.checkNumericRange(prompt, model.parse(utterance));
                break;
            case PromptType.dateRange:
                model = recognizers_text_suite_1.DateTimeRecognizer.instance.getDateTimeModel(this.defaultCulture);
                validResponses = this.checkDateRange(prompt, model.parse(utterance));
                break;
            case PromptType.options:
                validResponses = this.recognizeChoices(utterance, prompt.activePrompt.choices);
                break;
            case PromptType.yesNo:
                model = recognizers_text_suite_1.OptionsRecognizer.instance.getBooleanModel(this.defaultCulture);
                validResponses = model.parse(utterance);
                break;
        }
        return validResponses;
    };
    PromptCycle.prototype.recognizeChoices = function (response, choices) {
        var results = [];
        var matches = choices.map(function (item) {
            if (response.toLowerCase().trim().indexOf(item.value.toLowerCase().trim()) >= 0 ||
                item.synonyms.map(function (syn) {
                    return response.toLowerCase().trim().indexOf(syn.toLowerCase().trim()) >= 0;
                }).some(function (item) {
                    return item;
                })) {
                return item;
            }
            return null;
        });
        matches.forEach(function (item) {
            if (!util_1.isNull(item)) {
                var mr = new recognizers_text_1.ModelResult();
                mr.text = item.value;
                mr.typeName = "choices";
                mr.resolution = { value: item.value };
                results.push(mr);
            }
        });
        return results;
    };
    PromptCycle.prototype.checkNumericRange = function (prompt, responses) {
        var inRange = [];
        responses.forEach(function (r) {
            if ((util_1.isNull(prompt.activePrompt.minNumber) || r.resolution.value >= prompt.activePrompt.minNumber) &&
                (util_1.isNull(prompt.activePrompt.maxNumber) || r.resolution.value <= prompt.activePrompt.maxNumber)) {
                inRange.push(r);
            }
        });
        return inRange;
    };
    PromptCycle.prototype.checkDateRange = function (prompt, responses) {
        var inRange = [];
        responses.forEach(function (r) {
            if (r.resolution.values[0].type === "date") {
                if ((util_1.isNull(prompt.activePrompt.minDate) || r.resolution.value >= prompt.activePrompt.minDate) &&
                    (util_1.isNull(prompt.activePrompt.maxDate) || r.resolution.value <= prompt.activePrompt.maxDate)) {
                    inRange.push(r);
                }
            }
        });
        return inRange;
    };
    PromptCycle.prototype.retryPromptText = function (prompt) {
        //TODO: need to internationalize this method
        var msg = "";
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
                break;
        }
        return msg;
    };
    PromptCycle.prototype.validValuesText = function (prompt) {
        //TODO: need to internationalize this method    
        var txt;
        var first;
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
                if (!util_1.isNull(prompt.activePrompt.minNumber)) {
                    txt += "greater than " + prompt.activePrompt.minNumber + " ";
                    first = false;
                }
                if (!util_1.isNull(prompt.activePrompt.maxNumber)) {
                    txt += (first ? "" : "and ") + ("less than " + prompt.activePrompt.maxNumber + " ");
                }
                txt += "is valid.";
                break;
            case PromptType.dateRange:
                first = true;
                txt = "Only a date ";
                if (!util_1.isNull(prompt.activePrompt.minDate)) {
                    txt += "later than " + prompt.activePrompt.minNumber + " ";
                    first = false;
                }
                if (!util_1.isNull(prompt.activePrompt.maxDate)) {
                    txt += (first ? "" : "and ") + ("earlier than " + prompt.activePrompt.maxDate + " ");
                }
                txt += "is valid.";
                break;
        }
        return txt;
    };
    return PromptCycle;
}());
exports.PromptCycle = PromptCycle;
//# sourceMappingURL=prompt.js.map