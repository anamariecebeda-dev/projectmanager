import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from "react";
import {
  LayoutDashboard, FolderKanban, ListChecks, Timer, CalendarDays, Receipt,
  StickyNote, LayoutTemplate, Users, Settings as SettingsIcon, Plus, Play,
  Square, Trash2, X, Pencil, ChevronLeft, ChevronRight, Check, Paperclip,
  GripVertical, Circle, Briefcase, Zap, AlertTriangle, DollarSign, Search,
  Eye, ChevronDown, Copy, Download, Upload, Clock3, CheckCircle2
} from "lucide-react";
import { supabase, loadDoc, saveDoc } from "./lib/supabase";

/* ============================ palette + globals ============================ */
const C = {
  app: "#EAF2F8", surface: "#FFFFFF", mist: "#F4F9FC", soft: "#D4E6F1",
  line: "#D8E7F2", tintA: "#A9CCE3", tintB: "#7FB3D5", primary: "#5499C7",
  primaryDeep: "#3D82B4", ink: "#1E3A52", ink2: "#3A5B78", muted: "#7591A8",
  warn: "#E08A3C", warnBg: "#FBEEDD", good: "#4F9D8C", danger: "#D96B6B",
};

const CSS = `
:root{--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;--mono:ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace}
*{box-sizing:border-box}
.cd-root{font-family:var(--sans);color:${C.ink};background:${C.app};min-height:100vh;-webkit-font-smoothing:antialiased}
.cd-root *::-webkit-scrollbar{width:10px;height:10px}
.cd-root *::-webkit-scrollbar-thumb{background:${C.tintA};border-radius:20px;border:2px solid ${C.app}}
.cd-root *::-webkit-scrollbar-track{background:transparent}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.btn{font-family:var(--sans);font-size:13px;font-weight:600;border:1px solid ${C.line};background:${C.surface};color:${C.ink2};padding:8px 13px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .13s;line-height:1;white-space:nowrap}
.btn:hover{background:${C.mist};border-color:${C.tintB}}
.btn:focus-visible{outline:2px solid ${C.primary};outline-offset:2px}
.btn-p{background:${C.primary};border-color:${C.primary};color:#fff}
.btn-p:hover{background:${C.primaryDeep};border-color:${C.primaryDeep}}
.btn-d{color:${C.danger};border-color:#EBCACA}
.btn-d:hover{background:#FBEDED;border-color:${C.danger}}
.btn-sm{padding:5px 9px;font-size:12px;border-radius:8px}
.btn-icn{padding:7px;border-radius:8px}
.inp{font-family:var(--sans);font-size:13.5px;color:${C.ink};background:${C.surface};border:1px solid ${C.line};border-radius:9px;padding:9px 11px;width:100%;transition:border .13s}
.inp:focus{outline:none;border-color:${C.primary};box-shadow:0 0 0 3px rgba(84,153,199,.14)}
.inp::placeholder{color:${C.muted}}
textarea.inp{resize:vertical;min-height:64px;line-height:1.5}
.card{background:${C.surface};border:1px solid ${C.line};border-radius:14px}
.lbl{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.muted};margin-bottom:6px;display:block}
.nav{display:flex;align-items:center;gap:11px;padding:9px 12px;border-radius:10px;cursor:pointer;color:${C.ink2};font-size:13.5px;font-weight:600;transition:all .12s;border:1px solid transparent}
.nav:hover{background:${C.mist}}
.nav.on{background:${C.primary};color:#fff}
.nav.on svg{color:#fff}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:20px;line-height:1.4}
.tab{font-size:13px;font-weight:600;color:${C.muted};padding:8px 3px;cursor:pointer;border-bottom:2px solid transparent;transition:all .12s;white-space:nowrap}
.tab:hover{color:${C.ink2}}
.tab.on{color:${C.primary};border-bottom-color:${C.primary}}
.ov{position:fixed;inset:0;background:rgba(30,58,82,.4);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;z-index:60;overflow-y:auto}
.modal{background:${C.surface};border-radius:18px;width:100%;box-shadow:0 30px 70px -20px rgba(30,58,82,.5);animation:pop .18s ease}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
.livedot{width:8px;height:8px;border-radius:50%;background:${C.warn};box-shadow:0 0 0 0 rgba(224,138,60,.5);animation:pulse 1.6s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(224,138,60,.5)}70%{box-shadow:0 0 0 9px rgba(224,138,60,0)}100%{box-shadow:0 0 0 0 rgba(224,138,60,0)}}
.rowh:hover{background:${C.mist}}
.link{color:${C.primary};cursor:pointer;font-weight:600}
.link:hover{text-decoration:underline}
input[type=checkbox]{accent-color:${C.primary};width:16px;height:16px;cursor:pointer}
input[type=radio]{accent-color:${C.primary};cursor:pointer}
.smallcap{font-size:11px;color:${C.muted}}
`;

/* ============================ storage (Supabase-backed, see ./lib/supabase) ============================ */

