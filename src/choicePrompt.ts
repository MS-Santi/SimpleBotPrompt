import { Choice, recognizeChoices, ModelResult } from "botbuilder-choices";


export class Question {
    Id: string;
    Text: string;
    Type: string;
    Options: object; 
    RetriesSoFar: number;
}

export function GetNextQuestion (questionId?: string) : Question {
        let q = new Question();
    if (questionId === undefined) {
        //this is the first question

        let choices: Choice[] = [{
            value: "yes",
            synonyms: ["aha", "yep", "of course"]
        }, {
            value: "maybe",
            synonyms: ["perhaps", "i'm not sure"]
        },
        {
            value: "no",
            synonyms: ["not", "na-ha", "nope"]
        }]

        q.Id = "IsCommercial";
        q.Text = "Is this a commercial property?";
        q.Type = "options";
        q.Options = choices;
        q.RetriesSoFar = 0;
    }
    else
    {
        //return the next question after questionId

    }

    return q;
}

export function ValidateAnswer (utterance: string, question: Question): ModelResult[] {

    let choices: Choice[] = question.Options as Choice[];

    return recognizeChoices(utterance, choices);

}

export function GetOptionList(question: Question, separator: string="\n") : string {
    let optionList: string="";

    (question.Options as Choice[]).forEach(element => {
        optionList += `${separator}${element.value}` 
       });
       return optionList;
}