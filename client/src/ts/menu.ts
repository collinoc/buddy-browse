import './types';
import * as Util from './util';
import * as Consts from './consts';

const JOIN_BTN = <HTMLButtonElement>document.getElementById('join-btn');
const LEAVE_BTN = <HTMLButtonElement>document.getElementById('leave-btn');
const PARTY_ID_IN = <HTMLInputElement>document.getElementById('party-id');

(async () => {
    const myParty: Party = await Util.rtGet(Consts.MyParty);

    if (myParty && PARTY_ID_IN) {
        PARTY_ID_IN.value = myParty;
        PARTY_ID_IN.disabled = true;
        toggleButtons();
    }

    JOIN_BTN?.addEventListener('click', () => {
        const PARTY_ID = PARTY_ID_IN?.value.trim() || null;
        const MY_ID    = Util.randomId();

        console.log(`Joining ${PARTY_ID ?? 'a new party'} using ID ${MY_ID}`);

        let message: Message;

        if (PARTY_ID === null) {
            message = Util.createMessage({
                action: Action.Create,
                party: null,
                id: MY_ID,
                x: 0,
                y: 0,
            });
        } else {
            message = Util.createMessage({
                action: Action.Join,
                party: PARTY_ID,
                id: MY_ID,
                x: 0,
                y: 0,
            });
        }

        Util.rtMessage(message);
        Util.rtSync({ [Consts.MyParty]: PARTY_ID });

        PARTY_ID_IN.disabled = true;
        JOIN_BTN.style.display = 'none';

        // toggleButtons();
    });

    LEAVE_BTN?.addEventListener('click', () => {
        const ID = PARTY_ID_IN?.value.trim() || null;
        console.log(`Leaving ${ID}`);

        if (ID == null) {
            console.error('Tried to leave a null party');
            return;
        }

        let message = Util.createMessage({
            action: Action.Leave,
            party: ID,
            id: Util.randomId(),
            x: 0,
            y: 0,
        });

        Util.rtMessage(message);
        Util.rtUnsync(Consts.MyParty);

        PARTY_ID_IN.disabled = false;
        PARTY_ID_IN.value = '';

        toggleButtons();
    });
})();

function toggleButtons() {
    if (PARTY_ID_IN.disabled) {
        JOIN_BTN.style.display = 'none';
        LEAVE_BTN.style.display = 'block';
    } else {
        LEAVE_BTN.style.display = 'none';
        JOIN_BTN.style.display = 'block';
    }
}
