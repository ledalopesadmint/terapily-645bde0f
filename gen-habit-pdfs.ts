// Generate sample Habit Report PDFs with mock data for QA
import { jsPDF } from "jspdf";

const NAVY: [number, number, number] = [31, 42, 54];
const CREAM: [number, number, number] = [244, 239, 230];
const SAGE: [number, number, number] = [126, 155, 134];
const CHARCOAL: [number, number, number] = [58, 63, 71];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [192, 57, 43];
const MAUVE: [number, number, number] = [184, 155, 163];

const CARD_COLORS = {
  sage:     { bg: [237, 245, 239] as [number, number, number], accent: SAGE },
  mauve:    { bg: [245, 237, 241] as [number, number, number], accent: MAUVE },
  cream:    { bg: [247, 245, 240] as [number, number, number], accent: NAVY },
  teal:     { bg: [230, 245, 243] as [number, number, number], accent: [56, 142, 131] as [number, number, number] },
  amber:    { bg: [255, 248, 225] as [number, number, number], accent: [180, 130, 50] as [number, number, number] },
};

const HEATMAP_LEVELS: [number, number, number][] = [
  [235, 233, 228],
  [200, 220, 201],
  [126, 155, 134],
  [90, 124, 99],
  [58, 92, 67],
];

const MILESTONES = [7, 14, 21, 30, 60];

const M = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CW = PAGE_W - M * 2;
const FOOTER_ZONE = PAGE_H - 22;
const BAR_H = 18;
const CONTENT_GAP = 9;

type Variant = "patient" | "therapist";

// Mock data
const today = new Date();
today.setHours(0,0,0,0);
const patientName = "Sarah M.";
const activityTitle = "Guided Breathing (4-7-8)";

interface MockEntry {
  id: string;
  completed_at: string;
  duration_seconds: number | null;
  cycles_completed: number | null;
}

// Generate 45 entries over ~35 days with some gaps
const entries: MockEntry[] = [];
const uniqueDaysSet = new Set<string>();
let dayOffset = 0;
for (let i = 0; i < 45; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() - dayOffset);
  const hour = [7, 8, 12, 18, 21][Math.floor(Math.random() * 5)];
  d.setHours(hour, Math.floor(Math.random() * 60));
  entries.push({
    id: `entry-${i}`,
    completed_at: d.toISOString(),
    duration_seconds: 180 + Math.floor(Math.random() * 420), // 3-10 min
    cycles_completed: 3 + Math.floor(Math.random() * 5),
  });
  uniqueDaysSet.add(d.toISOString().slice(0,10));
  // Sometimes skip days for gaps
  if (Math.random() > 0.7) dayOffset += Math.floor(Math.random() * 4) + 2;
  else dayOffset += 1;
}

const uniqueDays = [...uniqueDaysSet].sort();
const countByDay: Record<string, number> = {};
for (const e of entries) {
  const d = new Date(e.completed_at).toISOString().slice(0, 10);
  countByDay[d] = (countByDay[d] ?? 0) + 1;
}

// Calculations
function calcStreak(sortedDesc: string[]): number {
  if (!sortedDesc.length) return 0;
  let streak = 1;
  const t = new Date().toISOString().slice(0,10);
  if (sortedDesc[0] !== t) {
    const y = new Date(); y.setDate(y.getDate()-1);
    if (sortedDesc[0] !== y.toISOString().slice(0,10)) return 0;
  }
  for (let i=1;i<sortedDesc.length;i++){
    const p=new Date(sortedDesc[i-1]),c=new Date(sortedDesc[i]);
    if(Math.abs((p.getTime()-c.getTime())/86400000-1)<0.01)streak++;else break;
  }
  return streak;
}
function calcLongestStreak(asc: string[]): number {
  if(!asc.length)return 0;let l=1,c=1;
  for(let i=1;i<asc.length;i++){
    const diff=(new Date(asc[i]).getTime()-new Date(asc[i-1]).getTime())/86400000;
    if(Math.abs(diff-1)<0.01){c++;if(c>l)l=c}else c=1;
  }return l;
}

