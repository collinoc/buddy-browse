const listener = Deno.listen({port: 8080});
console.log('Listening...');

const parties = {};
let   party   = 0;

while (true) {
    console.log('Awaiting new connection');
    const http = Deno.serveHttp(await listener.accept());
    const conn = await http.nextRequest();

    if (!conn) {
        console.error('CONNECTION FAILED');
        continue; // Deno.exit(1);
    }

    const { socket, response } = Deno.upgradeWebSocket(conn.request);

    socket.onerror = (e) => console.error('Web Socket error:', e);

    socket.onopen  = () => console.log('New connection:', conn.request.host ?? 'unknown address');

    socket.onclose = ()  => console.log('Connection closed');
    
    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        switch (data.action) {
            case 'update': {
                const party = parties[data.party];

                party?.memberSocks.forEach((sock, i) => {
                    if (i !== data.self && sock.readyState === sock.OPEN) {
                        sock.send(JSON.stringify({
                            action: 'update',
                            self: data.self,
                            party: data.party,
                            x: data.x,
                            y: data.y,
                        }));
                    }
                });

                break;
            }
            
            case 'create': {
                // Math.random().toString(36).substring(2, 7)
                const newParty = `party_${party++}`;
                parties[newParty] = { members: 1, memberSocks: [socket] };

                socket.send(JSON.stringify({
                    action: 'updateReady',
                    self: 0,
                    party: newParty,
                    x: 0,
                    y: 0,
                }));

                break;
            }

            case 'join': {
                const party = parties[data.party];

                if (!party) {
                    console.error('Invalid party ID received: ' + data.party);

                    socket.send(JSON.stringify({
                        action: 'invalid'
                    }));

                    return;
                }

                party.memberSocks.push(socket);

                party.members++;

                socket.send(JSON.stringify({
                    action: 'updateReady',
                    party: data.party,
                    self: party.members - 1,
                }));

                break;
            }

            case 'leave': {
                const party = parties[data.party];

                party && party.members--;

                if (party?.members === 0) {
                    delete parties[data.party];
                }
                
                socket.close();

                break;
            }

            case 'alive': {
                socket.send(JSON.stringify({
                    action: 'alive',
                }));

                break;
            }

            default: console.error('Unknown action received: ' + data.action);
        }
    }

    conn.respondWith(response);
}
