# SimpleBotPrompt
Simple prompt middleware for BotBuilder v4

## General Notes
The middleware takes care of invalid responses up to the number of retries. Before and after, Bot::onReceive will take care of the conversation.

The middleware also exposes static methods used to establish an active prompt and to query for status and results. Results are also stored in the context for further evaluation, under 

```javascript
context.status.conversation.prompt
```

This location is persisted with the rest of the state for the conversation. It should be considered read-only so as not to interfere with the prompt cycle.

##Usage
It is simple to create a prompt. There are three steps:
1.- Register the PromptCycle middleware component.
2.- Create a Prompt
3.- Evaluate the result

### Registering the middleware

The PromptCycle middleware module must be registered just like all other middleware:

```javascript
const bot = new Bot(new ConsoleAdapter().listen())
    .use(new PromptCycle(3, ['cancel', 'stop']))
    .use(new MemoryStorage())
    .use(new BotStateManager());
```
You can use three parameters as defined in the class:

```javascript
export class PromptCycle implements Middleware {
    private maxRetries: number;
    private safeWords: string[];
    private defaultCulture: string;

    /**
     * Creates a new instance of an `PromptCycle` middleware.
     * @param maxRetries Number of times the prompt will be repeated before considered failed.
     * @param safeWords keywords that will stop the prompt cycle
     * @param defaultCulture culture used for evaluation of responses
     */
    
    constructor(maxRetries: number = 3, safeWords: string[] = <string[]>[], defaultCulture = Culture.English) {
        this.maxRetries = maxRetries;
        this.safeWords = safeWords;
        this.defaultCulture = defaultCulture;
    }
.
.
.
}
```
### Creating a prompt

Use one of the helper functions to create a prompt. In all cases, the parameter txt is the question or prompt that will be presented to the user. Other parameters should be self-explanatory:

```javascript
    public static promptForNumber(
        ctx: BotContext,
        promptText: string,
        minValue: number = null,
        maxValue: number = null) {...}

    public static promptForDate(
        ctx: BotContext,
        promptText: string,
        minValue: Date = null,
        maxValue: Date = null) {...}        

    public static promptForOption(
        ctx: BotContext,
        txt: string,
        choices: Choice[]) {...}

    public static promptForYesNo(
        ctx: BotContext,
        txt: string) {..}
```
### Evaluating the result

You can use:

```javascript
PromptCycle.currentStatus(context)
```
or
```javascript
context.state.conversation.prompt.status
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
or
```javascript
context.state.conversation.prompt.responses
```
The first method will return the first response evaluated by the prompt cycle.
If there are more than one response possible, then you can evaluate the array of **response* objects.