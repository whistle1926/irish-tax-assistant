import { useState, useRef, useEffect } from "react";

var SUGGESTED_QUESTIONS = [
  "How do I register for ROS (Revenue Online Service)?",
  "What are the current income tax rates and bands in Ireland?",
  "How do I file my annual tax return on ROS?",
  "What tax credits am I entitled to as a PAYE worker?",
  "How does the Local Property Tax (LPT) work?",
  "How do I claim medical expenses tax relief?",
  "What are the VAT rates in Ireland?",
  "How do I set up as a sole trader with Revenue?",
  "What is the Help to Buy scheme for first-time buyers?",
  "How do I claim remote working tax relief?",
  "What are the Capital Gains Tax rules in Ireland?"
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "6px", padding: "8px 0", alignItems: "center" }}>
      {[0, 1, 2].map(function(i) {
        return <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1B7B3E", opacity: 0.4, animation: "typingBounce 1.4s ease-in-out " + (i * 0.2) + "s infinite" }} />;
      })}
    </div>
  );
}

function formatMessage(text) {
  var parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map(function(part, i) {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map(function(line, j) {
      return <span key={i + "-" + j}>{j > 0 && <br />}{line}</span>;
    });
  });
}

function MessageBubble({ message }) {
  var isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: "16px", animation: "fadeSlideIn 0.3s ease-out" }}>
      {!isUser && (
        <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "linear-gradient(135deg, #1B7B3E, #0D5C2B)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", flexShrink: 0, marginTop: "2px", boxShadow: "0 2px 8px rgba(27,123,62,0.3)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      <div style={{ maxWidth: "75%", padding: "14px 18px", borderRadius: isUser ? "20px 20px 4px 20px" : "20px 20px 20px 4px", background: isUser ? "linear-gradient(135deg, #1B7B3E, #158C44)" : "#FFFFFF", color: isUser ? "#fff" : "#1a2a1a", fontSize: "14.5px", lineHeight: "1.65", boxShadow: isUser ? "0 2px 12px rgba(27,123,62,0.25)" : "0 1px 8px rgba(0,0,0,0.06)", border: isUser ? "none" : "1px solid rgba(27,123,62,0.08)", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "Source Sans 3, sans-serif" }}>
        {isUser ? message.content : formatMessage(message.content)}
        {message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(27,123,62,0.15)", fontSize: "12px", color: "#5a7a5a" }}>
            <span style={{ fontWeight: 600, color: "#1B7B3E", display: "block", marginBottom: "4px" }}>Official Sources:</span>
            {message.sources.map(function(s, i) {
              return (
                <div key={i} style={{ marginTop: "3px" }}>
                  <a href={s} target="_blank" rel="noopener noreferrer" style={{ color: "#1B7B3E", textDecoration: "underline", fontSize: "12px", wordBreak: "break-all" }}>
                    {s.replace("https://www.", "").replace("https://", "")}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  var _messages = useState([]);
  var messages = _messages[0], setMessages = _messages[1];
  var _input = useState("");
  var input = _input[0], setInput = _input[1];
  var _loading = useState(false);
  var loading = _loading[0], setLoading = _loading[1];
  var _error = useState(null);
  var error = _error[0], setError = _error[1];
  var _welcome = useState(true);
  var showWelcome = _welcome[0], setShowWelcome = _welcome[1];
  var messagesEndRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  var sendMessage = async function(text) {
    if (!text.trim() || loading) return;
    var userMessage = { role: "user", content: text.trim() };
    setMessages(function(prev) { return [...prev, userMessage]; });
    setInput("");
    setShowWelcome(false);
    setLoading(true);
    setError(null);
    var history = [...messages, userMessage].map(function(m) {
      return { role: m.role, content: m.content };
    });
    try {
      var response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!response.ok) {
        var errData = await response.json().catch(function() { return {}; });
        throw new Error(errData.error || "Server error: " + response.status);
      }
      var data = await response.json();
      var fullText = "";
      var sources = [];
      var blocks = data.content || [];
      for (var b = 0; b < blocks.length; b++) {
        if (blocks[b].type === "text") fullText += blocks[b].text;
        if (blocks[b].type === "web_search_tool_result" && blocks[b].content) {
          for (var r = 0; r < blocks[b].content.length; r++) {
            var res = blocks[b].content[r];
            if (res.type === "web_search_result" && res.url) {
              if (res.url.indexOf("revenue.ie") >= 0 || res.url.indexOf("ros.ie") >= 0 || res.url.indexOf("gov.ie") >= 0) {
                sources.push(res.url);
              }
            }
          }
        }
      }
      sources = [...new Set(sources)].slice(0, 4);
      setMessages(function(prev) {
        return [...prev, { role: "assistant", content: fullText || "I could not find specific information. Please try rephrasing.", sources: sources }];
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  var clearChat = function() {
    setMessages([]);
    setShowWelcome(true);
    setError(null);
  };

  var cssText = "@import url(https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap);@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }@keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-8px); opacity: 1; } }@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(27,123,62,0.2); } 50% { box-shadow: 0 0 0 8px rgba(27,123,62,0); } }* { box-sizing: border-box; margin: 0; padding: 0; } body { margin: 0; } input:focus { outline: none; } ::placeholder { color: #8a9a8a; }";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #f0f7f1 0%, #e8f0e8 30%, #f5f5f0 100%)", fontFamily: "Source Sans 3, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{cssText}</style>

      <header style={{ background: "linear-gradient(135deg, #0D5C2B 0%, #1B7B3E 50%, #228B45 100%)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(13,92,43,0.3)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h18v4H3V3z" fill="#FF8C00" />
              <path d="M3 9h18v6H3V9z" fill="white" />
              <path d="M3 17h18v4H3v-4z" fill="#169B62" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", fontWeight: 700, color: "#fff" }}>Irish Tax Assistant</h1>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>Powered by Revenue.ie and ROS</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {messages.length > 0 && (
            <button onClick={clearChat} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "8px 16px", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "Source Sans 3, sans-serif" }}>New Chat</button>
          )}
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ADE80", animation: "pulseGlow 2s ease-in-out infinite" }} />
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px", maxWidth: "820px", width: "100%", margin: "0 auto" }}>
        {showWelcome && (
          <div style={{ animation: "fadeSlideIn 0.5s ease-out" }}>
            <div style={{ textAlign: "center", marginBottom: "36px", marginTop: "20px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "linear-gradient(135deg, #1B7B3E, #228B45)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(27,123,62,0.25)" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "28px", fontWeight: 700, color: "#0D3B1A", marginBottom: "10px" }}>Welcome to the Irish Tax Assistant</h2>
              <p style={{ fontSize: "15px", color: "#5a7a5a", maxWidth: "500px", margin: "0 auto", lineHeight: "1.6" }}>Ask any question about Irish taxation, Revenue procedures, or ROS. I search revenue.ie in real-time for the most current information.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "32px" }}>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px", border: "1px solid rgba(27,123,62,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>&#128182;</div>
                <div style={{ fontWeight: 600, color: "#0D3B1A", fontSize: "14px" }}>Income Tax and PAYE</div>
                <div style={{ color: "#6a8a6a", fontSize: "13px", marginTop: "2px" }}>Rates, bands, credits and reliefs</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px", border: "1px solid rgba(27,123,62,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>&#127968;</div>
                <div style={{ fontWeight: 600, color: "#0D3B1A", fontSize: "14px" }}>Property Tax</div>
                <div style={{ color: "#6a8a6a", fontSize: "13px", marginTop: "2px" }}>LPT, Stamp Duty, Help to Buy</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px", border: "1px solid rgba(27,123,62,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>&#128203;</div>
                <div style={{ fontWeight: 600, color: "#0D3B1A", fontSize: "14px" }}>ROS and Filing</div>
                <div style={{ color: "#6a8a6a", fontSize: "13px", marginTop: "2px" }}>Register, file and pay online</div>
              </div>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "18px", border: "1px solid rgba(27,123,62,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>&#127970;</div>
                <div style={{ fontWeight: 600, color: "#0D3B1A", fontSize: "14px" }}>Business Tax</div>
                <div style={{ color: "#6a8a6a", fontSize: "13px", marginTop: "2px" }}>VAT, Corporation Tax, Sole Traders</div>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#1B7B3E", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "14px" }}>Popular Questions</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {SUGGESTED_QUESTIONS.map(function(q, i) {
                  return <button key={i} onClick={function() { sendMessage(q); }} style={{ background: "#fff", border: "1px solid rgba(27,123,62,0.15)", borderRadius: "12px", padding: "10px 16px", fontSize: "13px", color: "#1a3a1a", cursor: "pointer", fontFamily: "Source Sans 3, sans-serif", lineHeight: "1.3", textAlign: "left" }}>{q}</button>;
                })}
              </div>
            </div>

            <div style={{ background: "rgba(255, 165, 0, 0.06)", border: "1px solid rgba(255, 165, 0, 0.15)", borderRadius: "12px", padding: "14px 18px", fontSize: "12.5px", color: "#8B6914", lineHeight: "1.5" }}>
              <strong>Disclaimer:</strong> This tool provides general tax information based on revenue.ie content. It is not a substitute for professional tax advice. For complex tax matters, please consult a qualified tax advisor or contact Revenue directly.
            </div>
          </div>
        )}

        {messages.map(function(msg, i) { return <MessageBubble key={i} message={msg} />; })}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px", animation: "fadeSlideIn 0.3s ease-out" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "linear-gradient(135deg, #1B7B3E, #0D5C2B)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(27,123,62,0.3)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <div style={{ background: "#fff", borderRadius: "20px 20px 20px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(27,123,62,0.08)" }}>
              <div style={{ fontSize: "12px", color: "#1B7B3E", marginBottom: "4px", fontWeight: 500 }}>Searching revenue.ie...</div>
              <TypingIndicator />
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "14px", padding: "16px 20px", marginBottom: "16px" }}>
            <p style={{ color: "#B91C1C", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Something went wrong</p>
            <p style={{ color: "#991B1B", fontSize: "13px", lineHeight: "1.5" }}>{error}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "16px 24px 24px", background: "linear-gradient(to top, #f0f7f1, transparent)", position: "sticky", bottom: 0 }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: "16px", border: "2px solid rgba(27,123,62,0.12)", display: "flex", alignItems: "center", padding: "4px 6px 4px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={function(e) { setInput(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask any Irish tax question..."
              disabled={loading}
              style={{ flex: 1, border: "none", fontSize: "15px", fontFamily: "Source Sans 3, sans-serif", color: "#1a2a1a", padding: "12px 0", background: "transparent" }}
            />
            <button
              onClick={function() { sendMessage(input); }}
              disabled={!input.trim() || loading}
              style={{ width: "42px", height: "42px", borderRadius: "12px", border: "none", background: input.trim() && !loading ? "linear-gradient(135deg, #1B7B3E, #228B45)" : "#e0e8e0", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "white" : "#aaa"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: "11px", color: "#8a9a8a", marginTop: "10px" }}>AI-powered tax information from revenue.ie - Not a substitute for professional advice</p>
      </div>
    </div>
  );
}