/* ============================ helpers ============================ */
const uid = () => Math.random().toString(36).slice(2,10);
const pad = (n) => String(n).padStart(2,"0");
const DOW = ["sun","mon","tue","wed","thu","fri","sat"];
const DOW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fmtDur = (sec) => { sec=Math.max(0,Math.floor(sec)); return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`; };
const fmtDate = (iso) => { if(!iso) return ""; const d=new Date(iso+"T00:00:00"); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
const fmtDateShort = (iso) => { if(!iso) return ""; const d=new Date(iso+"T00:00:00"); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const hmNow = () => { const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function durSec(start,end){ if(!start||!end) return 0; const [a,b]=start.split(":").map(Number); const [c,e]=end.split(":").map(Number); let s=((c*60+e)-(a*60+b))*60; if(s<0)s+=86400; return s; }
function weekWindow(startDay){ const now=new Date(); now.setHours(0,0,0,0); const diff=(now.getDay()-startDay+7)%7; const start=new Date(now); start.setDate(now.getDate()-diff); const end=new Date(start); end.setDate(start.getDate()+7); return {start,end}; }
const inWin = (iso,w) => { const d=new Date(iso+"T00:00:00"); return d>=w.start && d<w.end; };
function downloadJSON(obj,name){ const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }

const seed = () => ({
  workspaces:[{id:"w1",name:"My Studio"}],
  activeWs:"w1",
  users:[{id:"owner",name:"Me (Owner)",role:"owner",color:C.primary,ws:["w1"]}],
  viewAs:"owner",
  projects:[], tasks:[], entries:[], notes:[], templates:[], invoices:[],
  invNo:1,
  difficulties:[
    {id:"df1",label:"Easy",color:"#4F9D8C"},
    {id:"df2",label:"Medium",color:"#E0A33D"},
    {id:"df3",label:"Hard",color:"#D96B6B"},
  ],
  statuses:[
    {id:"st1",label:"Not Started"},
    {id:"st2",label:"In Progress"},
    {id:"st3",label:"Outstanding"},
    {id:"st4",label:"Completed"},
  ],
  settings:{ weeklyHours:40, weekStartDay:1, workDays:["mon","tue","wed","thu","fri"], currency:"$", rate:0 },
  timer:null,
});

/* ============================ context ============================ */
const Ctx = createContext(null);
const useDB = () => useContext(Ctx);

/* ============================ tiny ui ============================ */
function Modal({ title, onClose, children, w=560, foot }){
  return (
    <div className="ov" onMouseDown={onClose}>
      <div className="modal" style={{maxWidth:w}} onMouseDown={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px",borderBottom:`1px solid ${C.line}`}}>
          <div style={{fontSize:16,fontWeight:800,color:C.ink}}>{title}</div>
          <button className="btn btn-icn" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>
        <div style={{padding:22,maxHeight:"66vh",overflowY:"auto"}}>{children}</div>
        {foot && <div style={{padding:"14px 22px",borderTop:`1px solid ${C.line}`,display:"flex",justifyContent:"flex-end",gap:10}}>{foot}</div>}
      </div>
    </div>
  );
}
function Empty({icon,title,sub,action}){
  return (
    <div className="card" style={{padding:"52px 24px",textAlign:"center",display:"grid",placeItems:"center",gap:6}}>
      <div style={{width:52,height:52,borderRadius:14,background:C.mist,display:"grid",placeItems:"center",color:C.tintB,marginBottom:6}}>{icon}</div>
      <div style={{fontWeight:800,fontSize:15}}>{title}</div>
      <div style={{color:C.muted,fontSize:13,maxWidth:360}}>{sub}</div>
      {action && <div style={{marginTop:10}}>{action}</div>}
    </div>
  );
}
function Bar({value,color=C.primary,h=8,bg=C.soft}){
  return <div style={{background:bg,height:h,borderRadius:20,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",background:color,borderRadius:20,transition:"width .3s"}}/>
  </div>;
}

/* ============================ derived selectors ============================ */
function useScope(){
  const { db } = useDB();
  const me = db.users.find(u=>u.id===db.viewAs) || db.users[0];
  const isOwner = me.role==="owner";
  // workspace list visible to current view
  const wsList = isOwner ? db.workspaces : db.workspaces.filter(w=>me.ws.includes(w.id));
  const activeWs = wsList.find(w=>w.id===db.activeWs) ? db.activeWs : (wsList[0]?.id || db.activeWs);
  const projects = db.projects.filter(p=>p.ws===activeWs);
  let tasks = db.tasks.filter(t=>t.ws===activeWs);
  if(!isOwner) tasks = tasks.filter(t=>t.assignee===me.id);
  const projTasks = (pid)=> tasks.filter(t=>t.project===pid);
  const completedLabel = db.statuses.find(s=>/complete/i.test(s.label))?.label || "Completed";
  const isDone = (t)=> t.status===completedLabel;
  const projStats = (pid)=>{ const ts=projTasks(pid); const done=ts.filter(isDone).length; return {total:ts.length,done,pct:ts.length?Math.round(done/ts.length*100):0}; };
  const projFinished = (p)=>{ if(p.archived) return true; const s=projStats(p.id); return s.total>0 && s.done===s.total; };
  return { me,isOwner,wsList,activeWs,projects,tasks,projTasks,isDone,projStats,projFinished,completedLabel };
}

/* ============================ Dashboard ============================ */
function Dashboard({ now, go }){
  const { db, update } = useDB();
  const { projects, tasks, projStats, projFinished, isDone } = useScope();
  const [taskOpen,setTaskOpen]=useState(null);
  const startTimer=(taskId)=>update(d=>{ if(d.timer){ const t=d.timer; const end=new Date(); const sec=Math.floor((end.getTime()-new Date(t.startedAt).getTime())/1000); const tk=d.tasks.find(x=>x.id===t.taskId); d.entries.unshift({id:uid(),taskId:t.taskId,taskName:tk?tk.name:"(task)",project:tk?tk.project:null,ws:tk?tk.ws:d.activeWs,date:t.date,start:t.startHM,end:pad(end.getHours())+":"+pad(end.getMinutes()),durationSec:sec,billed:false}); } const nw=new Date(); d.timer={taskId,startedAt:nw.toISOString(),date:todayISO(),startHM:pad(nw.getHours())+":"+pad(nw.getMinutes())}; });
  const s = db.settings;
  const win = weekWindow(s.weekStartDay);

  const loggedSec = useMemo(()=> db.entries.filter(e=>inWin(e.date,win)).reduce((a,e)=>a+e.durationSec,0), [db.entries, s.weekStartDay]);
  const runningExtra = db.timer ? Math.floor((now - new Date(db.timer.startedAt).getTime())/1000) : 0;
  const totalSec = loggedSec + (db.timer && inWin(db.timer.date,win) ? runningExtra : 0);
  const targetSec = s.weeklyHours*3600;
  const leftSec = targetSec - totalSec;
  const pct = Math.min(100, totalSec/targetSec*100);

  const runningTask = db.timer ? db.tasks.find(t=>t.id===db.timer.taskId) : null;
  const today = todayISO();
  const todays = tasks.filter(t=>t.date===today && !isDone(t));
  const active = projects.filter(p=>!projFinished(p));

  const dObj = new Date(now);
  const dateStr = `${DOW_FULL[dObj.getDay()]}, ${MON[dObj.getMonth()]} ${dObj.getDate()}, ${dObj.getFullYear()}`;

  const stop = ()=> update(d=>{
    const t=d.timer; if(!t) return;
    const end=new Date(); const sec=Math.floor((end.getTime()-new Date(t.startedAt).getTime())/1000);
    const tk=d.tasks.find(x=>x.id===t.taskId);
    d.entries.unshift({ id:uid(), taskId:t.taskId, taskName:tk?tk.name:"(task)", project:tk?tk.project:null, ws:tk?tk.ws:d.activeWs,
      date:t.date, start:t.startHM, end:`${pad(end.getHours())}:${pad(end.getMinutes())}`, durationSec:sec, billed:false });
    d.timer=null;
  });

  return (
    <div style={{display:"grid",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:8}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Dashboard</h2>
        <div className="smallcap">{dateStr}</div>
      </div>

      {/* week fuel hero — the number ticks down live while a timer runs */}
      <div className="card" style={{padding:24,background:`linear-gradient(140deg,${C.ink} 0%,${C.primaryDeep} 100%)`,color:"#fff",border:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase",opacity:.8}}>This week's fuel</div>
          <div style={{fontSize:12,opacity:.75}}>Goal {s.weeklyHours}h · resets {DOW_FULL[s.weekStartDay]}</div>
        </div>
        <div style={{display:"flex",alignItems:"baseline",gap:12,margin:"16px 0 12px",flexWrap:"wrap"}}>
          <div className="mono" style={{fontSize:46,fontWeight:700,lineHeight:1,letterSpacing:"-.02em"}}>{fmtDur(Math.abs(leftSec))}</div>
          <div style={{fontSize:14,fontWeight:700,opacity:.85}}>{leftSec<0?"over your goal":"left to work this week"}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.22)",height:10,borderRadius:20,overflow:"hidden"}}>
          <div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:pct>=100?C.good:"#fff",borderRadius:20,transition:"width .3s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:9,fontSize:12,opacity:.85}}>
          <span>{fmtDur(totalSec)} logged</span><span>{Math.round(pct)}% of goal</span>
        </div>
      </div>

      {/* running task */}
      <div className="card" style={{padding:18,display:"flex",alignItems:"center",gap:16,
        borderColor:db.timer?C.warn:C.line, background:db.timer?C.warnBg:C.surface}}>
        {db.timer ? (<>
          <span className="livedot"/>
          <div style={{flex:1}}>
            <div className="smallcap" style={{color:C.warn,fontWeight:800}}>NOW RUNNING</div>
            <div style={{fontWeight:800,fontSize:15,marginTop:2}}>{runningTask?runningTask.name:"Task"}</div>
          </div>
          <div className="mono" style={{fontSize:28,fontWeight:700,color:C.ink}}>{fmtDur(runningExtra)}</div>
          <button className="btn btn-d" onClick={stop}><Square size={14}/> Stop</button>
        </>) : (<>
          <div style={{width:32,height:32,borderRadius:9,background:C.mist,display:"grid",placeItems:"center",color:C.tintB}}><Timer size={17}/></div>
          <div style={{flex:1,color:C.muted,fontSize:13.5}}>No timer running. Start one from any task to track live.</div>
          <button className="btn" onClick={()=>go("tasks")}>Go to tasks</button>
        </>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}} className="dash-cols">
        {/* today */}
        <div className="card" style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14}}>Today's tasks</div>
            <div className="chip" style={{background:C.mist,color:C.ink2}}>{todays.length}</div>
          </div>
          {todays.length===0 ? <div className="smallcap" style={{padding:"18px 0"}}>Nothing scheduled for today. Enjoy the calm. 🌤️</div> :
            <div style={{display:"grid",gap:9}}>{todays.map(t=>{
              const df=db.difficulties.find(d=>d.id===t.difficulty);
              const running=db.timer?.taskId===t.id;
              return <div key={t.id} className="rowh" onClick={()=>setTaskOpen(t.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.mist,borderRadius:10,borderLeft:`3px solid ${df?df.color:C.tintB}`,cursor:"pointer"}}>
                <div style={{flex:1,fontWeight:600,fontSize:13.5}}>{t.name}</div>
                <span className="chip" style={{background:"#fff",color:C.ink2,border:`1px solid ${C.line}`}}>{t.status}</span>
                {running ? <span className="chip" style={{background:C.warnBg,color:C.warn}}><span className="livedot"/>running</span>
                  : <button className="btn btn-icn btn-sm btn-p" title="Start timer" onClick={e=>{e.stopPropagation();startTimer(t.id);}}><Play size={13}/></button>}
              </div>;
            })}</div>}
        </div>

        {/* project progress */}
        <div className="card" style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:14}}>Project progress</div>
            <div className="chip" style={{background:C.mist,color:C.ink2}}>{active.length} active</div>
          </div>
          {active.length===0 ? <div className="smallcap" style={{padding:"18px 0"}}>No active projects. Finished ones are hidden here automatically.</div> :
            <div style={{display:"grid",gap:14}}>{active.map(p=>{ const st=projStats(p.id); return (
              <div key={p.id} style={{cursor:"pointer"}} onClick={()=>go("projects",p.id)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,fontWeight:600,fontSize:13.5}}>
                    <span style={{width:9,height:9,borderRadius:3,background:p.color||C.primary}}/>{p.name}
                  </div>
                  <div className="smallcap">{st.done}/{st.total} · {st.pct}%</div>
                </div>
                <Bar value={st.pct} color={p.color||C.primary}/>
              </div>);})}
            </div>}
        </div>
      </div>

      {taskOpen && <TaskModal id={taskOpen} onClose={()=>setTaskOpen(null)}/>}
    </div>
  );
}

/* ============================ Projects ============================ */
function Projects({ focusId, clearFocus }){
  const { db, update } = useDB();
  const { projects, projStats, projFinished, activeWs } = useScope();
  const [open, setOpen] = useState(null); // project id detail
  const [editing, setEditing] = useState(null); // project object being created/edited
  const [showDone, setShowDone] = useState(false);

  useEffect(()=>{ if(focusId){ setOpen(focusId); clearFocus?.(); } },[focusId]);

  const colors = [C.primary,C.good,C.warn,C.danger,"#7B6FC7","#3D82B4","#C77BA8","#5FA3A0"];
  const visible = projects.filter(p=> showDone ? true : !projFinished(p));

  const save = (p)=> update(d=>{
    const i=d.projects.findIndex(x=>x.id===p.id);
    if(i>=0) d.projects[i]=p; else d.projects.push(p);
    if(p._template){ const tpl=d.templates.find(t=>t.id===p._template); if(tpl){ tpl.tasks.forEach(tt=>{
      d.tasks.push({ id:uid(), ws:p.ws, project:p.id, name:tt.name, description:tt.description||"", date:"",
        difficulty:tt.difficulty||d.difficulties[0].id, status:d.statuses[0].label, checklist:(tt.checklist||[]).map(c=>({id:uid(),text:c,done:false})),
        attachments:[], assignee:"owner", createdAt:Date.now() });
    }); } delete p._template; }
  });

  if(open){ const p=db.projects.find(x=>x.id===open); if(p) return <ProjectDetail p={p} onBack={()=>setOpen(null)}/>; }

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Projects</h2>
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12.5,color:C.muted,cursor:"pointer"}}>
            <input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> show finished
          </label>
        </div>
        <button className="btn btn-p" onClick={()=>setEditing({id:uid(),ws:activeWs,name:"",description:"",color:colors[projects.length%colors.length],archived:false,_new:true})}><Plus size={15}/> New project</button>
      </div>

      {visible.length===0 ? <Empty icon={<FolderKanban size={24}/>} title="No projects yet"
        sub="A project is a bucket of tasks. Spin one up, or build it from a template for repeat work."
        action={<button className="btn btn-p" onClick={()=>setEditing({id:uid(),ws:activeWs,name:"",description:"",color:colors[0],archived:false,_new:true})}><Plus size={15}/> New project</button>} /> :
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {visible.map(p=>{ const st=projStats(p.id); const done=projFinished(p); return (
            <div key={p.id} className="card" style={{padding:18,cursor:"pointer",opacity:done?.7:1}} onClick={()=>setOpen(p.id)}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{width:11,height:11,borderRadius:4,background:p.color}}/>
                  <div style={{fontWeight:800,fontSize:15}}>{p.name}</div>
                </div>
                {done && <span className="chip" style={{background:"#E7F3F0",color:C.good}}><CheckCircle2 size={12}/>Done</span>}
              </div>
              {p.description && <div style={{color:C.muted,fontSize:12.5,marginTop:7,lineHeight:1.5}}>{p.description.slice(0,90)}</div>}
              <div style={{margin:"16px 0 7px",display:"flex",justifyContent:"space-between"}} className="smallcap"><span>Completion</span><span style={{fontWeight:700,color:C.ink2}}>{st.pct}%</span></div>
              <Bar value={st.pct} color={p.color}/>
              <div className="smallcap" style={{marginTop:8}}>{st.done} of {st.total} tasks complete</div>
            </div>);})}
        </div>}

      {editing && <ProjectForm p={editing} onClose={()=>setEditing(null)} onSave={(p)=>{save(p);setEditing(null);}} />}
    </div>
  );
}

function ProjectForm({ p, onClose, onSave }){
  const { db } = useDB();
  const [f,setF]=useState({...p, checklist:undefined});
  const colors=[C.primary,C.good,C.warn,C.danger,"#7B6FC7","#3D82B4","#C77BA8","#5FA3A0"];
  return (
    <Modal title={p._new?"New project":"Edit project"} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>Save project</button></>}>
      <div style={{display:"grid",gap:16}}>
        <div><label className="lbl">Project name</label><input className="inp" autoFocus value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Acme website revamp"/></div>
        <div><label className="lbl">Description</label><textarea className="inp" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Short summary of scope…"/></div>
        <div><label className="lbl">Color</label>
          <div style={{display:"flex",gap:9}}>{colors.map(c=><button key={c} onClick={()=>setF({...f,color:c})}
            style={{width:28,height:28,borderRadius:8,background:c,border:f.color===c?`2px solid ${C.ink}`:"2px solid transparent",cursor:"pointer"}}/>)}</div>
        </div>
        {p._new && db.templates.length>0 && <div><label className="lbl">Start from template (optional)</label>
          <select className="inp" value={f._template||""} onChange={e=>setF({...f,_template:e.target.value||undefined})}>
            <option value="">Blank project</option>
            {db.templates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.tasks.length} tasks</option>)}
          </select></div>}
      </div>
    </Modal>
  );
}

function ProjectDetail({ p, onBack }){
  const { db, update } = useDB();
  const { projStats, projTasks } = useScope();
  const st=projStats(p.id);
  const ts=projTasks(p.id);
  const [taskOpen,setTaskOpen]=useState(null);
  const [showNew,setShowNew]=useState(false);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button className="btn btn-icn" onClick={onBack}><ChevronLeft size={17}/></button>
        <span style={{width:13,height:13,borderRadius:4,background:p.color}}/>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>{p.name}</h2>
        <div style={{marginLeft:"auto",display:"flex",gap:9}}>
          <button className="btn" onClick={()=>update(d=>{const x=d.projects.find(q=>q.id===p.id);x.archived=!x.archived;})}>{p.archived?"Unarchive":"Archive"}</button>
          <button className="btn btn-d" onClick={()=>{ if(confirm("Delete project and its tasks?")) { update(d=>{ d.projects=d.projects.filter(q=>q.id!==p.id); d.tasks=d.tasks.filter(t=>t.project!==p.id); }); onBack(); } }}><Trash2 size={14}/></button>
        </div>
      </div>
      <div className="card" style={{padding:20}}>
        {p.description && <div style={{color:C.ink2,fontSize:13.5,marginBottom:16,lineHeight:1.55}}>{p.description}</div>}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontWeight:800,fontSize:14}}>Completion</div><div className="mono" style={{fontWeight:700,fontSize:15,color:p.color}}>{st.pct}%</div></div>
        <Bar value={st.pct} color={p.color} h={10}/>
        <div className="smallcap" style={{marginTop:8}}>{st.done} of {st.total} tasks done</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:800,fontSize:15}}>Tasks</div>
        <button className="btn btn-p" onClick={()=>setShowNew(true)}><Plus size={15}/> Add task</button>
      </div>
      {ts.length===0 ? <Empty icon={<ListChecks size={22}/>} title="No tasks in this project" sub="Break the work into tasks to start tracking progress." /> :
        <div style={{display:"grid",gap:9}}>{ts.map(t=><TaskRow key={t.id} t={t} onOpen={()=>setTaskOpen(t.id)} />)}</div>}
      {taskOpen && <TaskModal id={taskOpen} onClose={()=>setTaskOpen(null)}/>}
      {showNew && <TaskModal newProject={p.id} onClose={()=>setShowNew(false)}/>}
    </div>
  );
}

/* ============================ Task row + modal ============================ */
function TaskRow({ t, onOpen }){
  const { db } = useDB();
  const df=db.difficulties.find(d=>d.id===t.difficulty);
  const proj=db.projects.find(p=>p.id===t.project);
  const cl=t.checklist||[]; const cldone=cl.filter(c=>c.done).length;
  const overdue = t.date && t.date<todayISO() && !/complete/i.test(t.status);
  return (
    <div className="card rowh" onClick={onOpen} style={{padding:"12px 15px",cursor:"pointer",display:"flex",alignItems:"center",gap:13,borderLeft:`4px solid ${df?df.color:C.tintB}`}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14}}>{t.name}</div>
        <div style={{display:"flex",gap:12,marginTop:4,flexWrap:"wrap"}} className="smallcap">
          {proj && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:2,background:proj.color}}/>{proj.name}</span>}
          {t.date && <span style={{color:overdue?C.danger:C.muted,fontWeight:overdue?700:400}}>{overdue?"⚠ ":""}{fmtDateShort(t.date)}</span>}
          {cl.length>0 && <span>☑ {cldone}/{cl.length}</span>}
          {t.attachments?.length>0 && <span><Paperclip size={11} style={{verticalAlign:-1}}/> {t.attachments.length}</span>}
        </div>
      </div>
      {df && <span className="chip" style={{background:df.color+"22",color:df.color}}>{df.label}</span>}
      <span className="chip" style={{background:C.mist,color:C.ink2,border:`1px solid ${C.line}`}}>{t.status}</span>
    </div>
  );
}

function TaskModal({ id, newProject, onClose }){
  const { db, update } = useDB();
  const existing = id ? db.tasks.find(t=>t.id===id) : null;
  const { activeWs } = useScope();
  const blank = { id:uid(), ws:activeWs, project:newProject||"", name:"", description:"", date:"",
    difficulty:db.difficulties[0]?.id, status:db.statuses[0]?.label, checklist:[], attachments:[], assignee:"owner", createdAt:Date.now() };
  const [f,setF]=useState(existing?{...existing,checklist:[...(existing.checklist||[])],attachments:[...(existing.attachments||[])]}:blank);
  const [cl,setCl]=useState("");
  const fileRef=useRef();
  const wsProjects=db.projects.filter(p=>p.ws===f.ws);
  const wsUsers=db.users.filter(u=>u.role==="owner"||u.ws.includes(f.ws));
  const taskEntries=db.entries.filter(e=>e.taskId===f.id);
  const taskSec=taskEntries.reduce((a,e)=>a+e.durationSec,0);

  const addFiles = (files)=>{
    Array.from(files).forEach(file=>{
      if(file.size>800*1024){ alert(`"${file.name}" is over 800KB — attach a smaller file or link it instead.`); return; }
      const r=new FileReader();
      r.onload=()=> setF(p=>({...p,attachments:[...p.attachments,{id:uid(),name:file.name,type:file.type,data:r.result}]}));
      r.readAsDataURL(file);
    });
  };
  const save=()=> { update(d=>{ const i=d.tasks.findIndex(t=>t.id===f.id); if(i>=0)d.tasks[i]=f; else d.tasks.push(f); }); onClose(); };
  const del=()=> { if(confirm("Delete this task?")){ update(d=>{ d.tasks=d.tasks.filter(t=>t.id!==f.id); if(d.timer?.taskId===f.id)d.timer=null; }); onClose(); } };
  const start=()=> { update(d=>{ const now=new Date(); d.timer={taskId:f.id,startedAt:now.toISOString(),date:todayISO(),startHM:`${pad(now.getHours())}:${pad(now.getMinutes())}`}; }); onClose(); };

  return (
    <Modal title={existing?"Edit task":"New task"} onClose={onClose} w={620}
      foot={<>{existing && <button className="btn btn-d" onClick={del}><Trash2 size={14}/> Delete</button>}
        <div style={{flex:1}}/>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-p" disabled={!f.name.trim()} onClick={save}>Save task</button></>}>
      <div style={{display:"grid",gap:15}}>
        <div><label className="lbl">Task name</label><input className="inp" autoFocus value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Design the hero section"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
          <div><label className="lbl">Project</label><select className="inp" value={f.project} onChange={e=>setF({...f,project:e.target.value})}>
            <option value="">— No project —</option>{wsProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="lbl">Due date</label><input className="inp" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:13}}>
          <div><label className="lbl">Difficulty</label><select className="inp" value={f.difficulty} onChange={e=>setF({...f,difficulty:e.target.value})}>
            {db.difficulties.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
          <div><label className="lbl">Status</label><select className="inp" value={f.status} onChange={e=>setF({...f,status:e.target.value})}>
            {db.statuses.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}</select></div>
          <div><label className="lbl">Assignee</label><select className="inp" value={f.assignee} onChange={e=>setF({...f,assignee:e.target.value})}>
            {wsUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        </div>
        <div><label className="lbl">Description</label><textarea className="inp" value={f.description} onChange={e=>setF({...f,description:e.target.value})} placeholder="Details, links, context…"/></div>

        {/* checklist */}
        <div>
          <label className="lbl">Checklist</label>
          <div style={{display:"grid",gap:7}}>
            {f.checklist.map((c,i)=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:9,background:C.mist,padding:"7px 10px",borderRadius:8}}>
                <input type="checkbox" checked={c.done} onChange={()=>setF(p=>{const cc=[...p.checklist];cc[i]={...c,done:!c.done};return{...p,checklist:cc};})}/>
                <span style={{flex:1,fontSize:13,textDecoration:c.done?"line-through":"none",color:c.done?C.muted:C.ink}}>{c.text}</span>
                <button className="btn btn-icn btn-sm" onClick={()=>setF(p=>({...p,checklist:p.checklist.filter(x=>x.id!==c.id)}))}><X size={13}/></button>
              </div>))}
            <div style={{display:"flex",gap:8}}>
              <input className="inp" value={cl} onChange={e=>setCl(e.target.value)} placeholder="Add a checklist item…"
                onKeyDown={e=>{ if(e.key==="Enter"&&cl.trim()){ setF(p=>({...p,checklist:[...p.checklist,{id:uid(),text:cl.trim(),done:false}]})); setCl(""); } }}/>
              <button className="btn" onClick={()=>{ if(cl.trim()){ setF(p=>({...p,checklist:[...p.checklist,{id:uid(),text:cl.trim(),done:false}]})); setCl(""); } }}><Plus size={14}/></button>
            </div>
          </div>
        </div>

        {/* attachments */}
        <div>
          <label className="lbl">Files & images <span style={{textTransform:"none",fontWeight:400}}>(≤800KB each)</span></label>
          <div style={{display:"grid",gap:8}}>
            {f.attachments.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,background:C.mist,padding:"7px 10px",borderRadius:8}}>
                {a.type?.startsWith("image/") ? <img src={a.data} alt="" style={{width:34,height:34,borderRadius:6,objectFit:"cover"}}/> : <Paperclip size={16} style={{color:C.tintB}}/>}
                <a href={a.data} download={a.name} style={{flex:1,fontSize:13,color:C.ink2,textDecoration:"none",fontWeight:600}}>{a.name}</a>
                <button className="btn btn-icn btn-sm" onClick={()=>setF(p=>({...p,attachments:p.attachments.filter(x=>x.id!==a.id)}))}><X size={13}/></button>
              </div>))}
            <button className="btn" onClick={()=>fileRef.current.click()}><Paperclip size={14}/> Attach file</button>
            <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>{addFiles(e.target.files);e.target.value="";}}/>
          </div>
        </div>

        {existing && <div style={{background:C.mist,borderRadius:10,padding:14,display:"flex",alignItems:"center",gap:14}}>
          <Clock3 size={18} style={{color:C.tintB}}/>
          <div style={{flex:1}}><div className="smallcap" style={{fontWeight:700}}>Tracked on this task</div><div className="mono" style={{fontSize:18,fontWeight:700}}>{fmtDur(taskSec)}</div></div>
          {db.timer?.taskId===f.id ? <span className="chip" style={{background:C.warnBg,color:C.warn}}><span className="livedot"/>running</span> :
            <button className="btn btn-p btn-sm" onClick={start}><Play size={13}/> Start timer</button>}
        </div>}
      </div>
    </Modal>
  );
}

/* ============================ Tasks view (filters) ============================ */
function Tasks(){
  const { db } = useDB();
  const { tasks, isDone } = useScope();
  const [filter,setFilter]=useState("All");
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(null);
  const [showNew,setShowNew]=useState(false);

  const outstandingLabel = db.statuses.find(s=>/outstand/i.test(s.label))?.label;
  const tabs = ["All","Today","Not Started", ...(outstandingLabel?[outstandingLabel]:[]),"Completed"];

  const filtered = tasks.filter(t=>{
    if(q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
    if(filter==="All") return true;
    if(filter==="Today") return t.date===todayISO();
    if(filter==="Completed") return isDone(t);
    if(filter==="Not Started") return /not started/i.test(t.status);
    return t.status===filter;
  });

  const count = (name)=> tasks.filter(t=> name==="All"?true : name==="Today"?t.date===todayISO() : name==="Completed"?isDone(t) : name==="Not Started"?/not started/i.test(t.status) : t.status===name).length;

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Tasks</h2>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <Search size={15} style={{position:"absolute",left:11,top:10,color:C.muted}}/>
            <input className="inp" style={{paddingLeft:33,width:200}} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <button className="btn btn-p" onClick={()=>setShowNew(true)}><Plus size={15}/> New task</button>
        </div>
      </div>

      <div style={{display:"flex",gap:22,borderBottom:`1px solid ${C.line}`,overflowX:"auto"}}>
        {tabs.map(t=><div key={t} className={"tab"+(filter===t?" on":"")} onClick={()=>setFilter(t)}>{t} <span style={{opacity:.6}}>{count(t)}</span></div>)}
      </div>

      {filtered.length===0 ? <Empty icon={<ListChecks size={22}/>} title="No tasks here"
        sub={filter==="All"?"Create your first task to get rolling.":`Nothing in "${filter}" right now.`}
        action={filter==="All"?<button className="btn btn-p" onClick={()=>setShowNew(true)}><Plus size={15}/> New task</button>:null}/> :
        <div style={{display:"grid",gap:9}}>{filtered.map(t=><TaskRow key={t.id} t={t} onOpen={()=>setOpen(t.id)}/>)}</div>}

      {open && <TaskModal id={open} onClose={()=>setOpen(null)}/>}
      {showNew && <TaskModal onClose={()=>setShowNew(false)}/>}
    </div>
  );
}

/* ============================ Time tracking ============================ */
function TimeTracking(){
  const { db, update } = useDB();
  const { tasks, activeWs } = useScope();
  const s=db.settings; const win=weekWindow(s.weekStartDay);
  const entries=db.entries.filter(e=>e.ws===activeWs).sort((a,b)=> (b.date+b.start).localeCompare(a.date+a.start));
  const weekSec=entries.filter(e=>inWin(e.date,win)).reduce((a,e)=>a+e.durationSec,0);
  const [add,setAdd]=useState(false);
  const [f,setF]=useState({date:todayISO(),taskId:"",start:"09:00",end:"10:00"});

  const save=()=> update(d=>{
    const tk=d.tasks.find(t=>t.id===f.taskId);
    d.entries.unshift({ id:uid(), taskId:f.taskId, taskName:tk?tk.name:"(manual)", project:tk?tk.project:null, ws:activeWs,
      date:f.date, start:f.start, end:f.end, durationSec:durSec(f.start,f.end), billed:false });
  });

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Time tracking</h2>
        <button className="btn btn-p" onClick={()=>{setF({date:todayISO(),taskId:"",start:"09:00",end:"10:00"});setAdd(true);}}><Plus size={15}/> Log time</button>
      </div>

      <div className="card" style={{padding:20,display:"flex",gap:30,flexWrap:"wrap"}}>
        <div><div className="lbl">This week</div><div className="mono" style={{fontSize:28,fontWeight:700}}>{fmtDur(weekSec)}</div></div>
        <div><div className="lbl">Weekly goal</div><div className="mono" style={{fontSize:28,fontWeight:700,color:C.muted}}>{fmtDur(s.weeklyHours*3600)}</div></div>
        <div><div className="lbl">Remaining</div><div className="mono" style={{fontSize:28,fontWeight:700,color:weekSec>=s.weeklyHours*3600?C.good:C.primary}}>{fmtDur(Math.max(0,s.weeklyHours*3600-weekSec))}</div></div>
        <div style={{flex:1,minWidth:200,alignSelf:"center"}}><Bar value={weekSec/(s.weeklyHours*3600)*100} h={10}/></div>
      </div>

      {entries.length===0 ? <Empty icon={<Timer size={22}/>} title="No time logged yet" sub="Start a timer from a task, or log an entry manually. Durations show as HH:MM:SS." /> :
        <div className="card" style={{overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"120px 1fr 90px 90px 110px 40px",gap:0,padding:"11px 16px",background:C.mist,fontSize:11,fontWeight:800,letterSpacing:".04em",textTransform:"uppercase",color:C.muted}}>
            <div>Date</div><div>Task</div><div>Start</div><div>End</div><div>Duration</div><div/>
          </div>
          {entries.map(e=>(
            <div key={e.id} className="rowh" style={{display:"grid",gridTemplateColumns:"120px 1fr 90px 90px 110px 40px",gap:0,padding:"11px 16px",borderTop:`1px solid ${C.line}`,alignItems:"center",fontSize:13}}>
              <div>{fmtDateShort(e.date)}</div>
              <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.taskName}</div>
              <div className="mono">{e.start}</div><div className="mono">{e.end}</div>
              <div className="mono" style={{fontWeight:700}}>{fmtDur(e.durationSec)}</div>
              <button className="btn btn-icn btn-sm btn-d" onClick={()=>update(d=>{d.entries=d.entries.filter(x=>x.id!==e.id);})}><Trash2 size={13}/></button>
            </div>))}
        </div>}

      {add && <Modal title="Log time" onClose={()=>setAdd(false)}
        foot={<><button className="btn" onClick={()=>setAdd(false)}>Cancel</button><button className="btn btn-p" onClick={()=>{save();setAdd(false);}}>Save entry</button></>}>
        <div style={{display:"grid",gap:14}}>
          <div><label className="lbl">Task</label><select className="inp" value={f.taskId} onChange={e=>setF({...f,taskId:e.target.value})}>
            <option value="">— pick a task —</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><label className="lbl">Date</label><input className="inp" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,alignItems:"end"}}>
            <div><label className="lbl">Start</label><input className="inp" type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/></div>
            <div><label className="lbl">End</label><input className="inp" type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></div>
            <div><label className="lbl">Duration</label><div className="mono inp" style={{background:C.mist,fontWeight:700}}>{fmtDur(durSec(f.start,f.end))}</div></div>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

/* ============================ Calendar ============================ */
function Calendar(){
  const { db } = useDB();
  const { tasks } = useScope();
  const [cur,setCur]=useState(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()};});
  const [dayOpen,setDayOpen]=useState(null);
  const first=new Date(cur.y,cur.m,1); const startPad=first.getDay(); const days=new Date(cur.y,cur.m+1,0).getDate();
  const cells=[]; for(let i=0;i<startPad;i++)cells.push(null); for(let d=1;d<=days;d++)cells.push(d);
  const iso=(d)=>`${cur.y}-${pad(cur.m+1)}-${pad(d)}`;
  const tasksOn=(d)=> tasks.filter(t=>t.date===iso(d));
  const move=(n)=> setCur(c=>{let m=c.m+n,y=c.y;if(m<0){m=11;y--;}if(m>11){m=0;y++;}return{y,m};});
  const today=todayISO();

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Calendar</h2>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="btn btn-icn" onClick={()=>move(-1)}><ChevronLeft size={16}/></button>
          <div style={{fontWeight:800,fontSize:15,minWidth:150,textAlign:"center"}}>{MON[cur.m]} {cur.y}</div>
          <button className="btn btn-icn" onClick={()=>move(1)}><ChevronRight size={16}/></button>
          <button className="btn btn-sm" onClick={()=>{const d=new Date();setCur({y:d.getFullYear(),m:d.getMonth()});}}>Today</button>
        </div>
      </div>
      <div className="card" style={{padding:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:6}}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="smallcap" style={{textAlign:"center",fontWeight:800}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
          {cells.map((d,i)=>{ if(!d) return <div key={i}/>;
            const ts=tasksOn(d); const isToday=iso(d)===today;
            return <div key={i} onClick={()=>ts.length&&setDayOpen(d)} style={{minHeight:92,borderRadius:10,padding:8,background:isToday?"#E9F2FA":C.mist,border:isToday?`1.5px solid ${C.primary}`:`1px solid ${C.line}`,cursor:ts.length?"pointer":"default"}}>
              <div style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?C.primary:C.ink2,marginBottom:5}}>{d}</div>
              <div style={{display:"grid",gap:3}}>{ts.slice(0,3).map(t=>{const df=db.difficulties.find(x=>x.id===t.difficulty);return(
                <div key={t.id} style={{fontSize:10.5,fontWeight:600,background:(df?df.color:C.tintB)+"22",color:df?df.color:C.ink2,borderRadius:5,padding:"2px 5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div>);})}
                {ts.length>3 && <div className="smallcap" style={{fontSize:10}}>+{ts.length-3} more</div>}
              </div>
            </div>;})}
        </div>
      </div>
      {dayOpen && <Modal title={fmtDate(iso(dayOpen))} onClose={()=>setDayOpen(null)}>
        <div style={{display:"grid",gap:9}}>{tasksOn(dayOpen).map(t=><TaskRow key={t.id} t={t} onOpen={()=>{}}/>)}</div>
      </Modal>}
    </div>
  );
}

/* ============================ Invoices ============================ */
function Invoices(){
  const { db, update } = useDB();
  const { activeWs } = useScope();
  const invoices=db.invoices.filter(i=>i.ws===activeWs);
  const [edit,setEdit]=useState(null);
  const [view,setView]=useState(null);
  const cur=db.settings.currency;

  const blank=()=>({ id:uid(), ws:activeWs, no:`INV-${String(db.invNo).padStart(4,"0")}`, client:"", clientEmail:"",
    date:todayISO(), due:"", items:[{id:uid(),desc:"",qty:1,rate:db.settings.rate||0}], notes:"", _new:true });

  const save=(inv)=> update(d=>{ const {_new,...rest}=inv; const i=d.invoices.findIndex(x=>x.id===inv.id);
    if(i>=0)d.invoices[i]=rest; else { d.invoices.unshift(rest); d.invNo++; } });
  const total=(inv)=> inv.items.reduce((a,it)=>a+it.qty*it.rate,0);

  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Invoices</h2>
        <button className="btn btn-p" onClick={()=>setEdit(blank())}><Plus size={15}/> New invoice</button>
      </div>
      {invoices.length===0 ? <Empty icon={<Receipt size={22}/>} title="No invoices yet" sub="Create an invoice for a client. Pull hours from your tracked time or add line items by hand." /> :
        <div style={{display:"grid",gap:10}}>{invoices.map(inv=>(
          <div key={inv.id} className="card rowh" style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={()=>setView(inv)}>
            <div style={{width:38,height:38,borderRadius:9,background:C.mist,display:"grid",placeItems:"center",color:C.tintB}}><Receipt size={18}/></div>
            <div style={{flex:1}}><div style={{fontWeight:800}}>{inv.no} · {inv.client||"Untitled client"}</div><div className="smallcap">{fmtDate(inv.date)}{inv.due?` · due ${fmtDateShort(inv.due)}`:""}</div></div>
            <div className="mono" style={{fontWeight:800,fontSize:16}}>{cur}{total(inv).toFixed(2)}</div>
            <button className="btn btn-icn" onClick={e=>{e.stopPropagation();setEdit({...inv,_new:false});}}><Pencil size={14}/></button>
            <button className="btn btn-icn btn-d" onClick={e=>{e.stopPropagation();if(confirm("Delete invoice?"))update(d=>{d.invoices=d.invoices.filter(x=>x.id!==inv.id);});}}><Trash2 size={14}/></button>
          </div>))}</div>}
      {edit && <InvoiceForm inv={edit} onClose={()=>setEdit(null)} onSave={(i)=>{save(i);setEdit(null);}}/>}
      {view && <InvoiceView inv={view} onClose={()=>setView(null)}/>}
    </div>
  );
}

function InvoiceForm({ inv, onClose, onSave }){
  const { db } = useDB();
  const { tasks, activeWs } = useScope();
  const [f,setF]=useState(JSON.parse(JSON.stringify(inv)));
  const cur=db.settings.currency;
  const setItem=(id,k,v)=> setF(p=>({...p,items:p.items.map(it=>it.id===id?{...it,[k]:v}:it)}));
  const total=f.items.reduce((a,it)=>a+(+it.qty||0)*(+it.rate||0),0);
  const pullTime=()=>{
    const win=weekWindow(db.settings.weekStartDay);
    const byTask={};
    db.entries.filter(e=>e.ws===activeWs&&!e.billed).forEach(e=>{ byTask[e.taskName]=(byTask[e.taskName]||0)+e.durationSec; });
    const items=Object.entries(byTask).map(([name,sec])=>({id:uid(),desc:name,qty:+(sec/3600).toFixed(2),rate:db.settings.rate||0}));
    if(items.length) setF(p=>({...p,items})); else alert("No unbilled tracked time to pull.");
  };
  return (
    <Modal title={inv._new?"New invoice":"Edit invoice"} onClose={onClose} w={680}
      foot={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-p" onClick={()=>onSave(f)}>Save invoice</button></>}>
      <div style={{display:"grid",gap:15}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
          <div><label className="lbl">Invoice #</label><input className="inp" value={f.no} onChange={e=>setF({...f,no:e.target.value})}/></div>
          <div><label className="lbl">Client</label><input className="inp" value={f.client} onChange={e=>setF({...f,client:e.target.value})} placeholder="Client / company"/></div>
          <div><label className="lbl">Client email</label><input className="inp" value={f.clientEmail} onChange={e=>setF({...f,clientEmail:e.target.value})} placeholder="name@company.com"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <div><label className="lbl">Date</label><input className="inp" type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></div>
            <div><label className="lbl">Due</label><input className="inp" type="date" value={f.due} onChange={e=>setF({...f,due:e.target.value})}/></div>
          </div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label className="lbl" style={{margin:0}}>Line items</label>
            <button className="btn btn-sm" onClick={pullTime}><Clock3 size={13}/> Pull from tracked time</button>
          </div>
          <div style={{display:"grid",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 80px 34px",gap:8}} className="smallcap"><div>Description</div><div>Qty</div><div>Rate</div><div>Amount</div><div/></div>
            {f.items.map(it=>(
              <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 80px 34px",gap:8,alignItems:"center"}}>
                <input className="inp" value={it.desc} onChange={e=>setItem(it.id,"desc",e.target.value)} placeholder="Work performed"/>
                <input className="inp mono" type="number" value={it.qty} onChange={e=>setItem(it.id,"qty",+e.target.value)}/>
                <input className="inp mono" type="number" value={it.rate} onChange={e=>setItem(it.id,"rate",+e.target.value)}/>
                <div className="mono" style={{fontWeight:700,fontSize:13}}>{cur}{((+it.qty||0)*(+it.rate||0)).toFixed(2)}</div>
                <button className="btn btn-icn btn-sm" onClick={()=>setF(p=>({...p,items:p.items.filter(x=>x.id!==it.id)}))}><X size={13}/></button>
              </div>))}
            <button className="btn btn-sm" style={{justifySelf:"start"}} onClick={()=>setF(p=>({...p,items:[...p.items,{id:uid(),desc:"",qty:1,rate:db.settings.rate||0}]}))}><Plus size={13}/> Add line</button>
          </div>
        </div>
        <div><label className="lbl">Notes</label><textarea className="inp" value={f.notes} onChange={e=>setF({...f,notes:e.target.value})} placeholder="Payment terms, thank-you note…"/></div>
        <div style={{textAlign:"right",fontSize:18,fontWeight:800}}>Total: <span className="mono">{cur}{total.toFixed(2)}</span></div>
      </div>
    </Modal>
  );
}

function InvoiceView({ inv, onClose }){
  const { db } = useDB();
  const ws=db.workspaces.find(w=>w.id===inv.ws);
  const cur=db.settings.currency;
  const total=inv.items.reduce((a,it)=>a+it.qty*it.rate,0);
  return (
    <Modal title={`Invoice ${inv.no}`} onClose={onClose} w={620}
      foot={<><button className="btn" onClick={()=>window.print()}><Download size={14}/> Print / PDF</button><button className="btn btn-p" onClick={onClose}>Close</button></>}>
      <div style={{background:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div><div style={{fontSize:22,fontWeight:800,color:C.ink}}>{ws?.name||"Invoice"}</div><div className="smallcap">Invoice {inv.no}</div></div>
          <div style={{textAlign:"right"}}><div className="smallcap">Issued {fmtDate(inv.date)}</div>{inv.due&&<div className="smallcap">Due {fmtDate(inv.due)}</div>}</div>
        </div>
        <div style={{marginBottom:18}}><div className="lbl">Bill to</div><div style={{fontWeight:700}}>{inv.client||"—"}</div><div className="smallcap">{inv.clientEmail}</div></div>
        <div style={{border:`1px solid ${C.line}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 90px 90px",padding:"10px 14px",background:C.mist,fontSize:11,fontWeight:800,textTransform:"uppercase",color:C.muted}}><div>Description</div><div>Qty</div><div>Rate</div><div style={{textAlign:"right"}}>Amount</div></div>
          {inv.items.map(it=><div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 60px 90px 90px",padding:"10px 14px",borderTop:`1px solid ${C.line}`,fontSize:13.5}}><div>{it.desc}</div><div className="mono">{it.qty}</div><div className="mono">{cur}{(+it.rate).toFixed(2)}</div><div className="mono" style={{textAlign:"right",fontWeight:600}}>{cur}{(it.qty*it.rate).toFixed(2)}</div></div>)}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><div style={{textAlign:"right"}}><div className="lbl">Total due</div><div className="mono" style={{fontSize:26,fontWeight:800,color:C.ink}}>{cur}{total.toFixed(2)}</div></div></div>
        {inv.notes && <div style={{marginTop:20,padding:14,background:C.mist,borderRadius:10,fontSize:13,color:C.ink2}}>{inv.notes}</div>}
      </div>
    </Modal>
  );
}

/* ============================ Notes ============================ */
function Notes(){
  const { db, update } = useDB();
  const { activeWs } = useScope();
  const notes=db.notes.filter(n=>n.ws===activeWs).sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||b.createdAt-a.createdAt);
  const [txt,setTxt]=useState("");
  const add=()=>{ if(!txt.trim())return; update(d=>d.notes.unshift({id:uid(),ws:activeWs,text:txt.trim(),pinned:false,createdAt:Date.now()})); setTxt(""); };
  return (
    <div style={{display:"grid",gap:16}}>
      <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Notes</h2>
      <div className="card" style={{padding:16,display:"flex",gap:10,alignItems:"flex-end"}}>
        <div style={{flex:1}}><textarea className="inp" value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Jot an important note — client feedback, a login, an idea…"/></div>
        <button className="btn btn-p" onClick={add}><Plus size={15}/> Add</button>
      </div>
      {notes.length===0 ? <Empty icon={<StickyNote size={22}/>} title="No notes yet" sub="Keep important reminders here so they don't get lost in tasks." /> :
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>{notes.map(n=>(
          <div key={n.id} className="card" style={{padding:16,background:n.pinned?C.warnBg:C.surface,borderColor:n.pinned?"#F0D9BC":C.line}}>
            <div style={{fontSize:13.5,lineHeight:1.55,whiteSpace:"pre-wrap",color:C.ink}}>{n.text}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
              <span className="smallcap">{fmtDateShort(new Date(n.createdAt).toISOString().slice(0,10))}</span>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-icn btn-sm" title="Pin" onClick={()=>update(d=>{const x=d.notes.find(q=>q.id===n.id);x.pinned=!x.pinned;})} style={{color:n.pinned?C.warn:C.muted}}><Zap size={13}/></button>
                <button className="btn btn-icn btn-sm btn-d" onClick={()=>update(d=>{d.notes=d.notes.filter(q=>q.id!==n.id);})}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>))}</div>}
    </div>
  );
}

