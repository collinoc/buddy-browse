import './types';
import * as Util from './util';
import * as Consts from './consts';

let myParty: Party | null;
let myId: ID | null;
let ws: WebSocket | null;

Util.rtOnMessage((message: Message, _: any, response: Function) => {
    handleMessage(message);
});

const handleMessage = (message: Message) => {
    console.log("Hold up hoes, I got a message", message);
    switch (message.action) {
        case Action.Create:     createParty(message); break;
        case Action.Join:       joinParty(message); break;
        case Action.Leave:      leaveParty(message); break;
        case Action.Position:   updatePosition(message); break;
        case Action.Ready:      updatesReady(message); break;
        case Action.SendUpdate: sendUpdates(message); break;
        default: console.error('Got unknown message:', message);
    }
}

const sendUpdates = (message: Message) => {
    message.action = Action.Position;
    ws?.send(JSON.stringify(message));
}

const updatesReady = (message: Message) => {
    Util.rtSync({ [Consts.MyParty]: message.user.party });
    Util.initDot();

    Util.runf((message: Message) => {
        document.onmousemove = (e) => {
            const msg: Message = {
                action: Action.SendUpdate,
                user: {
                    id: message.user.id,
                    party: message.user.party,
                    position: {
                        x: e.pageX,
                        y: e.pageY,
                    },
                },
            };

            // @ts-ignore
            chrome.runtime.sendMessage(msg);
        }
    }, [message]);

    // TODO: Add 'alive' pings
}

const createParty = (message: Message) => {
    ws = new WebSocket(Consts.WsServerAddr);
    
    myId = message.user.id;
    message.action = Action.Create;

    ws.onerror = (e) => {
        console.error(e);
        Util.cleanup(0);
    };


    ws.onopen = () => {
        let msg = JSON.stringify(message);
        console.log('Sending message', msg);
        ws?.send(msg);
    };

    ws.onmessage = (message) => {
        handleMessage(JSON.parse(message.data));
    };
}

const joinParty = (message: Message) => {
    ws = new WebSocket(Consts.WsServerAddr);
    
    myId = message.user.id;
    message.action = Action.Join;

    ws.onerror = (e) => {
        console.error(e);
        Util.cleanup(0);
    };

    ws.onopen = () => {
        let msg = JSON.stringify(message);
        console.log('Sending message', msg);
        ws?.send(msg);
    };

    ws.onmessage = (message) => {
        handleMessage(JSON.parse(message.data));
    };
}

const leaveParty = (message: Message) => {
    ws?.close();
    ws = null;
    myParty = null;

    Util.cleanup(0);
}

const updatePosition = (message: Message) => {
    Util.runf((message: Message) => {
        const dot = document.getElementById('__party-dot__');
        if (!dot) return;

        dot.style.top = `${message.user.position.y}px`;
        dot.style.left = `${message.user.position.x}px`;
    }, [message]);
}