import { useState, useEffect, useRef, useCallback } from "react";

const TIMELINE = [
  { time: "9:00", title: "Engineering Standup", sub: "" },
  { time: "10:00", title: "Focus time", sub: "" },
  { time: "11:00", title: "1:1 with Sarah", sub: "", active: true },
  { time: "12:00", title: "Architecture Review: Auth...", sub: "Design Review · 6 attendees" },
  { time: "12:00", title: "Developer onboarding tra...", sub: "" },
  { time: "12:20", title: "Sprint planning — checkin", sub: "" },
  { time: "12:30", title: "Platform roadmap FY2...", sub: "Roadmap Review" },
  { time: "12:30", title: "[IMP] Infra Cost Stand...", sub: "" },
  { time: "13:00", title: "[in-person] Team Expe...", sub: "Offsite · All Hands" },
  { time: "13:15", title: "Lunch — Do not block any...", sub: "" },
];

const INIT_TASKS = [
  { id: 1, text: "Review PR #4281 retry logic", done: false },
  { id: 2, text: "Finalize Q2 OKRs", done: false },
  { id: 3, text: "Write postmortem action items", done: false },
  { id: 4, text: "Prepare onboarding for Priya", done: false },
];

const PROMPTS = [
  { icon: "🌅", text: "Give me a morning briefing — calendar, emails, and tasks" },
  { icon: "📋", text: "Prepare me for my next meeting" },
  { icon: "📬", text: "Summarize my top unread emails" },
  { icon: "📁", text: "Search Drive for recent docs and summarize the latest one" },
  { icon: "✅", text: "Show my pending tasks and mark completed ones" },
  { icon: "💬", text: "Reply to the latest email from my team" },
];

const DRIVE_FILES = [
  { name: "Auth Service v2 — Tech Design", time: "10 min ago", icon: "📄", views: 8 },
  { name: "Q2 Sprint Tracker", time: "25 min ago", icon: "📊", views: 12 },
  { name: "Incident Postmortem — Mar 3", time: "1h ago", icon: "📄", views: 5 },
  { name: "Interview Scorecards — Backend", time: "2h ago", icon: "📊", views: 4 },
  { name: "Platform Engineering Roadmap", time: "3h ago", icon: "📑", views: 15 },
  { name: "API Gateway Migration Plan", time: "5h ago", icon: "📄", views: 7 },
];

const INBOX = [
  { subject: "URGENT: Production latency spike on checkout", from: "alerts@monitoring.io", time: "2m", p: "critical" },
  { subject: "Re: Q2 Planning — Final OKRs for review", from: "sarah.chen@company.com", time: "18m", p: "action" },
  { subject: "PR #4281: Refactor payment retry logic", from: "github@notifications.com", time: "45m", p: "reply" },
  { subject: "Weekly Infra Cost Report — March W1", from: "finops@company.com", time: "1h", p: "fyi" },
  { subject: "Team Offsite Venue Options", from: "people-ops@company.com", time: "2h", p: "fyi" },
  { subject: "New hire onboarding: Priya Sharma", from: "hr@company.com", time: "3h", p: "action" },
];

