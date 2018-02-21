"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var botbuilder_choices_1 = require("botbuilder-choices");
var Question = /** @class */ (function () {
    function Question() {
    }
    return Question;
}());
exports.Question = Question;
function GetNextQuestion(questionId) {
    var q = new Question();
    if (questionId === undefined) {
        //this is the first question
        var choices = [{
                value: "yes",
                synonyms: ["aha", "yep", "of course"]
            }, {
                value: "maybe",
                synonyms: ["perhaps", "i'm not sure"]
            },
            {
                value: "no",
                synonyms: ["not", "na-ha", "nope"]
            }];
        q.Id = "IsCommercial";
        q.Text = "Is this a commercial property?";
        q.Type = "options";
        q.Options = choices;
        q.RetriesSoFar = 0;
    }
    else {
        //return the next question after questionId
    }
    return q;
}
exports.GetNextQuestion = GetNextQuestion;
function ValidateAnswer(utterance, question) {
    var choices = question.Options;
    return botbuilder_choices_1.recognizeChoices(utterance, choices);
}
exports.ValidateAnswer = ValidateAnswer;
function GetOptionList(question, separator) {
    if (separator === void 0) { separator = "\n"; }
    var optionList = "";
    question.Options.forEach(function (element) {
        optionList += "" + separator + element.value;
    });
    return optionList;
}
exports.GetOptionList = GetOptionList;
//# sourceMappingURL=choicePrompt.js.map