/* ============================ Templates ============================ */
function Templates(){
  const { db, update } = useDB();
  const [edit,setEdit]=useState(null);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800}}>Project templates</h2><div className="smallcap" style={{marginTop:4}}>Pre-built task lists for repetitive projects. Pick one when creating a project.</div></div>
        <button className="btn btn-p" onClick={()=>setEdit({id:uid(),name:"",tasks:[],_new:true})}><Plus size={15}/> New template</button>
      </div>
      {db.templates.length===0 ? <Empty icon={<LayoutTemplate size={22}/>} title="No templates yet" sub="Build a template once (e.g. 'Landing page build') and reuse its task list on every new project." /> :
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>{db.templates.map(t=>(
          <div key={t.id} className="card" style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontWeight:800,fontSize:15}}>{t.name}</div>
              <div style={{display:"flex",gap:6}}><button className="btn btn-icn btn-sm" onClick={()=>setEdit({...t,tasks:t.tasks.map(x=>({...x}))})}><Pencil size={13}/></button>
                <button className="btn btn-icn btn-sm btn-d" onClick={()=>update(d=>{d.templates=d.templates.filter(x=>x.id!==t.id);})}><Trash2 size={13}/></button></div></div>
            <div className="smallcap" style={{margin:"10px 0"}}>{t.tasks.length} tasks</div>
            <div style={{display:"grid",gap:5}}>{t.tasks.slice(0,5).map((tt,i)=><div key={i} style={{fontSize:12.5,color:C.ink2,display:"flex",gap:7,alignItems:"center"}}><Circle size={6} style={{color:C.tintB}}/>{tt.name}</div>)}
              {t.tasks.length>5&&<div className="smallcap">+{t.tasks.length-5} more</div>}</div>
          </div>))}</div>}
      {edit && <TemplateForm t={edit} onClose={()=>setEdit(null)} onSave={(t)=>{const{_new,...rest}=t;update(d=>{const i=d.templates.findIndex(x=>x.id===t.id);if(i>=0)d.templates[i]=rest;else d.templates.push(rest);});setEdit(null);}}/>}
    </div>
  );
}
function TemplateForm({ t, onClose, onSave }){
  const { db } = useDB();
  const [f,setF]=useState({...t,tasks:t.tasks.map(x=>({...x}))});
  const [nt,setNt]=useState("");
  return (
    <Modal title={t._new?"New template":"Edit template"} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>Save template</button></>}>
      <div style={{display:"grid",gap:15}}>
        <div><label className="lbl">Template name</label><input className="inp" autoFocus value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Landing page build"/></div>
        <div><label className="lbl">Tasks</label>
          <div style={{display:"grid",gap:7}}>
            {f.tasks.map((tt,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                <input className="inp" value={tt.name} onChange={e=>setF(p=>{const a=[...p.tasks];a[i]={...tt,name:e.target.value};return{...p,tasks:a};})} placeholder="Task name"/>
                <select className="inp" style={{width:130}} value={tt.difficulty||db.difficulties[0].id} onChange={e=>setF(p=>{const a=[...p.tasks];a[i]={...tt,difficulty:e.target.value};return{...p,tasks:a};})}>
                  {db.difficulties.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select>
                <button className="btn btn-icn" onClick={()=>setF(p=>({...p,tasks:p.tasks.filter((_,x)=>x!==i)}))}><X size={14}/></button>
              </div>))}
            <div style={{display:"flex",gap:8}}>
              <input className="inp" value={nt} onChange={e=>setNt(e.target.value)} placeholder="Add task…" onKeyDown={e=>{if(e.key==="Enter"&&nt.trim()){setF(p=>({...p,tasks:[...p.tasks,{name:nt.trim(),difficulty:db.difficulties[0].id,checklist:[]}]}));setNt("");}}}/>
              <button className="btn" onClick={()=>{if(nt.trim()){setF(p=>({...p,tasks:[...p.tasks,{name:nt.trim(),difficulty:db.difficulties[0].id,checklist:[]}]}));setNt("");}}}><Plus size={14}/></button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ Team ============================ */
function Team(){
  const { db, update } = useDB();
  const [edit,setEdit]=useState(null);
  return (
    <div style={{display:"grid",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:800}}>Team</h2><div className="smallcap" style={{marginTop:4}}>Assign people to workspaces and tasks. Use "View as" in the sidebar to preview what a member sees.</div></div>
        <button className="btn btn-p" onClick={()=>setEdit({id:uid(),name:"",role:"member",color:C.tintB,ws:[db.activeWs],_new:true})}><Plus size={15}/> Add person</button>
      </div>
      <div style={{background:"#EEF5FB",border:`1px solid ${C.soft}`,borderRadius:12,padding:"12px 16px",display:"flex",gap:10,fontSize:12.5,color:C.ink2}}>
        <AlertTriangle size={16} style={{color:C.warn,flexShrink:0,marginTop:1}}/>
        <div>This is a single-device tool, so team members are simulated for planning &amp; visibility rules — there's no separate login. A member only "sees" tasks assigned to them within their workspaces.</div>
      </div>
      <div style={{display:"grid",gap:10}}>{db.users.map(u=>(
        <div key={u.id} className="card" style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:13}}>
          <div style={{width:38,height:38,borderRadius:"50%",background:u.color,color:"#fff",display:"grid",placeItems:"center",fontWeight:800}}>{u.name.slice(0,1).toUpperCase()}</div>
          <div style={{flex:1}}><div style={{fontWeight:800}}>{u.name} {u.role==="owner"&&<span className="chip" style={{background:C.mist,color:C.ink2,marginLeft:6}}>owner</span>}</div>
            <div className="smallcap">Workspaces: {u.role==="owner"?"all":db.workspaces.filter(w=>u.ws.includes(w.id)).map(w=>w.name).join(", ")||"none"}</div></div>
          {u.role!=="owner" && <><button className="btn btn-icn" onClick={()=>setEdit({...u,ws:[...u.ws]})}><Pencil size={14}/></button>
            <button className="btn btn-icn btn-d" onClick={()=>update(d=>{d.users=d.users.filter(x=>x.id!==u.id);if(d.viewAs===u.id)d.viewAs="owner";})}><Trash2 size={14}/></button></>}
        </div>))}</div>
      {edit && <TeamForm u={edit} onClose={()=>setEdit(null)} onSave={(u)=>{const{_new,...rest}=u;update(d=>{const i=d.users.findIndex(x=>x.id===u.id);if(i>=0)d.users[i]=rest;else d.users.push(rest);});setEdit(null);}}/>}
    </div>
  );
}
function TeamForm({ u, onClose, onSave }){
  const { db } = useDB();
  const [f,setF]=useState({...u});
  const colors=[C.primary,C.good,C.warn,C.danger,"#7B6FC7","#C77BA8"];
  return (
    <Modal title={u._new?"Add person":"Edit person"} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>Save</button></>}>
      <div style={{display:"grid",gap:15}}>
        <div><label className="lbl">Name</label><input className="inp" autoFocus value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Team member name"/></div>
        <div><label className="lbl">Avatar color</label><div style={{display:"flex",gap:9}}>{colors.map(c=><button key={c} onClick={()=>setF({...f,color:c})} style={{width:28,height:28,borderRadius:"50%",background:c,border:f.color===c?`2px solid ${C.ink}`:"2px solid transparent",cursor:"pointer"}}/>)}</div></div>
        <div><label className="lbl">Assigned workspaces</label><div style={{display:"grid",gap:8}}>{db.workspaces.map(w=>(
          <label key={w.id} style={{display:"flex",alignItems:"center",gap:9,fontSize:13.5,cursor:"pointer"}}>
            <input type="checkbox" checked={f.ws.includes(w.id)} onChange={()=>setF(p=>({...p,ws:p.ws.includes(w.id)?p.ws.filter(x=>x!==w.id):[...p.ws,w.id]}))}/>{w.name}</label>))}</div></div>
      </div>
    </Modal>
  );
}

