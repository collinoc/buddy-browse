chrome.storage.sync.remove('party');

const targetIp = '99.102.14.123';
const port     = 8080;
const url      = `ws://${targetIp}:${port}`;

let ws    = null;
let party = null;
let self  = null;

const aliveInterval = 2000;
let   aliveUpdater  = null;

// Main logic: Listen for message from popup
chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (party && !ws) {
        runf(cleanup);
        return;
    }

    switch (request.action) {
        case 'update': {
            ws.send(JSON.stringify({
                action: 'update',
                party: party,
                self: self,
                x: request.x,
                y: request.y,
            }));

            break;
        }

        case 'create': {
            setupConnection('create', '', respond);

            break;
        }

        case 'join': {
            setupConnection('join', request.party, respond);

            break;
        }

        case 'leave': {
            ws?.send(JSON.stringify({
                action: 'leave',
                party: party
            }));

            runf(cleanup);

            respond({ success: true });

            break;
        }

        case 'invalid': {
            respond({ success: false });

            break;
        }

        case 'alive': break;

        default: console.error('Unknown action received: ' + request?.action);
    }

    return true;
});

function setupConnection(action, partyID, respond) {
    ws = new WebSocket(url);

    ws.onerror = () => respond({ success: false });

    ws.onclose = () => runf(cleanup);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            action: action,
            party: partyID,
        }));

        aliveUpdater = setInterval(() => {
            if (ws && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                    action: 'alive',
                })); 
            }
        }, aliveInterval);
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        chrome.storage.sync.set({ 'party': data.party });
        
        data.success = true;
        respond(data);

        party = data.party;
        self  = data.self;

        if (data.action === 'updateReady')
            startUpdates();
        else
            console.error(`Failed to start updates: got action ${data.action}`);
    };
}

function handleUpdate(msg) {
    const data = JSON.parse(msg.data);
    
    runf((data) => {
        const dot = document.getElementById('__party-dot__');
        if (!dot) return;

        dot.style.top  = `${data.y}px`;
        dot.style.left = `${data.x}px`;
    }, [data]);
}

async function startUpdates() {
    ws.onmessage = (msg) => handleUpdate(msg);

    await initDot();

    await runf(() => {
        document.onmousemove = (event) => {
            chrome.runtime.sendMessage({
                action: 'update',
                x: event.pageX,
                y: event.pageY
            });
        }
    });
}

async function initDot() {
    await runf(() => {
        const dot = document.createElement('div');
        dot.id                    = '__party-dot__';
        dot.style.backgroundColor = 'red';
        dot.style.position        = 'fixed';
        dot.style.top             = '50%';
        dot.style.left            = '50%';
        dot.style.height          = '10px';
        dot.style.width           = '10px';
        dot.style.borderRadius    = '50%';
        dot.style.zIndex          = '999999';
        document.body.prepend(dot);
    });
}

function cleanup() {
    document.onmousemove = null;
    document.getElementById('__party-dot__')?.remove();
    chrome.storage.sync.remove('party');
    ws    = null;
    self  = null;
    party = null;

    clearInterval(aliveUpdater);
    aliveUpdater = null;
}

async function getActiveTab() {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return activeTab;
}

async function runf(func, args) {
    const activeTab = await getActiveTab();
    
    activeTab && await chrome.scripting.executeScript({
        args: args,
        target: {
            tabId: activeTab.id
        },
        function: func,
    });
}