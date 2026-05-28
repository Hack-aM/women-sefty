import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Shield, Mic, RotateCcw, AlertTriangle, Lightbulb, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Smart pre-canned responses ─────────────────────────────────────────────
const safetyKnowledge = [
  {
    keywords: ['help', 'emergency', 'danger', 'unsafe', 'scared', 'afraid', 'threat'],
    response: `🚨 **I can hear you're in danger. Here's what to do RIGHT NOW:**

1. **Activate SOS** — Go to the SOS tab and hold the button for 3 seconds
2. **Call 100** (Police) or **1091** (Women Helpline) immediately
3. **Make noise** — Shout, scream, attract attention
4. **Get to a public place** — Shops, restaurants, hospitals
5. **Text your location** to a trusted contact

Your safety is the top priority. Trust your instincts and act NOW. 🛡️`,
  },
  {
    keywords: ['follow', 'followed', 'stalker', 'stalking', 'man following'],
    response: `👁️ **If you think you're being followed:**

1. **Don't go home** — You don't want them to know where you live
2. **Enter a public place** — A mall, hospital, or police station
3. **Call someone** and stay on the line while walking
4. **Change direction 4 times** — if they keep following, it's intentional
5. **Use SafeHer's Live Tracking** — Share your location with a trusted contact now
6. **Dial 100** and describe the person and their clothing

Stay in well-lit, populated areas. 🔒`,
  },
  {
    keywords: ['cab', 'taxi', 'uber', 'ola', 'driver', 'ride'],
    response: `🚗 **Cab Safety Guidelines:**

✅ **Before boarding:**
- Verify car number plate matches the app
- Match driver's photo to the person
- Share ride details with a contact

✅ **During the ride:**
- Sit behind the driver (not directly behind)
- Share live tracking with a trusted contact
- Keep the window slightly open
- Trust the app's GPS — don't deviate from it

✅ **If something feels wrong:**
- Say you're feeling unwell and need to stop
- Call someone and speak loudly about where you are
- Use SafeHer's SOS button immediately

Never hesitate to cancel a ride if something feels off. 🛡️`,
  },
  {
    keywords: ['night', 'late', 'dark', 'alone', 'walking', 'street'],
    response: `🌙 **Walking Alone at Night — Stay Safe:**

1. **Stay in well-lit areas** — avoid shortcuts through dark alleys
2. **Be visible** — wear bright or reflective clothing
3. **Headphones off** — stay aware of your surroundings
4. **Trust your gut** — if something feels wrong, it probably is
5. **Use SafeHer's Live Tracking** — so someone always knows where you are
6. **Keep your phone charged** — always carry a power bank
7. **Know your route** — plan it before you leave
8. **Walk confidently** — don't look at your phone while walking

Share your location with a trusted contact before you start. 💪`,
  },
  {
    keywords: ['self defense', 'self-defense', 'attack', 'attacker', 'hit', 'fight'],
    response: `🥋 **Emergency Self-Defense:**

**Target vulnerable areas:**
- 👁️ **Eyes** — finger jab or thumb press
- 👃 **Nose** — palm strike upward
- 🦵 **Groin** — knee strike
- 🦶 **Feet** — stomp with heel
- 🦵 **Shin** — scrape down hard

**Remember:**
- Make NOISE — shout "FIRE" (attracts more attention than "Help")
- Your goal is to create an opportunity to ESCAPE, not fight
- Run towards lights, people, and noise
- Pepper spray/safety whistle — keep accessible always

Consider enrolling in women's self-defense classes like Krav Maga.`,
  },
  {
    keywords: ['harassment', 'harass', 'eve teasing', 'teasing', 'comments', 'touch'],
    response: `✊ **Dealing with Harassment:**

**In public:**
- Speak loudly and clearly: *"Stop it. This is harassment."*
- Make eye contact — don't look down
- Attract bystanders: *"Excuse me, this man is harassing me. Can you help?"*
- Move to a crowded area immediately

**Document it:**
- Screenshot any digital harassment
- Note time, location, physical description
- Report to police (100) or NCW helpline (7827-170-170)

**Report online:**
- cybercrime.gov.in for online harassment
- Call 1930 for cyber crimes

You have every right to feel safe. Don't ignore it. 💪`,
  },
  {
    keywords: ['tips', 'advice', 'stay safe', 'safety tips', 'precaution'],
    response: `💡 **Top 10 Daily Safety Tips:**

1. 📱 Keep your phone charged above 30% when going out
2. 📍 Share your location with a trusted contact
3. 🔑 Hold keys between fingers as a grip tool if needed
4. 💬 Let someone know your destination and ETA
5. 🚗 Verify your cab details before entering
6. 🌙 Avoid isolated areas after dark
7. 🔊 Trust your instincts — leave any situation that feels wrong
8. 💊 Never leave your drink unattended at social events
9. 🔒 Strong passwords + 2FA on all accounts
10. 🥋 Consider a basic self-defense course

SafeHer's SOS, Live Tracking & Fake Call are always here for you! 🛡️`,
  },
  {
    keywords: ['domestic', 'abuse', 'husband', 'partner', 'family violence', 'violence'],
    response: `❤️ **Domestic Violence Support:**

You are not alone. Help is available.

**Immediate Help:**
- **181** — Domestic Violence Helpline (24/7)
- **1091** — Women Helpline
- **100** — Police emergency

**National Commission for Women:**
- **7827-170-170** — NCW Helpline

**Safety Planning:**
- Pack a bag with essentials (documents, cash, phone charger)
- Identify a safe place you can go (friend/family/shelter)
- Memorize 2-3 important numbers
- Keep SafeHer installed with trusted contacts

**Legal Rights:**
- Protection of Women from Domestic Violence Act 2005
- You can file an FIR or apply for a protection order

Reaching out takes courage. You deserve to be safe. 💖`,
  },
];