/* ============================ Settings ============================ */
function SettingsView(){
  const { db, update } = useDB();
  const s=db.settings;
  const set=(k,v)=>update(d=>{d.settings[k]=v;});
  const fileRef=useRef();
  const importJSON=(file)=>{ const r=new FileReader(); r.onload=()=>{ let obj; try{ obj=JSON.parse(r.result); }catch{ alert("Couldn't read that file — is it valid JSON?"); return; }
    if(!obj||!Array.isArray(obj.workspaces)||!Array.isArray(obj.tasks)){ alert("That doesn't look like a Command Deck backup."); return; }
    if(confirm("Replace ALL current data with this backup? This can't be undone.")){ update(d=>{ Object.keys(d).forEach(k=>delete d[k]); Object.assign(d,{...seed(),...obj}); }); alert("Imported! ✓"); } };
    r.readAsText(file); };
  return (
    <div style={{display:"grid",gap:16,maxWidth:760}}>
      <h2 style={{margin:0,fontSize:20,fontWeight:800}}>Settings</h2>

      {/* week */}
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:4}}>Work week</div>
        <div className="smallcap" style={{marginBottom:16}}>Controls the weekly hours goal and when the week resets on your dashboard.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><label className="lbl">Hours needed per week</label><input className="inp mono" type="number" value={s.weeklyHours} onChange={e=>set("weeklyHours",Math.max(1,+e.target.value))}/></div>
          <div><label className="lbl">Week starts on</label><select className="inp" value={s.weekStartDay} onChange={e=>set("weekStartDay",+e.target.value)}>
            <option value={0}>Sunday</option><option value={1}>Monday</option></select></div>
        </div>
        <div style={{marginTop:16}}><label className="lbl">Working days</label>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{DOW.map((d,i)=>{const on=s.workDays.includes(d);return(
            <button key={d} onClick={()=>update(dd=>{const w=dd.settings.workDays;dd.settings.workDays=w.includes(d)?w.filter(x=>x!==d):[...w,d];})}
              style={{padding:"7px 12px",borderRadius:8,fontSize:12.5,fontWeight:700,cursor:"pointer",border:`1px solid ${on?C.primary:C.line}`,background:on?C.primary:C.surface,color:on?"#fff":C.ink2}}>{DOW_FULL[i].slice(0,3)}</button>);})}</div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-sm" onClick={()=>update(d=>{d.settings.workDays=["mon","tue","wed","thu","fri"];})}>Mon–Fri</button>
            <button className="btn btn-sm" onClick={()=>update(d=>{d.settings.workDays=["sun","mon","tue","wed","thu","fri"];})}>Sun–Fri</button>
            <button className="btn btn-sm" onClick={()=>update(d=>{d.settings.workDays=["sun","mon","tue","wed","thu"];})}>Sun–Thu</button>
          </div>
        </div>
      </div>

      {/* billing */}
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:16}}>Billing defaults</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><label className="lbl">Currency symbol</label><input className="inp" value={s.currency} onChange={e=>set("currency",e.target.value)}/></div>
          <div><label className="lbl">Default hourly rate</label><input className="inp mono" type="number" value={s.rate} onChange={e=>set("rate",+e.target.value)}/></div>
        </div>
      </div>

      {/* difficulties */}
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:4}}>Difficulty options</div>
        <div className="smallcap" style={{marginBottom:14}}>Each level's color drives the strip shown on task cards.</div>
        <div style={{display:"grid",gap:9}}>
          {s && db.difficulties.map(df=>(
            <div key={df.id} style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="color" value={df.color} onChange={e=>update(d=>{d.difficulties.find(x=>x.id===df.id).color=e.target.value;})} style={{width:38,height:38,border:"none",background:"none",cursor:"pointer",padding:0}}/>
              <input className="inp" value={df.label} onChange={e=>update(d=>{d.difficulties.find(x=>x.id===df.id).label=e.target.value;})}/>
              <button className="btn btn-icn btn-d" onClick={()=>update(d=>{d.difficulties=d.difficulties.filter(x=>x.id!==df.id);})}><Trash2 size={14}/></button>
            </div>))}
          <button className="btn btn-sm" style={{justifySelf:"start"}} onClick={()=>update(d=>d.difficulties.push({id:uid(),label:"New level",color:"#7B6FC7"}))}><Plus size={13}/> Add difficulty</button>
        </div>
      </div>

      {/* statuses */}
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:4}}>Status options</div>
        <div className="smallcap" style={{marginBottom:14}}>These become your task filter tabs. Keep one containing "Completed" so finished projects hide correctly.</div>
        <div style={{display:"grid",gap:9}}>
          {db.statuses.map(st=>(
            <div key={st.id} style={{display:"flex",alignItems:"center",gap:10}}>
              <input className="inp" value={st.label} onChange={e=>update(d=>{d.statuses.find(x=>x.id===st.id).label=e.target.value;})}/>
              <button className="btn btn-icn btn-d" onClick={()=>update(d=>{d.statuses=d.statuses.filter(x=>x.id!==st.id);})}><Trash2 size={14}/></button>
            </div>))}
          <button className="btn btn-sm" style={{justifySelf:"start"}} onClick={()=>update(d=>d.statuses.push({id:uid(),label:"New status"}))}><Plus size={13}/> Add status</button>
        </div>
      </div>

      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:6}}>Backup &amp; restore</div>
        <div className="smallcap" style={{marginBottom:14}}>Export a full copy of everything, or import a backup (or a migrated file) to load it in. Import replaces your current data.</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn" onClick={()=>downloadJSON(db,`command-deck-backup-${todayISO()}.json`)}><Download size={14}/> Export backup</button>
          <button className="btn" onClick={()=>fileRef.current.click()}><Upload size={14}/> Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{display:"none"}} onChange={e=>{if(e.target.files[0])importJSON(e.target.files[0]);e.target.value="";}}/>
        </div>
      </div>

      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:800,marginBottom:6}}>Account & data</div>
        <div className="smallcap" style={{marginBottom:14}}>Everything saves automatically to your account and syncs across devices.</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn" onClick={()=>supabase.auth.signOut()}>Sign out</button>
          <button className="btn btn-d" onClick={()=>{if(confirm("Reset ALL data? This cannot be undone."))update(d=>{const s=seed();Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,s);});}}><Trash2 size={14}/> Reset all data</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Sidebar ============================ */
