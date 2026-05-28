import { useState } from 'react';
import { Shield, Smartphone, Globe, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';

const categories = [
  {
    id: 'self-defense',
    icon: Shield,
    label: 'Self Defense',
    color: 'from-red-500 to-rose-600',
    tips: [
      { title: 'Stay Aware', desc: 'Always be aware of your surroundings. Avoid using phone while walking alone at night.' },
      { title: 'Trust Your Instincts', desc: 'If something feels wrong, it probably is. Leave the situation immediately.' },
      { title: 'Target Vulnerable Areas', desc: 'In danger: eyes, nose, throat, groin are most sensitive areas. Use palm strikes.' },
      { title: 'Make Noise', desc: 'Scream loudly. Attract attention. Attackers fear witnesses and public attention.' },
      { title: 'Carry Defense Tools', desc: 'Pepper spray, safety whistle, or sharp keychain. Keep it accessible at all times.' },
      { title: 'Self Defense Classes', desc: 'Enroll in basic self-defense training like Krav Maga or women\'s self-defense workshops.' },
    ],
  },
  {
    id: 'cyber-safety',
    icon: Smartphone,
    label: 'Cyber Safety',
    color: 'from-blue-500 to-indigo-600',
    tips: [
      { title: 'Strong Passwords', desc: 'Use unique passwords for each account. Enable 2-factor authentication everywhere.' },
      { title: 'Beware Phishing', desc: 'Never click suspicious links from unknown numbers or emails. Verify sender identity.' },
      { title: 'Privacy Settings', desc: 'Review social media privacy settings. Avoid sharing location in public posts.' },
      { title: 'Cyberbullying', desc: 'Screenshot and report harassment. Block the person immediately. Contact cyber cell (1930).' },
      { title: 'Protect Your Photos', desc: 'Never share intimate photos digitally. Once shared, you lose control forever.' },
      { title: 'Secure Your Phone', desc: 'Use screen lock. Encrypt data. Install reputable security apps only.' },
    ],
  },
  {
    id: 'travel-safety',
    icon: Navigation,
    label: 'Travel Safety',
    color: 'from-emerald-500 to-teal-600',
    tips: [
      { title: 'Share Itinerary', desc: 'Always tell someone trusted where you are going and expected return time.' },
      { title: 'Verify Cab Details', desc: 'Match car number and driver photo before entering. Use only trusted apps.' },
      { title: 'Sit Behind Driver', desc: 'In shared cabs, sit on driver-side rear for easier if needed.' },
      { title: 'Avoid Empty Areas', desc: 'Stay on well-lit, populated streets. Avoid shortcuts through isolated areas after dark.' },
      { title: 'Emergency Numbers Ready', desc: 'Save Women Helpline (1091) and local police on speed dial before traveling.' },
      { title: 'Charge Your Phone', desc: 'Always travel with a charged phone and carry a power bank as backup.' },
    ],
  },
  {
    id: 'digital-safety',
    icon: Globe,
    label: 'Digital Safety',
    color: 'from-purple-500 to-violet-600',
    tips: [
      { title: 'Social Media Caution', desc: 'Don\'t accept requests from strangers. Review tagged posts before they appear on profile.' },
      { title: 'Online Dating Safety', desc: 'Meet in public places first. Tell a friend. Don\'t share personal address too soon.' },
      { title: 'Location Sharing', desc: 'Only share live location with trusted contacts. Disable location on social media apps.' },
      { title: 'Backup Important Data', desc: 'Keep backups of important documents, contacts, and media on secure cloud storage.' },
      { title: 'Report Online Abuse', desc: 'Use platform reporting tools. File complaint at cybercrime.gov.in or call 1930.' },
      { title: 'Secure Wi-Fi', desc: 'Avoid banking or sensitive activities on public Wi-Fi. Use VPN when needed.' },
    ],
  },
];

function TipAccordion({ tip }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`glass-card overflow-hidden transition-all cursor-pointer ${open ? 'border-pink-500/20' : ''}`}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between p-4">
        <p className="text-sm font-semibold text-slate-200">{tip.title}</p>
        {open ? <ChevronUp size={16} className="text-pink-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
      </div>
      <>
        {open && (
          <div
            className="px-4 pb-4"
          >
            <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
          </div>
        )}
      </>
    </div>
  );
}

export default function SafetyTips() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  return (
    <div className="px-4 pt-4 pb-6 space-y-5 max-w-2xl mx-auto lg:pt-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-100">Safety Tips</h1>
        <p className="text-slate-400 text-sm mt-1">Practical guidance to stay safe every day</p>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory.id === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                isActive ? 'border-pink-500/40' : 'hover:border-white/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center ${isActive ? 'shadow-glow-pink' : ''}`}>
                <Icon size={18} className="text-white" />
              </div>
              <span className={`text-xs font-semibold text-center ${isActive ? 'text-pink-400' : 'text-slate-400'}`}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tips accordion */}
      <>
        <div
          key={activeCategory.id}
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold text-slate-400 mb-3">{activeCategory.tips.length} tips in {activeCategory.label}</h3>
          {activeCategory.tips.map((tip, i) => (
            <TipAccordion key={i} tip={tip} />
          ))}
        </div>
      </>

      {/* Bottom tip */}
      <GlassCard className="border-pink-500/20 text-center">
        <p className="text-xs text-slate-400">💖 Stay prepared, stay confident — your safety is our priority</p>
      </GlassCard>
    </div>
  );
}
