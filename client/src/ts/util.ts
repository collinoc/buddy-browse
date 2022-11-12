import * as Consts from './consts';

export const randomId = (): number => {
    return Math.floor(Math.random() * 1_000_000);
}

export const createMessage = ({ action, party, id, x, y }:{
    action: Action, 
    party: Party, 
    id: ID,
    x: number,
    y: number,
}):Message => {
    return {
        action,
        user: {
            party,
            id,
            position: {
                x,
                y
            }
        }
    }
}

export const rtSync = async (key:{ [Consts.MyParty]: Party }) => {
    // @ts-ignore
    chrome.storage.sync.set(key); 
}

export const rtUnsync = async (key: string) => {
    // @ts-ignore
    chrome.storage.sync.remove(key);
}

export const rtGet = async (key: string): Promise<Party> => {
    // @ts-ignore
    return (await chrome.storage.sync.get(key))[key] ?? null;
}

export const rtMessage = async (msg: any) => {
    // @ts-ignore
    chrome.runtime.sendMessage(msg);
}

export const rtOnMessage = async (callback: Function) => {
    // @ts-ignore
    chrome.runtime.onMessage.addListener(callback);
}

export const getActiveTab = async () => {
    // @ts-ignore
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return activeTab;
}

export const runf = async (func: Function, args: any) => {
    const activeTab = await getActiveTab();
    
    // @ts-ignore
    activeTab && await chrome.scripting.executeScript({
        args: args,
        target: {
            tabId: activeTab.id
        },
        function: func,
    });
}

export const cleanup = async (intvl: any) => {
    await runf(() => {
        document.onmousemove = null;
        document.getElementById('__party-dot__')?.remove();
    }, []);
    
    // @ts-ignore
    chrome.storage.sync.remove(Consts.MyParty);

    clearInterval(intvl);
}

export const initDot = async () => {
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
    }, []);
}

export const getDot = () => {
    return document.getElementById('__party-dot__');
}