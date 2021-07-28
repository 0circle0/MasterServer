class Prompter {
    #readLineInterface;

    constructor() {
        let readline = require('readline');
        this.#readLineInterface = readline.createInterface( { input: process.stdin, output: process.stdout, terminal: false });
        this.Prompt();
        this.ServerOpen = false;
    }

    Prompt() {
        this.#readLineInterface.question('> ', (answer) => {
            //console.log('Thank you for your valuable feedback:', answer);
            this.ProcessLine(answer);
            this.Prompt();
        });
    }
    //start  || start {} || objects defined as {"KEY":"PAIR"}
    ProcessLine(d) {
        let haveMultiMessage = d.indexOf(' ');
        let index = haveMultiMessage !== -1 ? haveMultiMessage : d.length;
        let message = d.substring(0, index);
        let rest;
        if (haveMultiMessage !== -1) {
            rest = d.substring(index + 1, d.length);
            rest = JSON.parse(rest);
        }
        switch (message) {
            case 'STOP':
            case 'Stop':
            case 'stop':
                this.ServerOpen = false;
                console.log("Server Open = false");
                break;
            case 'START':
            case 'Start':
            case 'start':
                this.ServerOpen = true;
                console.log('Server Open = true')
                break;
            default:
                console.log(d);
                break;

        }
    };
}
module.exports = { Prompter };