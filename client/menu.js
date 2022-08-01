document.getElementById('join-btn').onclick  = join;
document.getElementById('leave-btn').onclick = leave;

let __id         = null;
let __joinActive = true;

// Main
self.onload = () => {
    chrome.storage.sync.get('party', (result) => {
        if (result?.party) {
            __id = result.party;

            const el = document.getElementById('party-id');
            el.value = __id;
            el.disabled = true;

            toggleButton();
        } else {
            console.log('Party not found. Maybe there was none?');
        }
    });
};
// End Main

function join() {
    const el    = document.getElementById('party-id');
    el.disabled = true;
    __id        = el.value.trim();
    
    toggleButton();

    if (!__id) {
        // Tell server to create room
        chrome.runtime.sendMessage({ party: '', action: 'create' }, (response) => {
            if (!response.success) {
                invalidJoin();
                return;
            }

            __id     = response.party;
            el.value = __id;
        });
    } 
    else {
        chrome.runtime.sendMessage({ party: __id, action: 'join' }, (response) => {
            if (!response.success) invalidJoin();
        });
    }
}

function leave() {
    toggleButton();

    if (!__id) {
        console.error('No party to leave from');
        return;
    }
    
    chrome.runtime.sendMessage({ party: __id, action: 'leave' });

    const el    = document.getElementById('party-id');
    el.value    = '';
    el.disabled = false;
    __id        = null;
}

function invalidJoin() {
    __id = null;

    // Flash 'Invalid'
    const txt = document.getElementById('party-id');
    txt.value = 'INVALID';
    txt.style.color = 'red';

    setTimeout(() => {
        txt.value = '';
        txt.style.color = '#333';
        txt.disabled = false;
        toggleButton();
    }, 1000);
}

function toggleButton() {
    const active   = __joinActive ? 'join-btn' : 'leave-btn';
    const inactive = __joinActive ? 'leave-btn' : 'join-btn';

    let btn = document.getElementById(active);
    btn.style.display = 'none';

    btn = document.getElementById(inactive);
    btn.style.display = 'block';

    __joinActive = !__joinActive;
}