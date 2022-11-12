const enum Action {
    Create,     // 0
    Join,       // 1
    Leave,      // 2
    Position,   // 3
    Ready,      // 4
    SendUpdate, // 5
};

type Position = {
    x: number,
    y: number,
};

type Party = string | null;

type ID = number;

type User = {
    party: Party,
    id: ID,
    position: Position,
};

type Message = {
    action: Action,
    user: User,
};  