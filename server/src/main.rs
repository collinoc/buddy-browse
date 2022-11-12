use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use serde::{Deserialize, Serialize};
use serde_json::*;
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::{collections::HashMap, sync::Arc};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};

#[derive(Serialize_repr, Deserialize_repr, Debug, Clone)]
#[repr(u8)]
enum Action {
    Create,
    Join,
    Leave,
    Position,
    Ready,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Position {
    x: i64,
    y: i64,
}

type ID = i64;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct User {
    party: Option<String>,
    id: ID,
    position: Position,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct WsMessage {
    action: Action,
    user: User,
}

#[derive(Debug)]
struct Party {
    members: Vec<Member>,
}

#[derive(Debug)]
struct Member {
    id: i64,
    stream: SplitSink<WebSocketStream<TcpStream>, Message>,
}

type Parties = Arc<RwLock<HashMap<String, Party>>>;

#[tokio::main]
async fn main() -> Result<()> {
    let addr: String = "127.0.0.1:8000".into();

    let socket = TcpListener::bind(addr).await.expect("Failed to bind");

    let parties: Parties = Default::default();

    while let Ok((stream, _)) = socket.accept().await {
        tokio::spawn(handle_connection(parties.clone(), stream));
    }

    Ok(())
}

async fn handle_connection(parties: Parties, stream: TcpStream) -> Result<()> {
    let addr = stream.peer_addr().expect("Unable to get peer addr");

    let ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Websocket handshake failed");

    let (tx, mut rx) = ws_stream.split();

    println!("New connection: {}", addr);

    let Some(msg) = get_message(&mut rx).await else {
        panic!("Connection ended early");
    };

    match msg.action {
        Action::Create => {
            let partynum = format!("party{}", parties.read().await.len());

            let mut party_lock = parties.write().await;

            let mut new_member = Member {
                id: msg.user.id,
                stream: tx,
            };

            new_member
                .stream
                .send(
                    serde_json::to_string::<WsMessage>(&WsMessage {
                        action: Action::Ready,
                        user: User {
                            party: Some(partynum.clone()),
                            id: msg.user.id,
                            position: msg.user.position,
                        },
                    })
                    .expect("Couldn't convert msg to string")
                    .into(),
                )
                .await
                .unwrap();

            party_lock.insert(
                partynum,
                Party {
                    members: vec![new_member],
                },
            );
        }
        Action::Join => {
            let mut party_lock = parties.write().await;

            let party = msg
                .user
                .party
                .as_ref()
                .expect("User didn't specify a party to join");

            let party = party_lock
                .get_mut::<String>(party)
                .expect("User tried to join non-existent party");

            let mut new_member = Member {
                id: msg.user.id,
                stream: tx,
            };

            new_member
                .stream
                .send(
                    serde_json::to_string::<WsMessage>(&WsMessage {
                        action: Action::Ready,
                        user: msg.user,
                    })
                    .expect("Couldn't convert msg to string")
                    .into(),
                )
                .await
                .unwrap();

            party.members.push(new_member);
        }
        a => panic!("Should not have started with action [{:?}]", a),
    };

    while let Some(msg) = get_message(&mut rx).await {
        act_on_msg(msg, parties.clone()).await;
    }

    Ok(())
}

async fn get_message(rx: &mut SplitStream<WebSocketStream<TcpStream>>) -> Option<WsMessage> {
    let Ok(msg) = rx.next().await.expect("Couldn't get next message") else {
        return None
    };

    if !msg.is_close() {
        let text = msg.to_text().expect("Couldn't convert message text");

        let msg: WsMessage = serde_json::from_str(text).expect("Couldn't deserialize message");

        return Some(msg);
    }

    eprintln!("User closed connection.");

    None
}

async fn act_on_msg(msg: WsMessage, parties: Parties) {
    match msg.action {
        Action::Leave => {
            let mut party_lock = parties.write().await;

            let party = party_lock
                .get_mut(&msg.user.party.clone().unwrap())
                .expect("Missing party to leave from");

            let self_idx = party
                .members
                .iter()
                .position(|m| m.id == msg.user.id)
                .unwrap();

            party.members.remove(self_idx);

            if party.members.len() == 0 {
                party_lock.remove(&msg.user.party.expect("Tried to leave empty party"));
            }
        }
        Action::Position => {
            let mut party_lock = parties.write().await;

            let Some(ref party_name) = msg.user.party else {
                panic!("No associated party");
            };

            let party = party_lock
                .get_mut(party_name)
                .expect("Missing party to leave from");

            for member in party.members.iter_mut() {
                if member.id != msg.user.id {
                member
                    .stream
                    .send(
                        serde_json::to_string::<WsMessage>(&msg.clone())
                            .expect("Couldn't convert msg to string")
                            .into(),
                    )
                    .await
                    .expect(&format!("Couldn't send message to {}", member.id));
                }
            }
        }
        _ => panic!("Should not have gotten {:?} at this point", msg.action),
    };
}
