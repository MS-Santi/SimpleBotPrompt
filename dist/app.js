"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var botbuilder_1 = require("botbuilder");
var botbuilder_node_1 = require("botbuilder-node");
var prompt_1 = require("./prompt");
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
                prompt_1.PromptCycle.promptForYesNo(context, "Do you like icecream");
                break;
            case prompt_1.PromptStatus.canceled:
                context.reply("you canceled!");
                break;
            case prompt_1.PromptStatus.failed:
                context.reply("sorry you are having issues responding");
                break;
            case prompt_1.PromptStatus.inProgress:
                context.reply("In progress... why am I here?");
                break;
            case prompt_1.PromptStatus.validated:
                context.reply("you successfully replied with a question. Now onto greater things...");
                break;
        }
    }
    else {
        if (context.request.type === 'conversationUpdate' && context.request.membersAdded[0].name === 'User') {
            debugger;
        }
    }
});
//# sourceMappingURL=app.js.map