function Sidebar({ view, setView, collapsed }){
  const { db, update } = useDB();
  const { isOwner, me, wsList } = useScope();
  const [wsMenu,setWsMenu]=useState(false);
  const [addWs,setAddWs]=useState(false);
  const [wsName,setWsName]=useState("");
  const nav=[
    ["dashboard","Dashboard",<LayoutDashboard size={17}/>],
    ["projects","Projects",<FolderKanban size={17}/>],
    ["tasks","Tasks",<ListChecks size={17}/>],
    ["time","Time",<Timer size={17}/>],
    ["calendar","Calendar",<CalendarDays size={17}/>],
    ["invoices","Invoices",<Receipt size={17}/>],
    ["notes","Notes",<StickyNote size={17}/>],
    ["templates","Templates",<LayoutTemplate size={17}/>],
    ["team","Team",<Users size={17}/>],
    ["settings","Settings",<SettingsIcon size={17}/>],
  ];
  const active=db.workspaces.find(w=>w.id===db.activeWs)||wsList[0];
  return (
    <div style={{width:238,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.line}`,padding:16,display:"flex",flexDirection:"column",gap:6,height:"100vh",position:"sticky",top:0,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,padding:"4px 6px 12px"}}>
        <div style={{width:30,height:30,borderRadius:9,background:`linear-gradient(135deg,${C.primary},${C.ink})`,display:"grid",placeItems:"center"}}><Briefcase size={16} color="#fff"/></div>
        <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.01em"}}>Command Deck</div>
      </div>

      {/* workspace switcher */}
      <div style={{position:"relative",marginBottom:6}}>
        <button className="btn" style={{width:"100%",justifyContent:"space-between"}} onClick={()=>setWsMenu(v=>!v)}>
          <span style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden"}}><span style={{width:8,height:8,borderRadius:3,background:C.primary,flexShrink:0}}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{active?.name}</span></span>
          <ChevronDown size={14}/>
        </button>
        {wsMenu && <div className="card" style={{position:"absolute",top:"105%",left:0,right:0,zIndex:20,padding:6,boxShadow:"0 12px 30px -10px rgba(30,58,82,.35)"}}>
          {wsList.map(w=><div key={w.id} className="nav" style={{padding:"7px 9px"}} onClick={()=>{update(d=>{d.activeWs=w.id;});setWsMenu(false);}}>
            <span style={{width:7,height:7,borderRadius:2,background:w.id===db.activeWs?C.primary:C.tintA}}/>{w.name}{w.id===db.activeWs&&<Check size={13} style={{marginLeft:"auto"}}/>}</div>)}
          {isOwner && <div className="nav" style={{padding:"7px 9px",color:C.primary}} onClick={()=>{setAddWs(true);setWsMenu(false);}}><Plus size={14}/> New workspace</div>}
        </div>}
      </div>

      <div style={{display:"grid",gap:2,flex:1}}>
        {nav.map(([k,label,icon])=>{
          if((k==="team"||k==="settings"||k==="invoices"||k==="templates")&&!isOwner) return null;
          return <div key={k} className={"nav"+(view===k?" on":"")} onClick={()=>setView(k)}>{icon}{label}</div>;
        })}
      </div>

      {/* view as */}
      {db.users.length>1 && <div style={{borderTop:`1px solid ${C.line}`,paddingTop:12,marginTop:6}}>
        <div className="lbl" style={{display:"flex",alignItems:"center",gap:6}}><Eye size={12}/> Viewing as</div>
        <select className="inp" value={db.viewAs} onChange={e=>{update(d=>{d.viewAs=e.target.value; if(e.target.value!=="owner"){const u=d.users.find(x=>x.id===e.target.value); if(u&&!u.ws.includes(d.activeWs))d.activeWs=u.ws[0]||d.activeWs;}}); setView("dashboard");}}>
          {db.users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>}

      {addWs && <Modal title="New workspace" onClose={()=>setAddWs(false)}
        foot={<><button className="btn" onClick={()=>setAddWs(false)}>Cancel</button><button className="btn btn-p" disabled={!wsName.trim()} onClick={()=>{update(d=>{const id=uid();d.workspaces.push({id,name:wsName.trim()});d.activeWs=id;d.users.find(u=>u.id==="owner").ws.push(id);});setWsName("");setAddWs(false);}}>Create</button></>}>
        <label className="lbl">Workspace name</label><input className="inp" autoFocus value={wsName} onChange={e=>setWsName(e.target.value)} placeholder="Client work, Personal, Agency…"/>
      </Modal>}
    </div>
  );
}

/* ============================ Root ============================ */
export default function App(){
  const [db,setDb]=useState(null);
  const [view,setView]=useState("dashboard");
  const [now,setNow]=useState(Date.now());
  const [focusProject,setFocusProject]=useState(null);
  const loaded=useRef(false);
  const [session,setSession]=useState(undefined);
  useEffect(()=>{ supabase.auth.getSession().then(({data})=>setSession(data.session||null)); const { data:sub }=supabase.auth.onAuthStateChange((_e,ns)=>setSession(ns)); return ()=>sub.subscription.unsubscribe(); },[]);
  const userId = session?.user?.id || null;

  // load
  useEffect(()=>{ if(!userId){ setDb(null); loaded.current=false; return; } (async()=>{ const doc=await loadDoc(userId); setDb({...seed(),...(doc||{})}); loaded.current=true; })(); },[userId]);
  // persist
  useEffect(()=>{ if(!loaded.current||!db||!userId) return; const t=setTimeout(()=>{ saveDoc(userId,db); },600); return ()=>clearTimeout(t); },[db,userId]);
  // clock
  useEffect(()=>{ const i=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(i); },[]);

  const update=useCallback((fn)=> setDb(prev=>{ const d=structuredClone(prev); fn(d); return d; }),[]);
  const go=useCallback((v,pid)=>{ setView(v); if(pid){setFocusProject(pid);} },[]);

  if(session===undefined) return <Loader/>;
  if(!session) return <AuthScreen/>;
  if(!db) return <Loader/>;

  const { isOwner } = (()=>{ const me=db.users.find(u=>u.id===db.viewAs)||db.users[0]; return {isOwner:me.role==="owner"}; })();
  // guard restricted views when viewing as member
  const safeView = (!isOwner && ["team","settings","invoices","templates"].includes(view)) ? "dashboard" : view;

  return (
    <Ctx.Provider value={{db,setDb,update}}>
      <style>{CSS}</style>
      <div className="cd-root" style={{display:"flex"}}>
        <Sidebar view={safeView} setView={setView}/>
        <div style={{flex:1,minWidth:0}}>
          {db.viewAs!=="owner" && <div style={{background:C.ink,color:"#fff",padding:"8px 24px",fontSize:12.5,display:"flex",alignItems:"center",gap:8}}>
            <Eye size={14}/> Previewing as <b>{db.users.find(u=>u.id===db.viewAs)?.name}</b> — they only see tasks assigned to them.
            <button className="btn btn-sm" style={{marginLeft:"auto",background:"transparent",borderColor:"rgba(255,255,255,.3)",color:"#fff"}} onClick={()=>update(d=>{d.viewAs="owner";})}>Exit</button>
          </div>}
          <div style={{padding:"26px 30px",maxWidth:1180,margin:"0 auto"}}>
            {safeView==="dashboard" && <Dashboard now={now} go={go}/>}
            {safeView==="projects" && <Projects focusId={focusProject} clearFocus={()=>setFocusProject(null)}/>}
            {safeView==="tasks" && <Tasks/>}
            {safeView==="time" && <TimeTracking/>}
            {safeView==="calendar" && <Calendar/>}
            {safeView==="invoices" && <Invoices/>}
            {safeView==="notes" && <Notes/>}
            {safeView==="templates" && <Templates/>}
            {safeView==="team" && <Team/>}
            {safeView==="settings" && <SettingsView/>}
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}


/* ============================ auth screen + loader ============================ */
function Loader(){ return <><style>{CSS}</style><div className="cd-root" style={{display:"grid",placeItems:"center",height:"100vh"}}><div style={{width:34,height:34,border:`3px solid ${C.soft}`,borderTopColor:C.primary,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div></>; }

function AuthScreen(){
  const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [err,setErr]=useState("");
  const send=async()=>{ if(!email.trim())return; setBusy(true); setErr("");
    const { error }=await supabase.auth.signInWithOtp({ email:email.trim(), options:{ emailRedirectTo: window.location.origin } });
    setBusy(false); if(error)setErr(error.message); else setSent(true); };
  return <><style>{CSS}</style><div className="cd-root" style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:20}}>
    <div className="card" style={{padding:34,width:"100%",maxWidth:400}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${C.primary},${C.ink})`,display:"grid",placeItems:"center"}}><Briefcase size={18} color="#fff"/></div>
        <div style={{fontWeight:800,fontSize:18}}>Command Deck</div>
      </div>
      {sent ? <div style={{fontSize:14,color:C.ink2,lineHeight:1.6}}>Check your inbox — a magic sign-in link is on its way to <b>{email}</b>. Open it on this device to continue.</div> :
      <div style={{display:"grid",gap:12}}>
        <div className="smallcap">Sign in with your email — no password needed.</div>
        <input className="inp" type="email" value={email} placeholder="you@email.com" onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
        {err && <div style={{fontSize:12.5,color:C.danger}}>{err}</div>}
        <button className="btn btn-p" disabled={busy||!email.trim()} onClick={send} style={{justifyContent:"center"}}>{busy?"Sending…":"Send magic link"}</button>
      </div>}
    </div>
  </div></>;
}
