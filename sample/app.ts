import { Bot, MemoryStorage, BotStateManager } from 'botbuilder';
import { ConsoleAdapter } from "botbuilder-node";
import { DateTimeRecognizer, NumberRecognizer, NumberWithUnitRecognizer, OptionsRecognizer, Culture } from "@microsoft/recognizers-text-suite";
import { Recognizer, IModel, ModelResult } from "@microsoft/recognizers-text"
import { PromptCycle, PromptStatus, Choice } from '../src/prompt';
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
                //PromptCycle.promptForNumber(context, "How old are you", 1, 120);
                
                 let c: Choice[] = [{ value: "yesterday", synonyms: ["preceding day", "ayer"] }, { value: "today", synonyms: ["hoy", "present day"] }]
                 PromptCycle.promptForOption(context, "When did you go?", c);
                
                // PromptCycle.promptForDate(context, "When were you born?");
                
                // PromptCycle.promptForYesNo(context, "Do you like ice-cream?");

                break;
            case PromptStatus.canceled:
                context.reply("You canceled!");

                break;
            case PromptStatus.failed:
                context.reply("Sorry you are having issues responding. Try again later.");

                break;
            case PromptStatus.inProgress:
                context.reply("In progress... this case should be unreachable!");
                break;

            case PromptStatus.validated:
                let response: string = PromptCycle.simpleResponse(context);
                context.reply(`you successfully replied "${response}" to the question. Now onto greater things...`);
                break;
        }
    }
});