const GREETING = `👋 Hi! I'm **SafeHer AI** — your personal safety assistant.

I can help you with:
- 🚨 Emergency guidance
- 🛡️ Self-defense tips  
- 🌙 Staying safe at night
- 🚗 Cab & travel safety
- 💻 Cyber safety advice
- ✊ Handling harassment

What safety topic can I help you with today?`;

const FALLBACK = `I'm here to help with safety-related questions. You can ask me about:

- **Emergency situations** — what to do right now
- **Self-defense** — basic techniques
- **Travel safety** — cabs, night walks
- **Cyber safety** — online privacy
- **Harassment** — how to respond
- **Helpline numbers** — who to call

Try asking: *"What do I do if I'm being followed?"* 🛡️`;

// ── Smart response matching ────────────────────────────────────────────────
const getResponse = (input) => {
  const lower = input.toLowerCase();
  const match = safetyKnowledge.find((item) =>
    item.keywords.some((kw) => lower.includes(kw))
  );
  return match?.response || FALLBACK;
};

// ── Quick prompts ─────────────────────────────────────────────────────────
const quickPrompts = [
  { icon: AlertTriangle, label: "I'm in danger",      prompt: "I'm in danger and need help now" },
  { icon: Shield,        label: 'Being followed',     prompt: "I think someone is following me" },
  { icon: Phone,         label: 'Safety tips',        prompt: "Give me daily safety tips" },
  { icon: Lightbulb,     label: 'Self defense',       prompt: "Teach me basic self-defense techniques" },
];

// ── Message bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isBot = msg.role === 'bot';

  // Simple markdown: bold **text**, numbered lists, bullet points
  const formatText = (text) => {
    return text.split('\n').map((line, i) => {
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i} className="block" dangerouslySetInnerHTML={{ __html: boldLine }} />
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isBot ? 'items-start' : 'items-end flex-row-reverse'}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isBot
            ? 'glass-card rounded-tl-sm text-slate-200'
            : 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm'
        }`}
      >
        {formatText(msg.content)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function AISafety() {
  const { profile, user } = useAuth();
  const name = profile?.displayName || user?.displayName || 'Friend';
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const botResponse = getResponse(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', content: botResponse },
      ]);
      setTyping(false);
    }, 800 + Math.random() * 500);
  };

  const handleReset = () => {
    setMessages([{ id: 1, role: 'bot', content: GREETING }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)', boxShadow: '0 0 20px rgba(236,72,153,0.4)' }}
          >
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-100">AI Safety Assistant</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-slate-500">Always here for you, {name.split(' ')[0]}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset conversation"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
        {quickPrompts.map(({ icon: Icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => sendMessage(prompt)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card text-xs font-medium text-slate-300 hover:border-pink-500/30 hover:text-pink-300 transition-all flex-shrink-0 whitespace-nowrap"
          >
            <Icon size={13} className="text-pink-400" />
            {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} className="text-white" />
            </div>
            <div className="glass-card rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-pink-400"
                    style={{
                      animation: 'pulse 1s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 pb-4 pt-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about safety, emergencies, self-defense…"
              rows={1}
              className="input-field resize-none pr-3 py-3 text-sm leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
              boxShadow: input.trim() ? '0 4px 20px rgba(236,72,153,0.4)' : 'none',
            }}
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-2">
          AI responses are guidance only — always call emergency services in real danger
        </p>
      </div>
    </div>
  );
}
