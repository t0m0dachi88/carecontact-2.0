"use client";
import { useEffect, useRef } from "react";
import { extractChatPart, hasReport } from "../../lib/utils";

function TypingIndicator() {
  return (
    <div className="msg-row msg-row-bot">
      <div className="bot-avatar">🩺</div>
      <div className="bubble bubble-bot typing-bubble">
        {[0,1,2].map(i => <span key={i} className="dot" style={{animationDelay:`${i*0.2}s`}} />)}
      </div>
    </div>
  );
}

function MessageBubble({ message, onViewReport }) {
  const isUser   = message.role === "user";
  const content  = isUser ? message.content : extractChatPart(message.content);
  const showBtn  = !isUser && hasReport(message.content);
  return (
    <div className={`msg-row ${isUser ? "msg-row-user" : "msg-row-bot"}`}>
      {!isUser && <div className="bot-avatar">🩺</div>}
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-bot"}`}>
        <p className="bubble-text">{content}</p>
        {showBtn && (
          <div className="report-btn-wrapper">
            <button className="report-inline-btn" onClick={onViewReport}>📋 View Full Medical Report</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages, loading, onViewReport }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  return (
    <div className="chat-window">
      {messages.map((msg, i) => <MessageBubble key={i} message={msg} onViewReport={onViewReport} />)}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
