"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var botbuilder_1 = require("botbuilder");
var botbuilder_node_1 = require("botbuilder-node");
var prompt_1 = require("../libraries/simplebotprompt/src/prompt");
var MAX_RETRIES = 3; //must be greater than 0
// Initialize bot by passing it adapter
var bot = new botbuilder_1.Bot(new botbuilder_node_1.ConsoleAdapter().listen())
    .use(new prompt_1.PromptCycle(3, ['cancel', 'stop']))
    .use(new botbuilder_1.MemoryStorage())
    .use(new botbuilder_1.BotStateManager());
bot.onReceive(function (context) {
    if (context.request.type === 'message') {
        var cs = prompt_1.PromptCycle.currentStatus(context);
        switch (cs) {
            case prompt_1.PromptStatus.noPrompt:
                //// Prompt for a Number
                //PromptCycle.promptForNumber(context, 'How old are you', 1, 120);
                //Prompt for a limited set of options
                //  let c: Option[] = [{ value: 'yesterday', synonyms: ['preceding day', 'ayer'] }, { value: 'today', synonyms: ['hoy', 'present day'] }]
                //  PromptCycle.promptForOption(context, 'When did you go?', c);
                prompt_1.PromptCycle.promptForDate(context, 'When were you born?', new Date(1890, 1, 1));
                // PromptCycle.promptForYesNo(context, 'Do you like ice-cream?');
                // PromptCycle.promptForFreeText(context, 'Tell me something about yourself');
                break;
            case prompt_1.PromptStatus.canceled:
                context.reply('You canceled!');
                break;
            case prompt_1.PromptStatus.failed:
                context.reply('Sorry you are having issues responding. Try again later.');
                break;
            case prompt_1.PromptStatus.inProgress:
                context.reply('In progress... this case should be unreachable!');
                break;
            case prompt_1.PromptStatus.validated:
                var response = prompt_1.PromptCycle.simpleResponse(context);
                context.reply("you successfully replied \"" + response + "\" to the question. Now onto greater things...");
                break;
        }
    }
});
//# sourceMappingURL=app.js.map