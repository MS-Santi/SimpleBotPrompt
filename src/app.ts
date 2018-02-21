import { Bot, MemoryStorage, BotStateManager } from 'botbuilder';
import { ConsoleAdapter } from "botbuilder-node";
import { DateTimeRecognizer, NumberRecognizer, NumberWithUnitRecognizer, OptionsRecognizer, Culture } from "@microsoft/recognizers-text-suite";
import { Recognizer, IModel, ModelResult } from "@microsoft/recognizers-text"
import { recognizeChoices, Choice } from 'botbuilder-choices';
import { PromptCycle, PromptStatus } from './prompt';
import { isUndefined } from 'util';

const MAX_RETRIES: number = 3;  //must be greater than 0


// Initialize bot by passing it adapter
const bot = new Bot(new ConsoleAdapter().listen())
    .use(new PromptCycle(3, ['cancel', 'stop']))
    .use(new MemoryStorage())
    .use(new BotStateManager());


bot.onReceive((context) => {
    if (context.request.type === 'message') {

        let cs: PromptStatus = PromptCycle.currentStatus(context);
        switch (cs) {
            case PromptStatus.noPrompt:

                PromptCycle.promptForDate(context, "When were you born?");

                break;
            case PromptStatus.canceled:
                context.reply("you canceled!");

                break;
            case PromptStatus.failed:
                context.reply("sorry you are having issues responding");

                break;
            case PromptStatus.inProgress:
                context.reply("In progress... why am I here?");
                break;

            case PromptStatus.validated:
                let response: string;
                if (!isUndefined((<ModelResult>context.state.conversation.prompt.activePrompt.responses[0]).resolution.value)) {
                    response = (<ModelResult>context.state.conversation.prompt.activePrompt.responses[0]).resolution.value;
                }
                else if (!isUndefined((<ModelResult>context.state.conversation.prompt.activePrompt.responses[0]).resolution.values)) {
                        response = (<ModelResult>context.state.conversation.prompt.activePrompt.responses[0]).resolution.values[0].value;
                    }
                    else {
                        response = "[?]";
                    }
                    context.reply(`you successfully replied "${response}" to the question. Now onto greater things...`);

                    break;
                }
        }
    else {
            if (context.request.type === 'conversationUpdate' && context.request.membersAdded[0].name === 'User') {
                debugger;
            }

        }
    });