const currentStreak = calcStreak(uniqueDays.slice().reverse());
const longestStreak = calcLongestStreak(uniqueDays);
const totalMinutes = entries.reduce((s,e)=>s+(e.duration_seconds??0),0)/60;
const totalCycles = entries.reduce((s,e)=>s+(e.cycles_completed??0),0);
let adherencePercent = 0;
if(uniqueDays.length>=2){
  const f=new Date(uniqueDays[0]),l=new Date(uniqueDays[uniqueDays.length-1]);
  const r=Math.max(1,Math.round((l.getTime()-f.getTime())/86400000)+1);
  adherencePercent=Math.round((uniqueDays.length/r)*100);
}

// DOW + period
const dowCounts=[0,0,0,0,0,0,0];
const periodCounts={morning:0,afternoon:0,evening:0};
let minDur=Infinity,maxDur=0;
for(const e of entries){
  const d=new Date(e.completed_at);dowCounts[d.getDay()]++;
  const h=d.getHours();
  if(h<12)periodCounts.morning++;else if(h<18)periodCounts.afternoon++;else periodCounts.evening++;
  if(e.duration_seconds!=null){if(e.duration_seconds<minDur)minDur=e.duration_seconds;if(e.duration_seconds>maxDur)maxDur=e.duration_seconds;}
}
const dowLabels=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const bestDowIdx=dowCounts.indexOf(Math.max(...dowCounts));
const bestDow=dowLabels[bestDowIdx];
const periodLabelsMap={morning:"Morning",afternoon:"Afternoon",evening:"Evening"};
const bestPeriod=Object.entries(periodCounts).sort((a,b)=>b[1]-a[1])[0];

// Consistency index
function calcCI(asc:string[]):number{
  if(asc.length<2)return asc.length===1?50:0;
  const f=new Date(asc[0]),l=new Date(asc[asc.length-1]);
  const td=Math.max(1,Math.round((l.getTime()-f.getTime())/86400000)+1);
  const freq=Math.min(1,asc.length/td)*40;
  const gaps:number[]=[];
  for(let i=1;i<asc.length;i++)gaps.push(Math.round((new Date(asc[i]).getTime()-new Date(asc[i-1]).getTime())/86400000));
  const avg=gaps.reduce((s,g)=>s+g,0)/gaps.length;
  const v=gaps.reduce((s,g)=>s+Math.pow(g-avg,2),0)/gaps.length;
  const cv=avg>0?Math.sqrt(v)/avg:0;
  const reg=Math.max(0,(1-Math.min(cv,2)/2))*30;
  const big=gaps.filter(g=>g>3).length;
  const gp=Math.max(0,(1-big/gaps.length))*30;
  return Math.round(freq+reg+gp);
}
const consistencyIndex=calcCI(uniqueDays);

// Weekly trend
function countInRange(daysAgo:number,daysEnd:number):number{
  const s=new Date(today);s.setDate(s.getDate()-daysEnd);
  const e2=new Date(today);e2.setDate(e2.getDate()-daysAgo);
  return entries.filter(e=>{const d=new Date(e.completed_at);return d>=s&&d<e2}).length;
}
const thisWeekCount=countInRange(0,7);
const lastWeekCount=countInRange(7,14);
const trendPercent=lastWeekCount===0?(thisWeekCount>0?100:0):Math.round(((thisWeekCount-lastWeekCount)/lastWeekCount)*100);
const trendArrow=trendPercent>0?"up":trendPercent<0?"down":"right";

// Gaps
const gaps:{start:string;end:string;days:number}[]=[];
for(let i=1;i<uniqueDays.length;i++){
  const diff=Math.round((new Date(uniqueDays[i]).getTime()-new Date(uniqueDays[i-1]).getTime())/86400000);
  if(diff>3)gaps.push({start:uniqueDays[i-1],end:uniqueDays[i],days:diff});
}

const milestonesReached=MILESTONES.filter(m=>uniqueDays.length>=m);

// Longest session
let longestEntry=entries[0];
for(const e of entries)if((e.duration_seconds??0)>(longestEntry.duration_seconds??0))longestEntry=e;

// Practice highlights
const highlights:string[]=[];
if(currentStreak>=3)highlights.push(`You've practiced ${currentStreak} days in a row.`);
if(longestStreak>=7)highlights.push(`Your longest streak reached ${longestStreak} consecutive days.`);
if(entries.length>=10)highlights.push(`You've completed ${entries.length} sessions so far.`);
if(adherencePercent>=70)highlights.push(`Your adherence rate is ${adherencePercent}% - above average.`);
if(uniqueDays.length>=21)highlights.push(`You've been active on ${uniqueDays.length} different days.`);
if(bestPeriod[1]>0&&entries.length>=5)highlights.push(`${periodLabelsMap[bestPeriod[0] as keyof typeof periodLabelsMap]}s on ${bestDow}s seem to work best for you.`);
const finalHighlights=highlights.slice(0,4);

