# SimpleBotPrompt
Simple prompt middleware for BotBuilder v4.

## General Notes
The middleware takes care of invalid responses up to the number of retries. Before and after, Bot::onReceive will take care of the conversation.

The middleware also exposes static methods used to establish an active prompt and to query for status and results. Results are also stored in the context for further evaluation, under 

```javascript
context.status.conversation.prompt
```

This location is persisted with the rest of the state for the conversation. It should be considered read-only so as not to interfere with the prompt cycle.

## Usage
It is simple to create a prompt. The process can be seen in the sample at https://github.com/MS-Santi/SimpleBotPrompt/blob/master/sample/app.ts

There are three steps:
1. Register the PromptCycle middleware component
1. Create a Prompt
1. Evaluate the result

### Registering the middleware

The PromptCycle middleware module must be registered during the creation of the bot, like in the following example:

```javascript
const bot = new Bot(new ConsoleAdapter().listen())
    .use(new PromptCycle(MAX_RETRIES, ['cancel', 'stop'], Culture.English))
    .use(new MemoryStorage())
    .use(new BotStateManager());
```
The parameters in the constructor configure the options:

```javascript

    //  * @param maxRetries:     Number of times the prompt will be repeated before considered failed.
    //  * @param safeWords:      Keywords that will stop the prompt cycle
    //  * @param defaultCulture: Culture used for evaluation of responses
    
```
### Creating a prompt

Creating a prompt is very simple. Just use the provided helper functions:

```javascript
bot.onReceive((context) => {
    if (context.request.type === 'message') {
        if (PromptCycle.currentStatus(context) === PromptStatus.noPrompt) {
            PromptCycle.promptForDate(context, 'When were you born?', new Date(1890,1,1));
        }
        .
        .
        .
    }
    .
    .
    .
}
```

Different helper functions help prompt for different types of information. Parameters should be self-explanatory:

```javascript
    public static promptForDate(
        ctx: BotContext,
        promptText: string,
        minValue: Date = null,
        maxValue: Date = null) {...}       

    public static promptForNumber(
        ctx: BotContext,
        promptText: string,
        minValue: number = null,
        maxValue: number = null) {...}

    public static promptForOption(
        ctx: BotContext,
        txt: string,
        options: Option[]) {...}

    public static promptForYesNo(
        ctx: BotContext,
        txt: string) {..}

    public static promptForFreeText(
        ctx: BotContext,
        txt: string) {..}
```
### Evaluating the result

You can use:

```javascript
PromptCycle.currentStatus(context)
```

to determine the current status of the prompt. Only terminal statuses are available since the PromptCycle will take care of any intermediate status. Terminal values for status are:

```javascript

export enum PromptStatus {
    validated, //A valid input has been provided; terminal state
    failed, //The retry times has been reached; terminal state
    canceled //One of the safe words have been invoked; terminal state
    .
    .
    .
}

```

To determine the actual response for a prompt in **PromptStatus.validated** status, use:

```javascript
PromptCycle.simpleResponse(context)
```
and
```javascript
PromptCycle.allResponses(context)
```
The first method will return the first response evaluated by the prompt cycle.
Because recognizers can yield more than one response, you can evaluate the array of **response** objects using the second method.
