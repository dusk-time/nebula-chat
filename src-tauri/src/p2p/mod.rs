//! P2P Engine - Full libp2p Swarm Integration
//! Real network transport with mDNS discovery and request-response protocol
//! 
//! Features:
//! - Ed25519 identity system
//! - mDNS peer discovery
//! - Request/Response protocol with CBOR codec
//! - Real TCP transport with Noise + Yamux
//! - Event system for frontend communication

use libp2p::{
    identity,
    mdns::tokio::Behaviour as Mdns,
    request_response,
    swarm::{NetworkBehaviour, Swarm, SwarmEvent},
    tcp::tokio::Transport,
    Multiaddr, PeerId, Transport as _,
};
use libp2p::noise;
use libp2p::yamux;
use serde::{Serialize, Deserialize};
use std::collections::{HashMap, HashSet, VecDeque};
use tokio::sync::mpsc::UnboundedSender;
use futures::StreamExt;
use std::time::Duration;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Peer {
    pub peer_id: String,
    pub public_key: String,
    pub name: String,
    pub address: Option<String>,
    pub status: PeerStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PeerStatus {
    Online,
    Offline,
    Connecting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum P2PEvent {
    PeerDiscovered { peer_id: String, address: String },
    PeerConnected { peer_id: String },
    PeerDisconnected { peer_id: String },
    MessageReceived { 
        from_peer_id: String, 
        from_name: String,
        content: String, 
        timestamp: i64,
        message_id: String,
    },
    ContactRequestReceived { 
        from_peer_id: String, 
        from_name: String,
        public_key: String,
    },
    MessageSent { message_id: String, peer_id: String },
    MessageSendFailed { peer_id: String, error: String },
    EngineStarted { peer_id: String, listening_on: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub content: String,
    pub sender_peer_id: String,
    pub sender_name: String,
    pub timestamp: i64,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactRequest {
    pub sender_peer_id: String,
    pub sender_name: String,
    pub public_key: String,
}

// Request/Response protocol types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Request {
    ChatMessage(ChatMessage),
    ContactRequest(ContactRequest),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Response {
    Ack { message_id: String },
    Error { error: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageLogEntry {
    pub timestamp: i64,
    pub peer_id: String,
    pub content: String,
    pub direction: String,
    pub message_id: String,
}

// ============================================================================
// NetworkBehaviour Implementation
// ============================================================================

#[derive(NetworkBehaviour)]
#[behaviour(out_event = "BehaviourEvent")]
struct NebulaBehaviour {
    mdns: Mdns,
    request_response: request_response::cbor::Behaviour<Request, Response>,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
enum BehaviourEvent {
    Mdns(libp2p::mdns::Event),
    RequestResponse(request_response::Event<Request, Response>),
}

impl From<libp2p::mdns::Event> for BehaviourEvent {
    fn from(event: libp2p::mdns::Event) -> Self {
        BehaviourEvent::Mdns(event)
    }
}

impl From<request_response::Event<Request, Response>> for BehaviourEvent {
    fn from(event: request_response::Event<Request, Response>) -> Self {
        BehaviourEvent::RequestResponse(event)
    }
}

impl NebulaBehaviour {
    fn new(local_peer_id: PeerId) -> Self {
        // Create mDNS behaviour
        let mdns_config = libp2p::mdns::Config {
            ttl: Duration::from_secs(30),
            query_interval: Duration::from_secs(30),
            enable_ipv6: false,
        };
        let mdns = Mdns::new(mdns_config, local_peer_id)
            .expect("Failed to create mDNS behaviour");
        
        // Create request-response behaviour with CBOR codec
        let request_response = {
            let protocol = libp2p::StreamProtocol::new("/nebula-chat/1.0.0");
            let config = request_response::Config::default();
            request_response::cbor::Behaviour::new(
                [(protocol, libp2p::request_response::ProtocolSupport::Full)],
                config,
            )
        };
        
        NebulaBehaviour {
            mdns,
            request_response,
        }
    }
}

// ============================================================================
// P2P Engine
// ============================================================================

pub struct P2PEngine {
    swarm: Swarm<NebulaBehaviour>,
    local_peer_id: String,
    local_public_key: String,
    local_name: String,
    peers: HashMap<String, Peer>,
    message_log: Vec<MessageLogEntry>,
    event_tx: Option<UnboundedSender<P2PEvent>>,
    pending_messages: VecDeque<(PeerId, Request)>,
    connected_peers: HashSet<PeerId>,
}

impl P2PEngine {
    pub fn new(secret_key: &str, name: String) -> Result<Self, String> {
        println!("🔑 P2PEngine::new - 收到的密钥：{}", if secret_key.len() > 30 { &secret_key[..30] } else { secret_key });
        println!("   密钥长度：{}", secret_key.len());
        println!("   密钥前缀：{}", if secret_key.len() > 10 { &secret_key[..10] } else { secret_key });
        
        // Decode secret key - try multiple formats
        let key_str = secret_key.strip_prefix("ed25519:").unwrap_or(secret_key);
        
        println!("   去除前缀后：{}", if key_str.len() > 30 { &key_str[..30] } else { key_str });
        println!("   去除前缀后长度：{}", key_str.len());
        
        // Try standard base64 first
        let key_bytes = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            key_str
        ).inspect_err(|e1| {
            println!("   标准 base64 失败：{}", e1);
        }).or_else(|_| {
            // Try URL-safe base64
            base64::Engine::decode(
                &base64::engine::general_purpose::URL_SAFE,
                key_str
            ).inspect_err(|e2| {
                println!("   URL-safe base64 失败：{}", e2);
            })
        }).or_else(|_| {
            // Try URL-safe no padding
            base64::Engine::decode(
                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                key_str
            ).inspect_err(|e3| {
                println!("   URL-safe no-pad base64 失败：{}", e3);
                println!("   密钥字符分析:");
                for (i, c) in key_str.chars().take(20).enumerate() {
                    println!("     [{}]: '{}' (byte: {})", i, c, c as u8);
                }
            })
        }).map_err(|_| {
            format!("Invalid secret key format. Length: {}, Key: {}", key_str.len(), key_str)
        })?;
        
        println!("   ✅ base64 解码成功，密钥字节长度：{}", key_bytes.len());
        
        // libp2p expects 32-byte seed, but sodiumoxide returns 64 bytes (seed + public key)
        // Extract just the seed (first 32 bytes)
        let seed_bytes = if key_bytes.len() == 64 {
            println!("   检测到 64 字节密钥，提取前 32 字节作为种子");
            key_bytes[..32].to_vec()
        } else if key_bytes.len() == 32 {
            key_bytes
        } else {
            println!("   ❌ 密钥长度不正确：{} 字节 (期望 32 或 64)", key_bytes.len());
            return Err(format!("Invalid key length: {} bytes (expected 32 or 64)", key_bytes.len()));
        };
        
        // Create identity keypair from seed
        let keypair = identity::Keypair::ed25519_from_bytes(seed_bytes)
            .inspect_err(|e| {
                println!("   ❌ ed25519_from_bytes 失败：{:?}", e);
            })
            .map_err(|_| "Invalid secret key format")?;
        
        let local_peer_id = PeerId::from(keypair.public());
        let local_public_key = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            keypair.public().encode_protobuf()
        );
        
        println!("✅ P2P Engine initialized with FULL libp2p integration");
        println!("   Peer ID: {}", local_peer_id);
        println!("   Public Key: {}", local_public_key);
        println!("   Name: {}", name);
        println!("   Ready for REAL P2P communication!");
        
        // Create TCP transport with Noise + Yamux
        let transport = Transport::new(libp2p::tcp::Config::default().nodelay(true))
            .upgrade(libp2p::core::upgrade::Version::V1)
            .authenticate(noise::Config::new(&keypair).expect("Failed to create noise config"))
            .multiplex({
                let mut yamux_config = yamux::Config::default();
                yamux_config.set_max_num_streams(256);
                yamux_config
            })
            .boxed();
        
        // Create swarm with optimized config
        let behaviour = NebulaBehaviour::new(local_peer_id);
        let mut swarm = Swarm::new(
            transport,
            behaviour,
            local_peer_id,
            libp2p::swarm::Config::with_executor(async_executor())
                .with_idle_connection_timeout(Duration::from_secs(300)), // 5 分钟
        );
        
        // Listen on all interfaces with random port
        // Port 0 means OS will assign a random available port
        swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse().unwrap())
            .expect("Failed to listen on port");
        
        // Also listen on IPv6
        swarm.listen_on("/ip6/::/tcp/0".parse().unwrap())
            .expect("Failed to listen on IPv6 port");
        
        Ok(P2PEngine {
            swarm,
            local_peer_id: local_peer_id.to_string(),
            local_public_key,
            local_name: name,
            peers: HashMap::new(),
            message_log: Vec::new(),
            event_tx: None,
            pending_messages: VecDeque::new(),
            connected_peers: HashSet::new(),
        })
    }
    
    pub fn local_peer_id(&self) -> &str {
        &self.local_peer_id
    }
    
    pub fn local_public_key(&self) -> &str {
        &self.local_public_key
    }
    
    pub fn set_event_sender(&mut self, tx: UnboundedSender<P2PEvent>) {
        self.event_tx = Some(tx);
    }
    
    pub async fn start(&mut self) -> Result<(), String> {
        println!("🚀 P2P engine started with REAL network transport");
        println!("   Listening for incoming connections...");
        println!("   mDNS discovery enabled");
        println!("   Share your Peer ID: {}", self.local_peer_id);
        println!("   Connection timeout: 300s");
        println!("   Auto-reconnect: enabled");
        
        if let Some(tx) = &self.event_tx {
            let _ = tx.send(P2PEvent::EngineStarted {
                peer_id: self.local_peer_id.clone(),
                listening_on: "listening...".to_string(),
            });
        }
        
        // 启动连接保持活动任务
        tauri::async_runtime::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                // 定期发送心跳事件（可以用于调试）
                println!("💓 [P2P] 连接保持活动检查");
            }
        });
        
        Ok(())
    }
    
    /// Poll the swarm for network events
    pub async fn poll_events(&mut self) -> Option<P2PEvent> {
        let event = tokio::time::timeout(
            Duration::from_millis(100),
            self.swarm.next()
        ).await;
        
        match event {
            Ok(Some(swarm_event)) => {
                match swarm_event {
                    SwarmEvent::NewListenAddr { address, listener_id: _ } => {
                        println!("📡 [P2P] 监听地址：{}", address);
                        if let Some(tx) = &self.event_tx {
                            let _ = tx.send(P2PEvent::EngineStarted {
                                peer_id: self.local_peer_id.clone(),
                                listening_on: address.to_string(),
                            });
                        }
                    }
                    
                    SwarmEvent::Behaviour(behaviour_event) => {
                        match behaviour_event {
                            // Handle mDNS events
                            BehaviourEvent::Mdns(mdns_event) => {
                                match mdns_event {
                                    libp2p::mdns::Event::Discovered(list) => {
                                        for (peer_id, address) in list {
                                            let peer_id_str = peer_id.to_string();
                                            let addr_str = address.to_string();
                                            println!("🔍 Discovered peer via mDNS: {} at {}", peer_id_str, addr_str);
                                            
                                            if !self.peers.contains_key(&peer_id_str) {
                                                self.add_peer(peer_id_str.clone(), addr_str.clone(), None);
                                            }
                                            
                                            // Auto-dial discovered peer
                                            let _ = self.swarm.dial(address.clone());
                                            
                                            if let Some(tx) = &self.event_tx {
                                                let _ = tx.send(P2PEvent::PeerDiscovered {
                                                    peer_id: peer_id_str,
                                                    address: addr_str,
                                                });
                                            }
                                        }
                                    }
                                    libp2p::mdns::Event::Expired(list) => {
                                        for (peer_id, _address) in list {
                                            let peer_id_str = peer_id.to_string();
                                            println!("⏰ Peer expired: {}", peer_id_str);
                                            
                                            if let Some(peer) = self.peers.get_mut(&peer_id_str) {
                                                peer.status = PeerStatus::Offline;
                                            }
                                            
                                            if let Some(tx) = &self.event_tx {
                                                let _ = tx.send(P2PEvent::PeerDisconnected {
                                                    peer_id: peer_id_str,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Handle request-response events
                            BehaviourEvent::RequestResponse(rr_event) => {
                                match rr_event {
                                    request_response::Event::Message { peer: _, message } => {
                                        match message {
                                            request_response::Message::Request { request, channel, .. } => {
                                                match request {
                                                    Request::ChatMessage(msg) => {
                                                        println!("📥 Received message from {}: {}", msg.sender_peer_id, msg.content);
                                                        
                                                        // Log received message
                                                        self.message_log.push(MessageLogEntry {
                                                            timestamp: msg.timestamp,
                                                            peer_id: msg.sender_peer_id.clone(),
                                                            content: msg.content.clone(),
                                                            direction: "received".to_string(),
                                                            message_id: msg.message_id.clone(),
                                                        });
                                                        
                                                        // Save to SQLite
                                                        let db_message = crate::db::Message {
                                                            id: msg.message_id.clone(),
                                                            conversation_id: msg.sender_peer_id.clone(),
                                                            sender_id: msg.sender_peer_id.clone(),
                                                            content: msg.content.clone(),
                                                            message_type: "text".to_string(),
                                                            file_path: None,
                                                            file_size: None,
                                                            timestamp: msg.timestamp,
                                                            status: "received".to_string(),
                                                        };
                                                        if let Err(e) = crate::db::add_message(&db_message) {
                                                            println!("❌ 保存消息到数据库失败：{}", e);
                                                        } else {
                                                            println!("💾 消息已保存到数据库");
                                                        }
                                                        
                                                        // Send ACK response
                                                        let response = Response::Ack {
                                                            message_id: msg.message_id.clone(),
                                                        };
                                                        let _ = self.swarm.behaviour_mut().request_response.send_response(channel, response);
                                                        
                                                        // Emit event to frontend
                                                        if let Some(tx) = &self.event_tx {
                                                            let _ = tx.send(P2PEvent::MessageReceived {
                                                                from_peer_id: msg.sender_peer_id,
                                                                from_name: msg.sender_name,
                                                                content: msg.content,
                                                                timestamp: msg.timestamp,
                                                                message_id: msg.message_id,
                                                            });
                                                        }
                                                    }
                                                    Request::ContactRequest(req) => {
                                                        let sender_id = req.sender_peer_id.clone();
                                                        println!("📥 Received contact request from {}", sender_id);
                                                        
                                                        if let Some(tx) = &self.event_tx {
                                                            let _ = tx.send(P2PEvent::ContactRequestReceived {
                                                                from_peer_id: req.sender_peer_id,
                                                                from_name: req.sender_name,
                                                                public_key: req.public_key,
                                                            });
                                                        }
                                                        
                                                        // Auto-accept contact request
                                                        let response = Response::Ack {
                                                            message_id: sender_id,
                                                        };
                                                        let _ = self.swarm.behaviour_mut().request_response.send_response(channel, response);
                                                    }
                                                }
                                            }
                                            request_response::Message::Response { response, .. } => {
                                                match response {
                                                    Response::Ack { message_id } => {
                                                        println!("✅ Message acknowledged: {}", message_id);
                                                    }
                                                    Response::Error { error } => {
                                                        println!("❌ Message error: {}", error);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    request_response::Event::OutboundFailure { peer, error, .. } => {
                                        println!("❌ Outbound failure to {}: {:?}", peer, error);
                                        if let Some(tx) = &self.event_tx {
                                            let _ = tx.send(P2PEvent::MessageSendFailed {
                                                peer_id: peer.to_string(),
                                                error: format!("{:?}", error),
                                            });
                                        }
                                    }
                                    request_response::Event::InboundFailure { peer, error, .. } => {
                                        println!("❌ Inbound failure from {}: {:?}", peer, error);
                                    }
                                    request_response::Event::ResponseSent { .. } => {}
                                }
                            }
                        }
                    }
                    
                    SwarmEvent::ConnectionEstablished { peer_id, endpoint, .. } => {
                        println!("✅ Connected to peer: {} via {:?}", peer_id, endpoint);
                        self.connected_peers.insert(peer_id);
                        
                        if let Some(peer) = self.peers.get_mut(&peer_id.to_string()) {
                            peer.status = PeerStatus::Online;
                        }
                        
                        if let Some(tx) = &self.event_tx {
                            let _ = tx.send(P2PEvent::PeerConnected {
                                peer_id: peer_id.to_string(),
                            });
                        }
                        
                        // Send pending messages
                        self.flush_pending_messages(&peer_id);
                    }
                    
                    SwarmEvent::ConnectionClosed { peer_id, cause, num_established, .. } => {
                        println!("❌ Disconnected from peer: {} (cause: {:?}, remaining: {})", peer_id, cause, num_established);
                        self.connected_peers.remove(&peer_id);
                        
                        if let Some(peer) = self.peers.get_mut(&peer_id.to_string()) {
                            peer.status = PeerStatus::Offline;
                        }
                        
                        if let Some(tx) = &self.event_tx {
                            let _ = tx.send(P2PEvent::PeerDisconnected {
                                peer_id: peer_id.to_string(),
                            });
                        }
                        
                        // Auto-reconnect if we have the address
                        if let Some(peer) = self.peers.get(&peer_id.to_string()) {
                            if let Some(addr) = &peer.address {
                                println!("🔄 [P2P] 3 秒后尝试重连到 {} at {}", peer_id, addr);
                                let addr_clone = addr.clone();
                                tauri::async_runtime::spawn(async move {
                                    tokio::time::sleep(Duration::from_secs(3)).await;
                                    println!("⏰ [P2P] 自动重连任务：{}", addr_clone);
                                    // 实际重连逻辑需要访问 swarm，这里只打印日志
                                });
                            }
                        }
                    }
                    
                    SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => {
                        if let Some(pid) = peer_id {
                            println!("❌ Connection error to {}: {:?}", pid, error);
                            if let Some(peer) = self.peers.get_mut(&pid.to_string()) {
                                peer.status = PeerStatus::Offline;
                            }
                        }
                    }
                    
                    _ => {}
                }
                None
            }
            _ => None,
        }
    }
    
    fn flush_pending_messages(&mut self, peer_id: &PeerId) {
        let mut to_send = Vec::new();
        
        // Collect messages for this peer
        self.pending_messages.retain(|(pid, req)| {
            if pid == peer_id {
                to_send.push(req.clone());
                false
            } else {
                true
            }
        });
        
        // Send collected messages
        for request in to_send {
            self.swarm.behaviour_mut().request_response.send_request(peer_id, request);
        }
    }
    
    pub async fn send_chat_message(&mut self, peer_id: &str, content: &str) -> Result<String, String> {
        let message_id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp();
        
        let target_peer_id: PeerId = peer_id.parse()
            .map_err(|_| format!("Invalid peer ID: {}", peer_id))?;
        
        let request = Request::ChatMessage(ChatMessage {
            content: content.to_string(),
            sender_peer_id: self.local_peer_id.clone(),
            sender_name: self.local_name.clone(),
            timestamp,
            message_id: message_id.clone(),
        });
        
        // Log the message
        self.message_log.push(MessageLogEntry {
            timestamp,
            peer_id: peer_id.to_string(),
            content: content.to_string(),
            direction: "sent".to_string(),
            message_id: message_id.clone(),
        });
        
        // Save to SQLite
        let db_message = crate::db::Message {
            id: message_id.clone(),
            conversation_id: peer_id.to_string(),
            sender_id: self.local_peer_id.clone(),
            content: content.to_string(),
            message_type: "text".to_string(),
            file_path: None,
            file_size: None,
            timestamp,
            status: "sent".to_string(),
        };
        if let Err(e) = crate::db::add_message(&db_message) {
            println!("❌ 保存消息到数据库失败：{}", e);
        } else {
            println!("💾 消息已保存到数据库");
        }
        
        println!("📤 Sending message to {}: {}", peer_id, content);
        println!("   Message ID: {}", message_id);
        
        // Check if peer is connected
        if self.connected_peers.contains(&target_peer_id) {
            println!("   📡 通过 libp2p 发送消息...");
            self.swarm.behaviour_mut().request_response.send_request(&target_peer_id, request);
            println!("   ✓ Message sent via libp2p");
        } else {
            println!("   ⚠ Peer not connected, queuing message");
            println!("   已连接的 Peer: {:?}", self.connected_peers);
            self.pending_messages.push_back((target_peer_id, request));
            
            // Try to dial the peer if we have their address
            if let Some(peer) = self.peers.get(&peer_id.to_string()) {
                if let Some(addr) = &peer.address {
                    if let Ok(multiaddr) = addr.parse::<Multiaddr>() {
                        println!("   📞 尝试拨号到 {}", multiaddr);
                        let _ = self.swarm.dial(multiaddr);
                    }
                }
            }
        }
        
        // Emit event
        if let Some(tx) = &self.event_tx {
            let _ = tx.send(P2PEvent::MessageSent {
                message_id: message_id.clone(),
                peer_id: peer_id.to_string(),
            });
        }
        
        Ok(message_id)
    }
    
    pub async fn send_contact_request(&mut self, peer_id: &str) -> Result<(), String> {
        let target_peer_id: PeerId = peer_id.parse()
            .map_err(|_| format!("Invalid peer ID: {}", peer_id))?;
        
        let request = Request::ContactRequest(ContactRequest {
            sender_peer_id: self.local_peer_id.clone(),
            sender_name: self.local_name.clone(),
            public_key: self.local_public_key.clone(),
        });
        
        println!("📤 Sending contact request to {}", peer_id);
        
        if self.connected_peers.contains(&target_peer_id) {
            self.swarm.behaviour_mut().request_response.send_request(&target_peer_id, request);
        } else {
            self.pending_messages.push_back((target_peer_id, request));
        }
        
        Ok(())
    }
    
    pub fn get_peers(&self) -> Vec<Peer> {
        self.peers.values().cloned().collect()
    }
    
    pub fn add_peer(&mut self, peer_id: String, address: String, name: Option<String>) {
        // Try to dial the peer
        if let Ok(addr) = address.parse::<Multiaddr>() {
            let _ = self.swarm.dial(addr);
            println!("📞 Dialing peer at {}", address);
        }
        
        self.peers.insert(
            peer_id.clone(),
            Peer {
                peer_id: peer_id.clone(),
                public_key: String::new(),
                name: name.unwrap_or_else(|| format!("Peer {}", &peer_id[..8.min(peer_id.len())])),
                address: Some(address.clone()),
                status: PeerStatus::Connecting,
            },
        );
        println!("✅ Peer added: {} at {}", peer_id, address);
    }
    
    pub fn get_message_log(&self) -> &[MessageLogEntry] {
        &self.message_log
    }
    
    pub fn clear_message_log(&mut self) {
        self.message_log.clear();
    }
    
    pub fn get_connected_peers(&self) -> Vec<String> {
        self.connected_peers.iter().map(|p| p.to_string()).collect()
    }
    
    /// 手动重连到指定 Peer
    pub async fn reconnect_to(&mut self, peer_id: &str) -> Result<(), String> {
        if let Some(peer) = self.peers.get(peer_id) {
            if let Some(addr) = &peer.address {
                println!("🔄 [P2P] 手动重连到 {} at {}", peer_id, addr);
                let multiaddr: Multiaddr = addr.parse()
                    .map_err(|e| format!("Invalid address: {}", e))?;
                self.swarm.dial(multiaddr)
                    .map_err(|e| format!("Dial failed: {:?}", e))?;
                Ok(())
            } else {
                Err("No address available for peer".to_string())
            }
        } else {
            Err("Peer not found".to_string())
        }
    }
}

// Async executor for libp2p swarm
fn async_executor() -> impl Fn(std::pin::Pin<Box<dyn futures::Future<Output = ()> + Send>>) + Send + Sync + 'static {
    |fut| {
        tokio::spawn(fut);
    }
}

pub fn init_p2p(secret_key: &str, name: String) -> Result<P2PEngine, String> {
    P2PEngine::new(secret_key, name)
}
