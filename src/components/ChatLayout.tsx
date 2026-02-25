import { useState } from "react";
import { MessageCircle, Settings, Search, Plus } from "lucide-react";

export default function ChatLayout() {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Nebula Chat</h1>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          <ContactItem
            name="Friend A"
            lastMessage="Hello! 👋"
            time="2m ago"
            unread={2}
            selected={selectedContact === "1"}
            onClick={() => setSelectedContact("1")}
          />
          <ContactItem
            name="Friend B"
            lastMessage="Using Nebula Chat now~"
            time="1h ago"
            unread={0}
            selected={selectedContact === "2"}
            onClick={() => setSelectedContact("2")}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex justify-between">
          <button className="p-2 hover:bg-accent rounded-md transition-colors" title="Add Contact">
            <Plus className="h-5 w-5 text-foreground" />
          </button>
          <button className="p-2 hover:bg-accent rounded-md transition-colors" title="Settings">
            <Settings className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Friend A</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <MessageBubble
                content="Hello! 👋"
                isOwn={false}
                time="10:30 AM"
              />
              <MessageBubble
                content="Hey! How are you?"
                isOwn={true}
                time="10:31 AM"
              />
              <MessageBubble
                content="I'm doing great, just trying out Nebula Chat!"
                isOwn={false}
                time="10:32 AM"
              />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContactItemProps {
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  selected: boolean;
  onClick: () => void;
}

function ContactItem({ name, lastMessage, time, unread, selected, onClick }: ContactItemProps) {
  return (
    <div
      onClick={onClick}
      className={`p-3 cursor-pointer transition-colors ${
        selected ? "bg-accent" : "hover:bg-accent"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-foreground truncate">{name}</h3>
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{lastMessage}</p>
        </div>
        {unread > 0 && (
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground">
            {unread}
          </div>
        )}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  time: string;
}

function MessageBubble({ content, isOwn, time }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-lg ${
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p>{content}</p>
        <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