function formatDate(iso:string):string{return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function formatDateTime(d:Date):string{return `${d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} at ${d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}`;}

function buildPDF(variant: Variant): Uint8Array {
  const doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  let y=0, currentPage=1;

  function drawHeader():number{
    doc.setFillColor(...NAVY);doc.rect(0,0,PAGE_W,BAR_H,"F");
    doc.setFont("times","bold");doc.setFontSize(16);doc.setTextColor(...CREAM);
    doc.text("terapily",M+14,BAR_H/2+2);
    const tw=doc.getTextWidth("terapily");doc.setTextColor(...SAGE);doc.text(".",M+14+tw,BAR_H/2+2);
    return BAR_H;
  }
  function drawFooter(page:number,total:number){
    const fy=PAGE_H-14;doc.setDrawColor(200,200,200);doc.setLineWidth(0.3);doc.line(M,fy-2,PAGE_W-M,fy-2);
    doc.setFont("times","bold");doc.setFontSize(7.5);doc.setTextColor(...NAVY);doc.text("terapily",M+5,fy+2);
    const tw2=doc.getTextWidth("terapily");doc.setTextColor(...SAGE);doc.text(".",M+5+tw2,fy+2);
    doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);doc.text(`· ${new Date().getFullYear()}`,M+5+tw2+2,fy+2);
    doc.setFontSize(7);doc.text(`${page} / ${total}`,PAGE_W/2,fy+2,{align:"center"});
    doc.setFontSize(5.5);doc.setTextColor(153,153,153);
    const dis=variant==="therapist"?"Platform-generated adherence summary. Does not replace clinical documentation in your EHR.":"This summary was generated by Terapily. It is not a diagnosis or treatment recommendation.";
    doc.text(dis,PAGE_W-M,fy+2,{align:"right"});
  }
  function checkPage(cy:number,needed:number):number{
    if(cy+needed>FOOTER_ZONE){doc.addPage();currentPage++;const hY=drawHeader();return hY+CONTENT_GAP;}return cy;
  }
  function sectionTitle(text:string,atY:number):number{
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...NAVY);doc.text(text,M,atY);return atY+5;
  }

  y=drawHeader();

  if(variant==="therapist"){
    doc.setFillColor(253,232,232);doc.rect(0,y,PAGE_W,10,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...RED);
    doc.text("CLINICIAN COPY — NOT INTENDED FOR PATIENT DISTRIBUTION",PAGE_W/2,y+6,{align:"center"});y+=12;
  }else{y+=5;}

  // Title
  doc.setFont("times","bold");doc.setFontSize(20);doc.setTextColor(...NAVY);
  const title=variant==="patient"?"Mindfulness Practice Summary":"Mindfulness Adherence Report";
  doc.text(title,M,y+5);y+=10;
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(...CHARCOAL);
  const sub=variant==="patient"?"Your practice journey at a glance":"Summary of recorded mindfulness practice entries for your clinical records";
  doc.text(sub,M,y);y+=8;

  // Info box
  const infoLines:[string,string][]=[
    ["Participant",patientName],["Activity",activityTitle],
    ["Period",uniqueDays.length>0?`${formatDate(uniqueDays[0])} — ${formatDate(uniqueDays[uniqueDays.length-1])}`:"—"],
    ["Total Sessions",`${entries.length}`],
  ];
  if(variant==="therapist"){
    infoLines.push(["Therapist","Dr. Amanda Chen"],["Practice","Mindful Wellness Center"],["License","PSY-28451"],["NPI","1234567890"]);
  }
  infoLines.push(["Generated",formatDateTime(new Date())]);
  const infoBoxH=12+infoLines.length*6;
  doc.setFillColor(247,245,240);doc.roundedRect(M,y,CW,infoBoxH,2,2,"F");
  let iy=y+10;
  for(const[label,value]of infoLines){
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text(label,M+4,iy);
    doc.setFont("helvetica","normal");doc.setTextColor(...CHARCOAL);doc.text(value,M+35,iy);iy+=6;
  }
  y+=infoBoxH+8;

  // Practice Highlights (patient)
  if(variant==="patient"&&finalHighlights.length>0){
    y=checkPage(y,10+finalHighlights.length*6);
    doc.setFillColor(237,245,239);doc.roundedRect(M,y,CW,8+finalHighlights.length*5.5,2,2,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...SAGE);doc.text("PRACTICE HIGHLIGHTS",M+4,y+6);
    let hy=y+11;doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...CHARCOAL);
    for(const h of finalHighlights){doc.text(`•  ${h}`,M+6,hy);hy+=5.5;}
    y+=10+finalHighlights.length*5.5+4;
  }

  // Streak Hero
  y=checkPage(y,36);
  doc.setFillColor(...CARD_COLORS.sage.bg);doc.roundedRect(M,y,CW,30,3,3,"F");
  doc.setFont("helvetica","bold");doc.setFontSize(32);doc.setTextColor(...NAVY);
  doc.text(`${currentStreak}`,M+20,y+18,{align:"center"});
  doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...CHARCOAL);
  doc.text("CURRENT",M+20,y+23,{align:"center"});doc.text("STREAK",M+20,y+27,{align:"center"});
  doc.setDrawColor(200,210,200);doc.setLineWidth(0.3);doc.line(M+40,y+5,M+40,y+25);
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.setTextColor(...SAGE);doc.text(`${longestStreak}d`,M+55,y+14);
  doc.setFont("helvetica","normal");doc.setFontSize(6);doc.setTextColor(...CHARCOAL);doc.text("LONGEST STREAK",M+55,y+20);
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.setTextColor(...CARD_COLORS.teal.accent);doc.text(`${adherencePercent}%`,M+95,y+14);
  doc.setFont("helvetica","normal");doc.setFontSize(6);doc.setTextColor(...CHARCOAL);doc.text("ADHERENCE",M+95,y+20);
  const barX2=M+120;const barTotalW=CW-120-4;
  doc.setFillColor(220,218,210);doc.roundedRect(barX2,y+11,barTotalW,5,1.5,1.5,"F");
  if(adherencePercent>0){const fw=Math.max(3,(adherencePercent/100)*barTotalW);doc.setFillColor(...SAGE);doc.roundedRect(barX2,y+11,fw,5,1.5,1.5,"F");}
  y+=36;

  // Consistency Index
  y=checkPage(y,22);
  doc.setFillColor(247,245,240);doc.roundedRect(M,y,CW,16,2,2,"F");
  const ciX=M+14,ciY2=y+8,ciR=5.5;
  doc.setDrawColor(220,218,210);doc.setLineWidth(1.8);doc.circle(ciX,ciY2,ciR,"S");
  if(consistencyIndex>0){
    const ciColor=consistencyIndex>=70?SAGE:consistencyIndex>=40?CARD_COLORS.amber.accent:MAUVE;
    doc.setDrawColor(...ciColor);doc.setLineWidth(1.8);
    const arcAngle=(consistencyIndex/100)*360;const steps=Math.max(1,Math.round(arcAngle/10));
    for(let s=0;s<steps;s++){
      const a1=-90+(s/steps)*arcAngle,a2=-90+((s+1)/steps)*arcAngle;
      doc.line(ciX+ciR*Math.cos(a1*Math.PI/180),ciY2+ciR*Math.sin(a1*Math.PI/180),ciX+ciR*Math.cos(a2*Math.PI/180),ciY2+ciR*Math.sin(a2*Math.PI/180));
    }
  }
  doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(...NAVY);doc.text(`${consistencyIndex}`,ciX,ciY2+2,{align:"center"});
  doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text("Consistency Index",M+26,y+6);
  doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);
  const ciDesc=consistencyIndex>=70?"High regularity in practice frequency and timing.":consistencyIndex>=40?"Moderate regularity — practice occurs but with some variability.":"Building a routine — frequency and timing are still variable.";
  doc.text(ciDesc,M+26,y+11);
  doc.setFontSize(5);doc.setTextColor(153,153,153);doc.text("This index measures practice regularity, not clinical outcomes. It is not a health metric.",M+26,y+15);
  y+=20;

  // Stats Cards
  y=checkPage(y,24);
  const statsData=[
    {label:"TOTAL SESSIONS",value:`${entries.length}`,colorKey:"sage"as const},
    {label:"ACTIVE DAYS",value:`${uniqueDays.length}`,colorKey:"mauve"as const},
    {label:"TOTAL TIME",value:totalMinutes>=60?`${(totalMinutes/60).toFixed(1)}h`:`${Math.round(totalMinutes)}min`,colorKey:"cream"as const},
    {label:"AVG DURATION",value:`${Math.round(totalMinutes/entries.length)}min`,colorKey:"teal"as const},
    {label:"AVG/DAY",value:`${(entries.length/uniqueDays.length).toFixed(1)}`,colorKey:"amber"as const},
  ];
  const cardW=(CW-4*3)/5;
  for(let i=0;i<statsData.length;i++){
    const cx=M+i*(cardW+3);const colors=CARD_COLORS[statsData[i].colorKey];
    doc.setFillColor(...colors.bg);doc.roundedRect(cx,y,cardW,18,1.5,1.5,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(12);doc.setTextColor(...colors.accent);
    doc.text(statsData[i].value,cx+cardW/2,y+9,{align:"center"});
    doc.setFont("helvetica","normal");doc.setFontSize(4.5);doc.setTextColor(...CHARCOAL);
    doc.text(statsData[i].label,cx+cardW/2,y+14,{align:"center"});
  }
  y+=24;

  // Milestones
  if(milestonesReached.length>0){
    y=checkPage(y,14);y=sectionTitle("MILESTONES REACHED",y);
    const msW=CW/MILESTONES.length;
    for(let i=0;i<MILESTONES.length;i++){
      const mx=M+i*msW+msW/2;const reached=milestonesReached.includes(MILESTONES[i]);
      if(reached){doc.setFillColor(...SAGE);doc.circle(mx,y+3,3.5,"F");}
      else{doc.setDrawColor(220,218,210);doc.setLineWidth(0.5);doc.circle(mx,y+3,3.5,"S");}
      doc.setFont("helvetica","normal");doc.setFontSize(5);
      doc.setTextColor(reached?NAVY[0]:180,reached?NAVY[1]:180,reached?NAVY[2]:180);
      doc.text(`${MILESTONES[i]}d`,mx,y+9,{align:"center"});
    }
    y+=14;
  }

  // Heatmap
  y=checkPage(y,55);y=sectionTitle("ACTIVITY HEATMAP — 8 WEEKS",y);
  const cellSize=5,cellGap=1.2;
  const heatmapDays:{date:string;count:number}[]=[];
  for(let i=55;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);heatmapDays.push({date:k,count:countByDay[k]??0});}
  const hmMax=Math.max(1,...heatmapDays.map(d=>d.count));
  const labelOff=10;
  const dayLs=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  doc.setFont("helvetica","normal");doc.setFontSize(5);doc.setTextColor(150,150,150);
  for(let r=0;r<7;r++){if(r%2===1)doc.text(dayLs[r],M,y+r*(cellSize+cellGap)+cellSize/2+1);}
  for(let i=0;i<heatmapDays.length;i++){
    const col=Math.floor(i/7),row=i%7;
    const cx2=M+labelOff+col*(cellSize+cellGap),cy2=y+row*(cellSize+cellGap);
    let level=0;if(heatmapDays[i].count>0){const r=heatmapDays[i].count/hmMax;level=r<=0.25?1:r<=0.5?2:r<=0.75?3:4;}
    doc.setFillColor(...HEATMAP_LEVELS[level]);doc.roundedRect(cx2,cy2,cellSize,cellSize,1,1,"F");
  }
  let lastMo=-1;
  for(let i=0;i<heatmapDays.length;i+=7){const d=new Date(heatmapDays[i].date);if(d.getMonth()!==lastMo){lastMo=d.getMonth();const col=Math.floor(i/7);doc.setFontSize(5);doc.setTextColor(150,150,150);doc.text(d.toLocaleDateString("en-US",{month:"short"}),M+labelOff+col*(cellSize+cellGap),y-1.5);}}
  const legX=M+labelOff+8*(cellSize+cellGap)+8,legY=y+3;
  doc.setFontSize(4.5);doc.setTextColor(150,150,150);doc.text("Less",legX,legY+3);
  for(let l=0;l<5;l++){doc.setFillColor(...HEATMAP_LEVELS[l]);doc.roundedRect(legX+8+l*(cellSize+0.8),legY,cellSize-0.5,cellSize-0.5,0.8,0.8,"F");}
  doc.text("More",legX+8+5*(cellSize+0.8)+1,legY+3);
  y+=7*(cellSize+cellGap)+4;

  // Best Pattern
  if(entries.length>=3){
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...SAGE);
    doc.text(`Best pattern: ${bestDow}s, ${periodLabelsMap[bestPeriod[0] as keyof typeof periodLabelsMap]} (${bestPeriod[1]} of ${entries.length} sessions)`,M,y+2);y+=7;
  }else y+=3;

  // Daily Frequency
  y=checkPage(y,50);y=sectionTitle("DAILY FREQUENCY — LAST 30 DAYS",y);
  const chartH=35;const last30:{date:string;count:number}[]=[];
  for(let i=29;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);last30.push({date:k,count:countByDay[k]??0});}
  const maxCount=Math.max(1,...last30.map(d=>d.count));const bW=CW/30;
  doc.setDrawColor(220,218,210);doc.setLineWidth(0.15);
  for(let g=0;g<=4;g++){const gy2=y+chartH-(g/4)*chartH;doc.setLineDashPattern([1,1.5],0);doc.line(M,gy2,M+CW,gy2);}
  doc.setLineDashPattern([],0);
  doc.setFont("helvetica","normal");doc.setFontSize(5);doc.setTextColor(150,150,150);
  doc.text(`${maxCount}`,M-2,y+2,{align:"right"});doc.text("0",M-2,y+chartH+1,{align:"right"});
  for(let i=0;i<last30.length;i++){
    const bh=last30[i].count===0?0:(last30[i].count/maxCount)*chartH;
    const bx=M+i*bW+bW*0.15,bw=bW*0.7;
    if(bh>0){const ratio=last30[i].count/maxCount;doc.setFillColor(Math.round(126-ratio*95),Math.round(155-ratio*113),Math.round(134-ratio*80));doc.roundedRect(bx,y+chartH-bh,bw,bh,0.8,0.8,"F");
      if(last30[i].count>0){doc.setFont("helvetica","bold");doc.setFontSize(4.5);doc.setTextColor(...NAVY);doc.text(`${last30[i].count}`,bx+bw/2,y+chartH-bh-1.5,{align:"center"});}}
    if(i%5===0||i===29){doc.setFont("helvetica","normal");doc.setFontSize(4.5);doc.setTextColor(150,150,150);
      doc.text(new Date(last30[i].date).toLocaleDateString("en-US",{day:"numeric",month:"short"}),bx+bw/2,y+chartH+4,{align:"center"});}
  }
  y+=chartH+10;

  // Therapist-only sections
  if(variant==="therapist"){
    // Numeric Trend
    y=checkPage(y,18);doc.setFillColor(237,245,239);doc.roundedRect(M,y,CW,12,2,2,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text("WEEKLY TREND",M+4,y+5);
    const tc=trendPercent>0?SAGE:trendPercent<0?RED:CHARCOAL;
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(...tc);
    const arrow=trendPercent>0?"+":trendPercent<0?"":"";
    doc.text(`${arrow}${trendPercent}%`,M+50,y+7);
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...CHARCOAL);
    doc.text(`This week: ${thisWeekCount} sessions  |  Last week: ${lastWeekCount} sessions`,M+80,y+7);
    y+=16;

    // Weekly Comparison
    y=checkPage(y,50);y=sectionTitle("WEEKLY COMPARISON — LAST 8 WEEKS",y);
    const wCounts:{label:string;count:number}[]=[];
    for(let w=7;w>=0;w--){const ws=new Date(today);ws.setDate(ws.getDate()-w*7);let wc=0;
      for(let d=0;d<7;d++){const dd=new Date(ws);dd.setDate(dd.getDate()+d);wc+=countByDay[dd.toISOString().slice(0,10)]??0;}
      wCounts.push({label:ws.toLocaleDateString("en-US",{month:"short",day:"numeric"}),count:wc});}
    const wMax=Math.max(1,...wCounts.map(w=>w.count));const wCH=28,wBW=CW/8;
    for(let i=0;i<wCounts.length;i++){
      const bh=wCounts[i].count===0?0:(wCounts[i].count/wMax)*wCH;const bx=M+i*wBW+wBW*0.2,bw=wBW*0.6;
      if(bh>0){doc.setFillColor(...SAGE);doc.roundedRect(bx,y+wCH-bh,bw,bh,1,1,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(5);doc.setTextColor(...NAVY);doc.text(`${wCounts[i].count}`,bx+bw/2,y+wCH-bh-1.5,{align:"center"});}
      doc.setFont("helvetica","normal");doc.setFontSize(4.5);doc.setTextColor(150,150,150);doc.text(wCounts[i].label,bx+bw/2,y+wCH+4,{align:"center"});}
    y+=wCH+10;

    // Practice Patterns
    y=checkPage(y,55);y=sectionTitle("PRACTICE PATTERNS",y);y+=1;
    const dowMax2=Math.max(1,...dowCounts);
    doc.setFillColor(...NAVY);doc.roundedRect(M,y,CW/2-2,7,1,1,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.setTextColor(...WHITE);
    doc.text("DAY",M+3,y+4.5);doc.text("SESSIONS",M+25,y+4.5);y+=8;
    const dls2=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for(let d=0;d<7;d++){
      if(d%2===0){doc.setFillColor(249,247,243);doc.rect(M,y,CW/2-2,5.5,"F");}
      doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);
      doc.text(dls2[d],M+3,y+3.8);doc.text(`${dowCounts[d]}`,M+28,y+3.8);
      const bl=dowCounts[d]===0?0:(dowCounts[d]/dowMax2)*40;
      if(bl>0){doc.setFillColor(...SAGE);doc.roundedRect(M+38,y+1,bl,3.5,0.8,0.8,"F");}y+=5.5;}
    y+=3;
    const pref=Object.entries(periodCounts).sort((a,b)=>b[1]-a[1])[0];
    const plDet={morning:"Morning (6am-12pm)",afternoon:"Afternoon (12pm-6pm)",evening:"Evening (6pm-12am)"};
    doc.setFont("helvetica","normal");doc.setFontSize(7);doc.setTextColor(...CHARCOAL);
    doc.text(`Preferred time: ${plDet[pref[0] as keyof typeof plDet]} (${pref[1]} sessions)`,M,y);y+=5;
    if(minDur<Infinity){doc.text(`Session duration range: ${Math.round(minDur/60)}min — ${Math.round(maxDur/60)}min`,M,y);y+=5;}
    if(totalCycles>0){doc.text(`Total cycles completed: ${totalCycles}`,M,y);y+=5;}y+=3;

    // Inactivity Gaps
    if(gaps.length>0){
      y=checkPage(y,12+Math.min(gaps.length,10)*7);y=sectionTitle("INACTIVITY GAPS (> 3 DAYS)",y);y+=1;
      for(const gap of gaps.slice(0,10)){
        y=checkPage(y,8);doc.setFillColor(...CARD_COLORS.mauve.bg);doc.roundedRect(M,y,CW,6,1,1,"F");
        doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);
        doc.text(`${formatDate(gap.start)} → ${formatDate(gap.end)}`,M+3,y+4);
        doc.setFont("helvetica","bold");doc.setTextColor(...MAUVE);doc.text(`${gap.days} days`,M+CW-3,y+4,{align:"right"});y+=7;}
      y+=4;
    }

    // Session Log (therapist)
    const tlEntries=entries.slice(0,30);
    if(tlEntries.length>0){
      y=checkPage(y,18);y=sectionTitle("SESSION LOG",y);y+=2;
      function drawTH(sy:number):number{
        doc.setFillColor(...NAVY);doc.roundedRect(M,sy,CW,7,1,1,"F");
        doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.setTextColor(...WHITE);
        doc.text("DATE",M+4,sy+4.5);doc.text("TIME",M+40,sy+4.5);doc.text("DURATION",M+70,sy+4.5);doc.text("CYCLES",M+105,sy+4.5);return sy+9;}
      y=drawTH(y);let prevP=currentPage;
      for(let i=0;i<tlEntries.length;i++){
        y=checkPage(y,6);if(currentPage!==prevP){y=drawTH(y);prevP=currentPage;}
        const e=tlEntries[i];if(i%2===0){doc.setFillColor(249,247,243);doc.rect(M,y,CW,5.5,"F");}
        doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);
        const d=new Date(e.completed_at);
        doc.text(d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),M+4,y+3.8);
        doc.text(d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),M+40,y+3.8);
        doc.text(e.duration_seconds!=null?`${Math.round(e.duration_seconds/60)} min`:"—",M+70,y+3.8);
        doc.text(e.cycles_completed!=null?`${e.cycles_completed}`:"—",M+105,y+3.8);y+=5.5;}y+=4;
    }
  } else {
    // Patient: Visual Timeline
    const tlEntries=entries.slice(0,10);
    if(tlEntries.length>0){
      y=checkPage(y,18+tlEntries.length*10);y=sectionTitle("RECENT SESSIONS",y);y+=2;
      for(let i=0;i<tlEntries.length;i++){
        y=checkPage(y,10);const e=tlEntries[i];const d=new Date(e.completed_at);
        const dur=e.duration_seconds!=null?Math.round(e.duration_seconds/60):null;
        const isLong=longestEntry&&e.id===longestEntry.id;const dotX=M+4,dotY2=y+3,dotR2=isLong?2.5:1.8;
        doc.setFillColor(isLong?SAGE[0]:NAVY[0],isLong?SAGE[1]:NAVY[1],isLong?SAGE[2]:NAVY[2]);doc.circle(dotX,dotY2,dotR2,"F");
        if(i<tlEntries.length-1){doc.setDrawColor(220,218,210);doc.setLineWidth(0.3);doc.line(dotX,dotY2+dotR2+0.5,dotX,y+9);}
        doc.setFont("helvetica","bold");doc.setFontSize(7);doc.setTextColor(...NAVY);
        doc.text(d.toLocaleDateString("en-US",{month:"short",day:"numeric"}),M+10,y+3);
        doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(...CHARCOAL);
        doc.text(d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),M+35,y+3);
        if(dur!=null)doc.text(`${dur} min`,M+55,y+3);
        if(e.cycles_completed!=null)doc.text(`${e.cycles_completed} cycles`,M+73,y+3);
        if(isLong){doc.setFont("helvetica","bold");doc.setFontSize(5);doc.setTextColor(...SAGE);doc.text("LONGEST",M+CW-3,y+3,{align:"right"});}
        y+=9;
      }
      if(entries.length>10){doc.setFont("helvetica","normal");doc.setFontSize(6);doc.setTextColor(150,150,150);doc.text(`+ ${entries.length-10} earlier sessions`,M+10,y+1);y+=5;}
      y+=4;
    }
  }

  // Notice
  y=checkPage(y,36);
  if(variant==="patient"){
    doc.setFillColor(255,248,225);doc.setDrawColor(240,208,96);doc.setLineWidth(0.4);doc.roundedRect(M,y,CW,28,2,2,"FD");
    doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text("About This Report",M+6,y+7);
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...CHARCOAL);
    const nLines=["This report shows your mindfulness practice frequency and consistency over time.",
      "It is provided for informational purposes and does not constitute a clinical assessment.",
      "The Consistency Index measures regularity of practice, not health outcomes.",
      "Please discuss your practice patterns with your therapist for personalized guidance."];
    let ny2=y+12;for(const l of nLines){doc.text(l,M+6,ny2);ny2+=4;}
  }else{
    doc.setFont("times","bold");doc.setFontSize(12);doc.setTextColor(...NAVY);doc.text("Notices",M,y+5);y+=12;
    const notices=["This report is a platform-generated summary of mindfulness practice adherence data. It reproduces session timestamps, durations, and cycle counts exactly as recorded by the patient.",
      "The Consistency Index (0-100) measures regularity of practice based on frequency, timing regularity, and gap penalization. It is not a clinical metric and should not be used to evaluate treatment efficacy.",
      "Clinical interpretation of adherence patterns, including the significance of gaps and frequency changes, remains the sole responsibility of the treating clinician.",
      "Practice data is recorded via reusable habit links and is not considered Protected Health Information (PHI) in isolation. However, when linked to patient identity, handle according to your practice's privacy policies."];
    for(const n of notices){
      y=checkPage(y,14);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...CHARCOAL);
      const wr=doc.splitTextToSize(n,CW-2);for(const l of wr){y=checkPage(y,5);doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(...CHARCOAL);doc.text(l,M,y);y+=4;}y+=3;}
  }

  // Footer
  const tp=doc.getNumberOfPages();for(let p=1;p<=tp;p++){doc.setPage(p);drawFooter(p,tp);}
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

// Generate both
import { writeFileSync } from "fs";
const patientPdf = buildPDF("patient");
writeFileSync("/mnt/documents/habit-report-patient-sample.pdf", patientPdf);
const therapistPdf = buildPDF("therapist");
writeFileSync("/mnt/documents/habit-report-therapist-sample.pdf", therapistPdf);
console.log("Done! Generated both PDFs.");