const AI = {
  briefing: "☀️ **Good morning! Here's your briefing for Monday, March 9:**\n\n📅 **Calendar** — 10 meetings today. Next up: 1:1 with Sarah at 11:00 AM.\n\n✉️ **Email highlights** (1,835 unread):\n• 🔴 Production latency spike on checkout flow — 2 min ago\n• 🟡 Q2 Planning — Final OKRs updated by Sarah — 18 min ago\n• 🟡 New hire onboarding: Priya starts Monday — 3h ago\n\n✅ **Tasks** — 4 pending, 2 due today:\n• Review PR #4281 retry logic\n• Write postmortem action items\n\n🎯 **Recommendation:** Handle the production alert first, then prep for your 11:00 1:1.",
  meeting: "📋 **Meeting Prep: 1:1 with Sarah Chen**\n⏰ 11:00 AM · 30 min · Google Meet\n\n**Attendees:** You, Sarah Chen (EM, Platform)\n\n**Linked Docs:**\n• Q2 OKR Draft — last edited 18 min ago\n• Platform Engineering Roadmap — updated 3h ago\n\n**Previous meeting notes (Mar 2):**\n• Auth migration moved to Q3\n• On-call rotation fairness raised\n• Action: You owe promotion feedback for Alex\n\n**Suggested talking points:**\n1. Review Sarah's Q2 OKR changes\n2. Confirm Q3 auth migration timeline\n3. Share Alex promotion recommendation",
  emails: "📬 **Top Unread Emails Summary:**\n\n🔴 **Production latency spike on checkout flow** (2 min ago)\nFrom: alerts@monitoring.io\nP99 latency exceeded 3s on /api/checkout. Auto-scaling triggered but not resolved.\n\n🟡 **Q2 Planning — Final OKRs for review** (18 min ago)\nFrom: sarah.chen@company.com\nUpdated shared doc with revised targets. Key change: auth migration moved to Q3.\n\n🟡 **PR #4281: Refactor payment retry logic** (45 min ago)\nFrom: github notifications\nAlex commented: \"Could we add exponential backoff?\"\n\n📊 **Summary:** 3 urgent, 12 need reply, 47 FYI, 1,773 newsletters.",
  drive: "📁 **Recent Drive Activity:**\n\n**Most Active (last 24h):**\n1. 📄 Auth Service v2 — Tech Design (8 viewers, edited 10m ago)\n2. 📊 Q2 Sprint Tracker (12 viewers, edited 25m ago)\n3. 📄 Incident Postmortem — Mar 3 (5 viewers, edited 1h ago)\n\n**Shared with you recently:**\n• 📑 Platform Engineering Roadmap — 15 viewers\n• 📊 Interview Scorecards — Backend hiring, 4 viewers\n\n**Storage:** 12.4 GB of 15 GB used (82%)",
  tasks: "✅ **Your Pending Tasks:**\n\n**Due Today:**\n☐ Review PR #4281 retry logic\n☐ Write postmortem action items\n\n**Due This Week:**\n☐ Finalize Q2 OKRs (Tomorrow)\n☐ Prepare onboarding for Priya (Friday)\n\n**Recently Completed:**\n✓ Submit expense report (Mar 7)\n✓ Update team wiki (Mar 6)\n\nWould you like me to mark any as done?",
  reply: "💬 **Latest team email thread:**\n\n**Subject:** Re: Q2 Planning — Final OKRs for review\n**From:** sarah.chen@company.com (18 min ago)\n\nSarah updated the OKR doc. Here's a draft reply:\n\n---\n*Hi Sarah,*\n\n*Thanks for updating the OKRs. Moving auth migration to Q3 makes sense. I have a few comments on platform reliability targets — will add to the doc before tomorrow's sync.*\n\n*Quick question: should we keep the original stretch goal for API latency?*\n\n*— [Your name]*\n---\n\nWant me to send this, edit it, or draft something different?",
  fallback: "I searched across your Google Workspace:\n\n📊 3 relevant documents in Drive\n✉️ 5 related email threads\n📅 2 upcoming calendar events\n\nWould you like me to dive deeper into any of these?"
};

const emailVol = [42, 68, 55, 78, 91, 35, 22];
const meetHrs = [12, 8, 6, 9];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WKS = ["W1","W2","W3","W4"];
const pDot = { critical:"bg-red-500", action:"bg-amber-400", reply:"bg-blue-400", fyi:"bg-emerald-400" };

function Spark({ data, labels, color="#3B82F6", w=170, h=44 }) {
  const mx=Math.max(...data), mn=Math.min(...data), r=mx-mn||1;
  const pts=data.map((v,i)=>[i/(data.length-1)*w, h-((v-mn)/r)*(h-8)-4]);
  const d=pts.map((p,i)=>`${i?"L":"M"}${p[0]} ${p[1]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h+14}`} className="w-full" style={{height:h+14}}>
      <defs><linearGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".15"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#g${color.slice(1)})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={i===pts.length-2?3:0} fill={color}/>)}
      {labels?.map((l,i)=><text key={i} x={pts[i]?.[0]} y={h+12} textAnchor="middle" fill="#4B6584" fontSize="8">{l}</text>)}
    </svg>
  );
}

function IconBar({ page, setPage }) {
  const items=[{id:"chat",d:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"},{id:"calendar",d:"M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z M16 2v4 M8 2v4 M3 10h18"},{id:"drive",d:"M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"},{id:"mail",d:"M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z M22 7l-10 6L2 7"},{id:"tasks",d:"M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"}];
  return (
    <div className="w-11 shrink-0 bg-[#080D1A] flex flex-col items-center py-3 gap-1.5 border-r border-[#162240]">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      </div>
      {items.map(it=>(
        <button key={it.id} onClick={()=>setPage(it.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${page===it.id?"bg-blue-500/15 text-blue-400":"text-[#3A5575] hover:text-[#80A4C4] hover:bg-white/5"}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{it.d.split(" M").map((s,i)=><path key={i} d={`${i?"M":""}${s}`}/>)}</svg>
        </button>
      ))}
      <div className="mt-auto w-2.5 h-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/50"/>
    </div>
  );
}

function LeftSide({ tasks, toggle }) {
  const pending = tasks.filter(t=>!t.done).length;
  return (
    <div className="w-[210px] shrink-0 bg-[#0C1322] border-r border-[#162240] flex flex-col overflow-y-auto">
      <div className="p-3 pb-1">
        <div className="text-[10px] font-bold text-blue-400 tracking-[.18em] uppercase">WorkspaceOS</div>
        <div className="text-[13px] font-semibold text-white/90 mt-0.5">Mon, 9 Mar</div>
      </div>
      <div className="px-3 pb-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[{v:10,l:"meetings",c:""},{v:1835,l:"unread",c:"text-yellow-400"},{v:pending,l:"tasks",c:"text-emerald-400"}].map(m=>(
            <div key={m.l} className="flex flex-col items-center py-2 rounded-lg bg-[#101B2D] border border-[#18293F]">
              <span className={`text-base font-bold tabular-nums ${m.c||"text-white"}`}>{m.v}</span>
              <span className="text-[8px] text-[#4B6584]">{m.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-1"><span className="text-[10px]">📅</span><span className="text-[10px] font-semibold text-white/90">Today's Timeline</span></div><span className="text-[7px] font-bold text-[#3A5575] uppercase tracking-wider">Calendar</span></div>
        <div className="bg-[#101B2D] rounded-lg border border-[#18293F] overflow-hidden">
          <div className="px-2 py-1 border-b border-[#18293F] text-[9px] text-[#4B6584]">📍 Office</div>
          <div className="max-h-[195px] overflow-y-auto divide-y divide-[#18293F]/50">
            {TIMELINE.map((e,i)=>(
              <div key={i} className={`flex gap-2 px-2 py-1.5 hover:bg-white/[.02] cursor-default ${e.active?"bg-blue-500/[.06]":""}`}>
                <span className="text-[9px] text-[#4B6584] tabular-nums w-8 shrink-0">{e.time}</span>
                <div className="min-w-0">
                  <div className={`text-[9px] truncate ${e.active?"text-blue-300 font-medium":"text-[#6B8AAE]"}`}>{e.title}</div>
                  {e.sub&&<div className="text-[8px] text-[#2F4A6A] truncate">{e.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-1"><span className="text-[10px]">✅</span><span className="text-[10px] font-semibold text-white/90">Pending Tasks</span></div><span className="text-[7px] font-bold text-[#3A5575] uppercase tracking-wider">Tasks</span></div>
        <div className="bg-[#101B2D] rounded-lg border border-[#18293F] p-2 space-y-1.5">
          {pending===0?<p className="text-[9px] text-[#4B6584] text-center py-1">No pending tasks 🎉</p>:
          tasks.map(t=>(
            <div key={t.id} className="flex items-start gap-1.5 cursor-pointer group" onClick={()=>toggle(t.id)}>
              <div className={`w-3 h-3 mt-0.5 rounded border-[1.5px] shrink-0 flex items-center justify-center transition-all ${t.done?"bg-emerald-500/30 border-emerald-500":"border-[#2B4060] group-hover:border-blue-400"}`}>
                {t.done&&<svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span className={`text-[9px] leading-tight ${t.done?"line-through text-[#2F4A6A]":"text-[#6B8AAE]"}`}>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 pb-2 mt-auto">
        <div className="text-[7px] font-bold text-[#3A5575] uppercase tracking-[.18em] mb-1">Quick Actions</div>
        {[{i:"📬",l:"Check unread emails"},{i:"📅",l:"Tomorrow's schedule"},{i:"🌅",l:"Morning briefing"},{i:"📁",l:"Recent Drive files"}].map((a,j)=>(
          <button key={j} className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-[9px] text-blue-300/90 hover:bg-blue-500/[.08] transition-all text-left"><span>{a.i}</span><span>{a.l}</span></button>
        ))}
      </div>
    </div>
  );
}

function Chat({ messages, onSend, typing }) {
  const [input,setInput]=useState("");
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages,typing]);
  const go=()=>{if(input.trim()&&!typing){onSend(input.trim());setInput("");}};
  const fmt=s=>s.split("\n").map((ln,i)=>{
    let h=ln.replace(/\*\*(.+?)\*\*/g,'<b class="text-white/95">$1</b>');
    h=h.replace(/^• /,'<span class="text-blue-400 mr-1">•</span>');
    h=h.replace(/^(\d+)\. /,'<span class="text-blue-400 mr-1">$1.</span>');
    return <p key={i} className={!ln?"h-1":""} dangerouslySetInnerHTML={{__html:h||"&nbsp;"}}/>;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B1120] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {messages.length===0&&!typing?(
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0B1120]"/>
            </div>
            <h1 className="text-lg font-bold text-white mb-0.5">WorkspaceOS</h1>
            <p className="text-[11px] text-[#6B8AAE] mb-0.5">Your AI-powered Google Workspace cockpit.</p>
            <p className="text-[10px] text-[#3A5575] mb-7">All data is sourced directly — never fabricated.</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {PROMPTS.map((c,i)=>(
                <button key={i} onClick={()=>onSend(c.text)} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#101B2D] border border-[#18293F] hover:border-blue-500/30 hover:bg-[#122035] transition-all text-left group">
                  <span className="text-sm mt-0.5 shrink-0">{c.icon}</span>
                  <span className="text-[10px] text-[#6B8AAE] leading-relaxed group-hover:text-[#9AB8D4] transition-colors">{c.text}</span>
                </button>
              ))}
            </div>
          </div>
        ):(
          <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
            {messages.map((m,i)=>(
              <div key={i} className={`flex gap-2 ${m.role==="user"?"justify-end":""}`}>
                {m.role==="assistant"&&<div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow shadow-blue-500/20"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>}
                <div className="max-w-[88%]">
                  <div className={`rounded-xl px-3 py-2 ${m.role==="user"?"bg-blue-600 text-white":"bg-[#101B2D] border border-[#18293F] text-[#9AB8D4]"}`}>
                    <div className="text-[11px] leading-[1.7] space-y-0.5">{m.role==="assistant"?fmt(m.content):m.content}</div>
                  </div>
                  <div className="text-[8px] text-[#1E3350] mt-0.5 px-0.5">{m.time}</div>
                </div>
              </div>
            ))}
            {typing&&<div className="flex gap-2"><div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow shadow-blue-500/20"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div className="bg-[#101B2D] border border-[#18293F] rounded-xl px-3 py-2.5 flex gap-1">{[0,150,300].map(d=><div key={d} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div>}
            <div ref={endRef}/>
          </div>
        )}
      </div>
      <div className="px-4 pb-3 pt-1">
        <div className="max-w-lg mx-auto flex items-center gap-2 bg-[#101B2D] border border-[#18293F] rounded-xl px-3 py-1.5 focus-within:border-blue-500/40 transition-colors">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Ask about Gmail, Calendar, Drive, Tasks..." className="flex-1 bg-transparent text-[11px] text-[#9AB8D4] placeholder-[#263C58] outline-none"/>
          <button onClick={go} disabled={!input.trim()||typing} className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${input.trim()&&!typing?"bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/25":"bg-[#18293F] text-[#263C58]"}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <p className="text-[8px] text-[#162240] text-center mt-1">Powered by WorkspaceOS · Data sourced directly from Google Workspace</p>
      </div>
    </div>
  );
}

function RightSide({ tasksDone, total }) {
  const [tab,setTab]=useState("analytics");
  const pending=total-tasksDone;
  return (
    <div className="w-[210px] shrink-0 bg-[#0C1322] border-l border-[#162240] flex flex-col overflow-y-auto">
      <div className="flex items-center gap-0.5 px-2 pt-3 pb-2">
        {[{id:"analytics",i:"📊",l:"Analytics"},{id:"drive",i:"📁",l:"Drive"},{id:"inbox",i:"📬",l:"Inbox"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold transition-all ${tab===t.id?"text-blue-400 bg-blue-500/10":"text-[#3A5575] hover:text-[#6B8AAE] hover:bg-white/[.03]"}`}>
            <span className="text-[9px]">{t.i}</span><span>{t.l}</span>
          </button>
        ))}
      </div>
      {tab==="analytics"&&(
        <div className="px-2 space-y-2 pb-3">
          <div className="bg-[#101B2D] rounded-lg border border-[#18293F] p-2.5">
            <div className="flex justify-between items-center mb-1.5"><span className="text-[10px] font-semibold text-white/90">Email Volume (This Week)</span><span className="text-[8px] text-[#3A5575]">Approx.</span></div>
            <Spark data={emailVol} labels={DOW}/>
          </div>
          <div className="bg-[#101B2D] rounded-lg border border-[#18293F] p-2.5">
            <div className="flex justify-between items-center mb-1.5"><span className="text-[10px] font-semibold text-white/90">Meeting Load (hrs/week)</span><span className="text-[8px] text-[#3A5575]">4 weeks</span></div>
            <Spark data={meetHrs} labels={WKS}/>
          </div>
          <div className="bg-[#101B2D] rounded-lg border border-[#18293F] p-2.5">
            <div className="text-[10px] font-semibold text-white/90 mb-2">Live Stats</div>
            {[{l:"Unread emails",v:"1,835",c:"#F59E0B"},{l:"Meetings today",v:"10",c:"#3B82F6"},{l:"Pending tasks",v:String(pending),c:"#22C55E"}].map((s,i)=>(
              <div key={i} className="flex justify-between items-center py-0.5">
                <span className="text-[9px] text-[#4B6584]">{s.l}</span>
                <span className="text-[12px] font-bold tabular-nums" style={{color:s.c}}>{s.v}</span>
              </div>
            ))}
          </div>
          <button className="w-full text-center text-[10px] font-semibold text-blue-400 hover:text-blue-300 py-1 transition-colors">Get full briefing →</button>
        </div>
      )}
      {tab==="drive"&&(
        <div className="px-2 pb-3">
          <div className="text-[9px] text-[#3A5575] mb-1.5">Recent Files</div>
          {DRIVE_FILES.map((f,i)=>(
            <div key={i} className="flex items-center gap-1.5 p-1.5 rounded hover:bg-white/[.03] cursor-pointer">
              <span className="text-xs">{f.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] text-[#6B8AAE] truncate">{f.name}</div>
                <div className="text-[8px] text-[#2F4A6A]">{f.time} · {f.views} viewers</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==="inbox"&&(
        <div className="px-2 pb-3">
          <div className="text-[9px] text-[#3A5575] mb-1.5">Priority Inbox</div>
          {INBOX.map((e,i)=>(
            <div key={i} className="flex items-start gap-1.5 p-1.5 rounded hover:bg-white/[.03] cursor-pointer">
              <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${pDot[e.p]}`}/>
              <div className="min-w-0">
                <div className="text-[9px] text-[#6B8AAE] truncate font-medium">{e.subject}</div>
                <div className="text-[8px] text-[#2F4A6A] truncate">{e.from} · {e.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("chat");
  const [tasks,setTasks]=useState(INIT_TASKS);
  const [msgs,setMsgs]=useState([]);
  const [typing,setTyping]=useState(false);
  const toggle=id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const send=useCallback(text=>{
    const now=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    setMsgs(p=>[...p,{role:"user",content:text,time:now}]);
    setTyping(true);
    setTimeout(()=>{
      const l=text.toLowerCase();
      let r=AI.fallback;
      if(l.includes("morning")||l.includes("briefing"))r=AI.briefing;
      else if(l.includes("meeting")||l.includes("prep")||l.includes("next"))r=AI.meeting;
      else if(l.includes("unread")||l.includes("email")||l.includes("summarize"))r=AI.emails;
      else if(l.includes("drive")||l.includes("doc")||l.includes("search"))r=AI.drive;
      else if(l.includes("task")||l.includes("pending")||l.includes("completed"))r=AI.tasks;
      else if(l.includes("reply")||l.includes("latest")||l.includes("team"))r=AI.reply;
      setTyping(false);
      const t2=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
      setMsgs(p=>[...p,{role:"assistant",content:r,time:t2}]);
    },1200+Math.random()*800);
  },[]);
  const done=tasks.filter(t=>t.done).length;
  return (
    <div className="h-screen flex bg-[#0B1120] text-white overflow-hidden" style={{fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <IconBar page={page} setPage={setPage}/>
      <LeftSide tasks={tasks} toggle={toggle}/>
      <Chat messages={msgs} onSend={send} typing={typing}/>
      <RightSide tasksDone={done} total={tasks.length}/>
    </div>
  );
}
