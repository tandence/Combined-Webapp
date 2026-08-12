const STORAGE_KEY = 'pain-jigsaw-anchor-builder-3d-prototype-v1';
const SOURCE_STORAGE_KEY = 'pain-jigsaw-anchor-builder-v1';
if(!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(SOURCE_STORAGE_KEY)){
  localStorage.setItem(STORAGE_KEY, localStorage.getItem(SOURCE_STORAGE_KEY));
}
const PIECE_W = 186;
const PIECE_H = 154;
const TAB = 28;
const NS = 'http://www.w3.org/2000/svg';

const catalogue = [
  {id:'toolbox',label:'Self Management Toolbox',fill:'#B9D3DD',text:'#174C7B',href:'toolbox.html',img:'assets/pieces-3d-png/toolbox.png?v=5'},
  {id:'acceptance',label:'Acceptance',fill:'#E4BE6C',text:'#8A4A18',href:'acceptance.html',img:'assets/pieces-3d-png/acceptance-final.png?v=19'},
  {id:'understand',label:'Understand Your Condition',fill:'#1A8F9E',text:'#FFFFFF',href:'understand.html',img:'assets/pieces-3d-png/understand-final-v2.png?v=17'},
  {id:'reconnect',label:'Get Involved & Re-connect to Life',fill:'#E4BE6C',text:'#8A4A18',href:'reconnect.html',img:'assets/pieces-3d-png/reconnect.png?v=5'},
  {id:'activity',label:'Activity Management',fill:'#56B3A7',text:'#174C7B',href:'activity.html',img:'assets/pieces-3d-png/activity.png?v=5'},
  {id:'movement',label:'Movement',fill:'#E07A7A',text:'#9D1515',href:'movement.html',img:'assets/pieces-3d-png/movement-final.png?v=19'},
  {id:'nutrition',label:'Nutrition & Lifestyle Choices',fill:'#E2CFCF',text:'#C12F8A',href:'nutrition.html',img:'assets/pieces-3d-png/nutrition.png?v=5'},
  {id:'thoughts',label:'Managing Thoughts & Emotions',fill:'#1A8F9E',text:'#FFFFFF',href:'thoughts.html',img:'assets/pieces-3d-png/thoughts.png?v=5'},
  {id:'sleep',label:'Sleep',fill:'#B9D3DD',text:'#174C7B',href:'sleep.html',img:'assets/pieces-3d-png/sleep-final.png?v=17'},
  {id:'relaxation',label:'Relaxation & Mindfulness',fill:'#E4BE6C',text:'#8A4A18',href:'relaxation.html',img:'assets/pieces-3d-png/relaxation.png?v=5'},
  {id:'goals',label:'Setting Goals Important To You',fill:'#56B3A7',text:'#174C7B',href:'setting-goals.html',img:'assets/pieces-3d-png/goals.png?v=5'},
  {id:'medication',label:'Medication',fill:'#E47C7C',text:'#9D1515',href:'medication.html',img:'assets/pieces-3d-png/medication-final-v2.png?v=21'},
  {id:'communication',label:'Communication',fill:'#D8C7C7',text:'#C12F8A',href:'communication.html',img:'assets/pieces-3d-png/communication-final.png?v=26'},
  {id:'flare',label:'Flare Ups',fill:'#1A8F9E',text:'#FFFFFF',href:'flare-ups.html',img:'assets/pieces-3d-png/flare-final.png?v=17'}
];

const customPiecePalette = [
  {fill:'#B9D3DD',text:'#174C7B'},
  {fill:'#E4BE6C',text:'#5B3515'},
  {fill:'#56B3A7',text:'#113F4A'},
  {fill:'#E47C7C',text:'#611515'},
  {fill:'#D8C7C7',text:'#6F2456'}
];

const nextStepPrompts = {
  toolbox:'Which practical tool would feel useful to try first?',
  acceptance:'What might making a little room for this experience look like?',
  understand:'What is one question you would like to understand more clearly?',
  reconnect:'What is one meaningful activity or connection you could gently revisit?',
  activity:'What would a small, manageable first step look like this week?',
  movement:'What kind of comfortable movement could you begin with?',
  nutrition:'Is there one realistic everyday habit you would like to try?',
  thoughts:'What could help you respond more gently to a difficult thought or feeling?',
  sleep:'Is there one small change that might help your sleep routine feel steadier?',
  relaxation:'When could you make space for a brief calming or mindful pause?',
  goals:'What is the smallest useful step towards something that matters to you?',
  medication:'Is there a medication question you would like to discuss with a healthcare professional?',
  communication:'Who could you talk with, and what would you like them to understand?',
  flare:'What could you prepare now to support yourself during a flare-up?',
  custom:'What is one gentle first step you could take?'
};

const svg = document.getElementById('builderSvg');
const library = document.getElementById('pieceLibrary');
const summary = document.getElementById('summaryList');
const empty = document.getElementById('canvasEmpty');
const status = document.getElementById('builderStatus');
const focusCount = document.getElementById('focusCount');
const pieceCount = document.getElementById('pieceCount');
const libraryPrompt = document.getElementById('libraryPrompt');
const canvasInstruction = document.getElementById('canvasInstruction');
const customInput = document.getElementById('customPieceName');
const pendingPlacement = document.getElementById('pendingPlacement');
const pendingThumb = document.getElementById('pendingThumb');
const pendingLabel = document.getElementById('pendingLabel');
const pendingMessage = document.getElementById('pendingMessage');
const selectedPiecePanel = document.getElementById('selectedPiecePanel');
const selectedPieceThumb = document.getElementById('selectedPieceThumb');
const selectedPieceName = document.getElementById('selectedPieceName');
const focusPieceBtn = document.getElementById('focusPieceBtn');
const learnMoreLink = document.getElementById('learnMoreLink');
const removePieceBtn = document.getElementById('removePieceBtn');
const nextStepsPanel = document.getElementById('nextStepsPanel');
const nextStepIdeas = document.getElementById('nextStepIdeas');
const nextStepsText = document.getElementById('nextStepsText');

let state = { pieces: [], pending: null, selectedUid: null, nextStepsText: '' };
let pictureMode = false;
let pictureLayout = new Map();
let placementNotice = null;
let printSnapshot = null;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved && Array.isArray(saved.pieces)) state = {...state, ...saved, pending:null};
} catch {}
state.pieces=state.pieces.map(piece=>{const current=catalogue.find(item=>item.id===piece.id);if(current)return {...piece,img:current.img,fill:current.fill,text:current.text,href:current.href};if(piece.id==='custom')return {...piece,img:customPieceThumbnail(piece.label,piece.fill,piece.text)};return piece;});

const keyFor = (x,y) => `${x},${y}`;
const occupiedMap = () => new Map(state.pieces.map(p => [keyFor(p.x,p.y), p]));
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({...state,pending:null}));

function randomCustomStyle(){
  const previous=[...state.pieces].reverse().find(piece=>piece.id==='custom')?.fill;
  const available=customPiecePalette.filter(style=>style.fill!==previous);
  const palette=available.length?available:customPiecePalette;
  let index;
  if(globalThis.crypto?.getRandomValues){
    const value=new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    index=value[0]%palette.length;
  }else{
    index=Math.floor(Math.random()*palette.length);
  }
  return palette[index];
}

function customPieceThumbnail(label,fill,textColor){
  const shape='M 0 0 '+horizontalEdge(0,PIECE_W,0,-1)+' '+verticalEdge(0,PIECE_H,PIECE_W,-1)+' '+horizontalEdge(0,PIECE_W,PIECE_H,-1,false)+' '+verticalEdge(0,PIECE_H,0,1,false)+' Z';
  const renderedLines=lines(label).slice(0,3);
  const metrics=labelMetrics(renderedLines,112);
  const startY=PIECE_H/2-(renderedLines.length-1)*metrics.lineGap/2;
  const safeText=renderedLines.map((line,index)=>`<tspan x="${PIECE_W/2}" dy="${index?metrics.lineGap:0}">${escapeHtml(line)}</tspan>`).join('');
  const svgMarkup=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -36 210 225"><defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".28" stop-color="#fff" stop-opacity=".16"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#173f50" stop-opacity=".2"/></linearGradient><filter id="shadow" x="-30%" y="-30%" width="170%" height="190%"><feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="#173f50" flood-opacity=".28"/></filter></defs><g filter="url(#shadow)"><path d="${shape}" transform="translate(0 8)" fill="#315c67" opacity=".7"/><path d="${shape}" fill="${fill}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="${shape}" fill="url(#shine)"/><path d="${shape}" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width="2" stroke-linejoin="round"/><text x="${PIECE_W/2}" y="${startY}" text-anchor="middle" fill="${textColor}" font-family="Arial,Helvetica,sans-serif" font-size="${metrics.fontSize}" font-weight="700">${safeText}</text></g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
}
function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function announce(message){
  status.textContent = message;
  window.clearTimeout(announce.timer);
  announce.timer = window.setTimeout(() => { if(status.textContent === message) status.textContent = ''; }, 3200);
}

function lines(label){
  const words=label.trim().split(/\s+/).filter(Boolean);
  if(words.length<2) return words;
  let best={lines:[label],score:Number.POSITIVE_INFINITY};
  const consider=parts=>{
    const lengths=parts.map(part=>part.length),longest=Math.max(...lengths),shortest=Math.min(...lengths);
    const score=longest+parts.length*7+Math.max(0,longest-16)*8+(longest-shortest)*.18;
    if(score<best.score) best={lines:parts,score};
  };
  consider([words.join(' ')]);
  for(let first=1;first<words.length;first++) consider([words.slice(0,first).join(' '),words.slice(first).join(' ')]);
  for(let first=1;first<words.length-1;first++){
    for(let second=first+1;second<words.length;second++) consider([words.slice(0,first).join(' '),words.slice(first,second).join(' '),words.slice(second).join(' ')]);
  }
  return best.lines;
}
function labelMetrics(renderedLines,availableWidth=148){
  const longest=Math.max(...renderedLines.map(line=>line.length),1);
  const fontSize=Math.max(12,Math.min(17,availableWidth/(longest*.56)));
  return {fontSize,lineGap:Math.max(18,fontSize+5)};
}
function fitPieceLabel(text,spans,renderedLines,safeWidth=128){
  let fontSize=17;
  text.style.fontSize=`${fontSize}px`;
  let widest=0;
  for(const span of spans){try{widest=Math.max(widest,span.getComputedTextLength());}catch{}}
  if(widest>0) fontSize=Math.max(11,Math.min(17,fontSize*safeWidth/widest));
  else fontSize=labelMetrics(renderedLines,safeWidth).fontSize;
  const lineGap=Math.max(16,fontSize+4);
  text.style.fontSize=`${fontSize}px`;
  text.setAttribute('y',PIECE_H/2-(renderedLines.length-1)*lineGap/2);
  spans.forEach((span,index)=>span.setAttribute('dy',index?String(lineGap):'0'));
}

function edgeSign(axis, x, y){
  const raw = axis === 'h' ? x*31 + y*17 + 7 : x*19 + y*37 + 11;
  return Math.abs(raw) % 2 === 0 ? 1 : -1;
}

function horizontalEdge(x1,x2,y,sign,forward=true){
  const length=x2-x1,a=x1+length*.34,b=x1+length*.66,m=(a+b)/2;
  // The reverse trace uses the same absolute curve as its neighbour.
  if(!forward) return `L ${b} ${y} C ${b-10} ${y} ${m+16} ${y+sign*TAB} ${m} ${y+sign*TAB} C ${m-16} ${y+sign*TAB} ${a+10} ${y} ${a} ${y} L ${x1} ${y}`;
  return `L ${a} ${y} C ${a+10} ${y} ${m-16} ${y+sign*TAB} ${m} ${y+sign*TAB} C ${m+16} ${y+sign*TAB} ${b-10} ${y} ${b} ${y} L ${x2} ${y}`;
}
function verticalEdge(y1,y2,x,sign,forward=true){
  const length=y2-y1,a=y1+length*.34,b=y1+length*.66,m=(a+b)/2;
  // The reverse trace uses the same absolute curve as its neighbour.
  if(!forward) return `L ${x} ${b} C ${x} ${b-10} ${x+sign*TAB} ${m+16} ${x+sign*TAB} ${m} C ${x+sign*TAB} ${m-16} ${x} ${a+10} ${x} ${a} L ${x} ${y1}`;
  return `L ${x} ${a} C ${x} ${a+10} ${x+sign*TAB} ${m-16} ${x+sign*TAB} ${m} C ${x+sign*TAB} ${m+16} ${x} ${b-10} ${x} ${b} L ${x} ${y2}`;
}

function pathForCell(x,y,options={}){
  const {flatTop=false,flatRight=false,flatBottom=false,flatLeft=false}=options;
  const top = edgeSign('h',x,y-1);
  const right = edgeSign('v',x,y);
  const bottom = edgeSign('h',x,y);
  const left = edgeSign('v',x-1,y);
  let d='M 0 0 ';
  d += flatTop ? `L ${PIECE_W} 0 ` : horizontalEdge(0,PIECE_W,0,-top)+' ';
  d += flatRight ? `L ${PIECE_W} ${PIECE_H} ` : verticalEdge(0,PIECE_H,PIECE_W,right)+' ';
  d += flatBottom ? `L 0 ${PIECE_H} ` : horizontalEdge(0,PIECE_W,PIECE_H,-bottom,false)+' ';
  d += flatLeft ? 'L 0 0 ' : verticalEdge(0,PIECE_H,0,left,false)+' ';
  return d+'Z';
}

function buildPictureLayout(){
  pictureLayout = new Map();
  const n=state.pieces.length;
  if(!n) return;
  let best=null;
  for(let cols=1; cols<=n; cols++){
    const rows=Math.ceil(n/cols);
    const empty=rows*cols-n;
    const aspect=cols/rows;
    const aspectPenalty=Math.abs(Math.log(aspect/1.2))*12;
    const portraitPenalty=cols<rows?(rows-cols)*1.6:0;
    const score=aspectPenalty+empty*1.4+portraitPenalty;
    if(!best || score<best.score) best={cols,rows,score};
  }
  const {cols,rows}=best;
  state.pieces.forEach((piece,index)=>{
    const row=Math.floor(index/cols);
    const col=index%cols;
    pictureLayout.set(piece.uid,{x:col,y:row,row,col,rows,cols});
  });
}

function displayCell(piece){
  if(pictureMode && pictureLayout.has(piece.uid)) return pictureLayout.get(piece.uid);
  return {x:piece.x,y:piece.y};
}

function pictureEdgeOptions(cell){
  if(!pictureMode) return {};
  const occupied=new Set([...pictureLayout.values()].map(c=>keyFor(c.x,c.y)));
  return {
    flatTop:!occupied.has(keyFor(cell.x,cell.y-1)),
    flatRight:!occupied.has(keyFor(cell.x+1,cell.y)),
    flatBottom:!occupied.has(keyFor(cell.x,cell.y+1)),
    flatLeft:!occupied.has(keyFor(cell.x-1,cell.y))
  };
}

function getOpenPositions(){
  if(!state.pieces.length) return [{x:0,y:0,score:0}];
  const occupied=occupiedMap(); const candidates=new Map();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const p of state.pieces){
    for(const [dx,dy] of dirs){
      const x=p.x+dx,y=p.y+dy,k=keyFor(x,y);
      if(!occupied.has(k)) candidates.set(k,{x,y});
    }
  }
  const existing=state.pieces;
  for(const candidate of candidates.values()){
    const all=[...existing,candidate];
    const xs=all.map(p=>p.x),ys=all.map(p=>p.y);
    const width=Math.max(...xs)-Math.min(...xs)+1;
    const height=Math.max(...ys)-Math.min(...ys)+1;
    const area=width*height;
    const imbalance=Math.abs(width-height);
    const neighbours=dirs.filter(([dx,dy])=>occupied.has(keyFor(candidate.x+dx,candidate.y+dy))).length;
    const centreDistance=Math.abs(candidate.x)+Math.abs(candidate.y);
    candidate.score=area*8+imbalance*4+centreDistance-neighbours*5;
  }
  return [...candidates.values()].sort((a,b)=>a.score-b.score).slice(0,5);
}

function addOrQueue(item){
  placementNotice=null;
  if(pictureMode){ pictureMode=false; pictureLayout=new Map(); }
  if(item.id !== 'custom' && state.pieces.some(p=>p.id===item.id)) return;
  if(!state.pieces.length){
    placePiece(item,0,0);
    announce(`${item.label} is now the anchor at the centre of your jigsaw.`);
    return;
  }
  state.pending={...item,uid:item.id==='custom'?`custom-${Date.now()}`:item.id};
  state.selectedUid=null;
  render();
  announce(`Choose where to connect ${item.label}.`);
}

function placePiece(item,x,y){
  const piece={...item,uid:item.uid || (item.id==='custom'?`custom-${Date.now()}`:item.id),x,y,priority:false};
  state.pieces.push(piece); state.pending=null; state.selectedUid=piece.uid; placementNotice=piece; save(); render();
}

function cancelPending(){ state.pending=null; placementNotice=null; render(); announce('Placement cancelled.'); }

function selectPiece(uid){ state.selectedUid=uid; state.pending=null; placementNotice=null; render(); }

function removeSelected(){
  const piece=state.pieces.find(p=>p.uid===state.selectedUid); if(!piece) return;
  const remaining=state.pieces.filter(p=>p.uid!==piece.uid);
  if(remaining.length && !isConnected(remaining)){
    announce('That piece holds part of your picture together. Remove an outside piece first.'); return;
  }
  state.pieces=remaining; state.selectedUid=remaining[0]?.uid || null; save(); render(); announce(`${piece.label} removed.`);
}

function isConnected(pieces){
  if(!pieces.length) return true;
  const map=new Map(pieces.map(p=>[keyFor(p.x,p.y),p])); const seen=new Set(); const stack=[pieces[0]];
  while(stack.length){ const p=stack.pop(),k=keyFor(p.x,p.y); if(seen.has(k)) continue; seen.add(k); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=map.get(keyFor(p.x+dx,p.y+dy)); if(n&&!seen.has(keyFor(n.x,n.y))) stack.push(n);} }
  return seen.size===pieces.length;
}

function toggleFocus(){
  const piece=state.pieces.find(p=>p.uid===state.selectedUid); if(!piece) return;
  if(!piece.priority && state.pieces.filter(p=>p.priority).length>=3){ announce('You already have three focus areas. Remove one star before adding another.'); return; }
  piece.priority=!piece.priority; save(); render(); announce(piece.priority?`${piece.label} added to your focus.`:`${piece.label} removed from your focus.`);
}

function renderLibrary(){
  library.innerHTML='';
  for(const item of catalogue){
    const added=state.pieces.some(p=>p.id===item.id); const pending=state.pending?.id===item.id;
    const button=document.createElement('button'); button.type='button'; button.className=`library-piece${added?' is-added':''}${pending?' is-pending':''}`; button.disabled=added;
    const thumb=`<img class="library-piece__thumb" src="${item.img}" alt="" />`;
    button.innerHTML=`${thumb}<span class="library-piece__label">${escapeHtml(item.label)}</span><span class="library-piece__state">${added?'Added':pending?'Choose space':state.pieces.length?'Add':'Start'}</span>`;
    button.addEventListener('click',()=>addOrQueue(item)); library.appendChild(button);
  }
}

function drawPiece(piece,index){
  const cell=displayCell(piece);
  const g=document.createElementNS(NS,'g'); g.classList.add('builder-piece'); if(!pictureMode&&piece.uid===state.selectedUid) g.classList.add('is-selected');
  g.setAttribute('transform',`translate(${cell.x*PIECE_W} ${cell.y*PIECE_H})`); g.style.transition='transform .9s cubic-bezier(.2,.8,.2,1)';
  g.setAttribute('tabindex','0'); g.setAttribute('role','button'); g.setAttribute('aria-label',`${piece.label}${piece.priority?', focus area':''}`);
  svg.appendChild(g);
  const path=document.createElementNS(NS,'path'); path.setAttribute('d',pathForCell(cell.x,cell.y,pictureEdgeOptions(cell))); path.setAttribute('fill',piece.fill); path.classList.add('piece-shape'); path.style.transition='d .55s ease'; g.appendChild(path);
  const text=document.createElementNS(NS,'text'); text.setAttribute('x',PIECE_W/2); const ls=lines(piece.label); text.setAttribute('text-anchor','middle'); text.setAttribute('fill',piece.text);
  const spans=ls.map(line=>{const span=document.createElementNS(NS,'tspan');span.setAttribute('x',PIECE_W/2);span.textContent=line;text.appendChild(span);return span;});g.appendChild(text);fitPieceLabel(text,spans,ls,pictureMode?112:124);
  if(!pictureMode && index===0){const dot=document.createElementNS(NS,'circle'); dot.setAttribute('cx',22); dot.setAttribute('cy',22); dot.setAttribute('r',9); dot.classList.add('anchor-dot'); g.appendChild(dot);}
  if(piece.priority){const star=document.createElementNS(NS,'text'); star.setAttribute('x',PIECE_W-25); star.setAttribute('y',31); star.setAttribute('text-anchor','middle'); star.classList.add('focus-star'); star.textContent='\u2605'; g.appendChild(star);}
  g.addEventListener('click',()=>selectPiece(piece.uid)); g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPiece(piece.uid);}});
}

function drawGhost(position){
  const g=document.createElementNS(NS,'g'); g.classList.add('ghost-slot'); g.setAttribute('transform',`translate(${position.x*PIECE_W} ${position.y*PIECE_H})`); g.setAttribute('tabindex','0'); g.setAttribute('role','button'); g.setAttribute('aria-label',`Place ${state.pending.label} here`);
  const path=document.createElementNS(NS,'path'); path.setAttribute('d',pathForCell(position.x,position.y)); g.appendChild(path);
  const text=document.createElementNS(NS,'text'); text.setAttribute('x',PIECE_W/2); text.setAttribute('y',PIECE_H/2+5); text.textContent='Connect here'; g.appendChild(text);
  const place=()=>{const pending=state.pending; placePiece(pending,position.x,position.y); announce(`${pending.label} connected to your jigsaw.`);};
  g.addEventListener('click',place); g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();place();}}); svg.appendChild(g);
}

function updateViewBox(openPositions=[]){
  const pieceCells=state.pieces.map(displayCell);
  const cells=[...pieceCells,...openPositions]; if(!cells.length){svg.setAttribute('viewBox','-420 -320 840 640');return;}
  const xs=cells.map(p=>p.x*PIECE_W),ys=cells.map(p=>p.y*PIECE_H);
  const minX=Math.min(...xs)-75,maxX=Math.max(...xs)+PIECE_W+75,minY=Math.min(...ys)-75,maxY=Math.max(...ys)+PIECE_H+75;
  const width=Math.max(620,maxX-minX),height=Math.max(470,maxY-minY); const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  svg.style.transition='all .8s ease';
  svg.setAttribute('viewBox',`${cx-width/2} ${cy-height/2} ${width} ${height}`);
}

function renderSelectedPanel(){
  const piece=state.pieces.find(p=>p.uid===state.selectedUid);
  if(!piece){selectedPiecePanel.hidden=true;return;}
  selectedPiecePanel.hidden=false; selectedPieceThumb.src=piece.img||'assets/pieces-3d-png/blank.png?v=5'; selectedPieceThumb.alt=''; selectedPieceName.textContent=piece.label;
  focusPieceBtn.textContent=piece.priority?'\u2605 Remove from focus':'\u2606 Add to focus';
  if(piece.href){learnMoreLink.hidden=false;learnMoreLink.href=piece.href;}else learnMoreLink.hidden=true;
}

function renderPrintReflection(){
  const anchor=state.pieces[0];
  const focus=state.pieces.filter(piece=>piece!==anchor&&piece.priority);
  const others=state.pieces.filter(piece=>piece!==anchor&&!piece.priority);
  const item=(piece,strong=false)=>piece?`<div class="print-summary-piece"><img src="${piece.img||'assets/pieces-3d-png/blank.png?v=5'}" alt="" /><${strong?'strong':'span'}>${escapeHtml(piece.label)}</${strong?'strong':'span'}></div>`:'';
  document.getElementById('printAnchorSummary').innerHTML=anchor?item(anchor,true):'<p>No pieces chosen.</p>';
  document.getElementById('printFocusSummary').innerHTML=focus.length?focus.map(piece=>item(piece)).join(''):'<p>No focus areas chosen.</p>';
  document.getElementById('printOtherSummary').innerHTML=others.length?others.map(piece=>item(piece)).join(''):'<p>No other pieces chosen.</p>';
}

function renderNextSteps(){
  const priorities=state.pieces.filter(piece=>piece.priority).slice(0,3);
  nextStepsPanel.hidden=!pictureMode;
  nextStepIdeas.innerHTML=priorities.length?priorities.map(piece=>`<article class="next-step-card"><img src="${piece.img||'assets/pieces-3d-png/blank.png?v=5'}" alt="" /><div><h3>${escapeHtml(piece.label)}</h3><p>${escapeHtml(nextStepPrompts[piece.id]||nextStepPrompts.custom)}</p></div></article>`).join(''):'<p class="next-steps-empty">Choose up to three focus areas to create your next-step prompts.</p>';
  if(nextStepsText.value!==String(state.nextStepsText||'')) nextStepsText.value=state.nextStepsText||'';
}

function render(){
  if(pictureMode) buildPictureLayout();
  svg.classList.toggle('is-picture-mode',pictureMode);
  renderLibrary(); svg.innerHTML=''; const open=(!pictureMode && state.pending)?getOpenPositions():[];
  state.pieces.forEach(drawPiece); open.forEach(drawGhost); updateViewBox(open);
  empty.style.display=state.pieces.length?'none':'grid';
  const placementItem=state.pending||placementNotice;
  pendingPlacement.hidden=pictureMode || !placementItem;
  pendingPlacement.classList.toggle('is-placed',!state.pending&&!!placementNotice);
  document.getElementById('cancelPendingBtn').hidden=!state.pending;
  if(placementItem){
    pendingThumb.src=placementItem.img||'assets/pieces-3d-png/blank.png?v=5';
    pendingLabel.textContent=placementItem.label;
    pendingMessage.textContent=state.pending?'Choose one of the highlighted spaces to connect this piece.':'Connected to your jigsaw.';
  }
  pieceCount.textContent=`${state.pieces.length} selected`;
  libraryPrompt.textContent=state.pieces.length?'Select a piece to add. You\u2019ll then choose a highlighted space where it connects.':'Start by choosing the piece that feels most important. It will become the centre of your jigsaw.';
  canvasInstruction.textContent=pictureMode?'Your selected pieces have been brought together into a finished picture.':state.pending?'Choose one of the highlighted connection spaces.':state.pieces.length?'Select a piece to focus, learn more or remove it.':'Choose your most important piece to begin.';
  const priorities=state.pieces.filter(p=>p.priority); focusCount.textContent=`Focus areas: ${priorities.length} of 3`; summary.innerHTML=priorities.length?priorities.map(p=>`<li>${escapeHtml(p.label)}</li>`).join(''):'<li>No focus areas selected yet.</li>';
  renderSelectedPanel();
  renderPrintReflection();
  renderNextSteps();
  const finishBtn=document.getElementById('finishBtn');
  if(finishBtn) finishBtn.textContent=pictureMode?'Edit My Jigsaw':'Create My Picture';
}

document.getElementById('addCustomBtn').addEventListener('click',()=>{const label=customInput.value.trim();if(!label){announce('Enter a name for your custom piece.');return;} const style=randomCustomStyle();addOrQueue({id:'custom',label,...style,href:null,img:customPieceThumbnail(label,style.fill,style.text)});customInput.value='';});
customInput.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('addCustomBtn').click();});
nextStepsText.addEventListener('input',()=>{state.nextStepsText=nextStepsText.value;save();});
document.getElementById('cancelPendingBtn').addEventListener('click',cancelPending);
focusPieceBtn.addEventListener('click',toggleFocus);
removePieceBtn.addEventListener('click',removeSelected);
function preparePrint(){
  if(printSnapshot||!state.pieces.length) return;
  printSnapshot={pictureMode,pending:state.pending,placementNotice};
  state.pending=null; placementNotice=null; pictureMode=true; buildPictureLayout(); render();
  svg.setAttribute('preserveAspectRatio','xMidYMin meet');
  document.documentElement.classList.add('is-printing');
}
function restoreAfterPrint(){
  if(!printSnapshot) return;
  pictureMode=printSnapshot.pictureMode; state.pending=printSnapshot.pending; placementNotice=printSnapshot.placementNotice;
  printSnapshot=null; pictureLayout=pictureMode?pictureLayout:new Map();
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  document.documentElement.classList.remove('is-printing'); render();
}
document.getElementById('printBtn').addEventListener('click',()=>{
  if(!state.pieces.length){announce('Choose at least one piece before printing.');return;}
  preparePrint(); window.requestAnimationFrame(()=>window.print());
});
window.addEventListener('beforeprint',preparePrint);
window.addEventListener('afterprint',restoreAfterPrint);
document.getElementById('resetBtn').addEventListener('click',()=>{if(confirm('Clear your jigsaw and start again?')){state={pieces:[],pending:null,selectedUid:null,nextStepsText:''};pictureMode=false;pictureLayout=new Map();placementNotice=null;save();render();announce('Your jigsaw has been cleared.');}});
render();


document.getElementById('finishBtn').addEventListener('click',()=>{
  if(!state.pieces.length){ announce('Choose at least one piece first.'); return; }
  if(state.pending){ state.pending=null; }
  placementNotice=null;
  pictureMode=!pictureMode;
  if(pictureMode){
    state.selectedUid=null;
    buildPictureLayout();
    announce('Your pieces have been brought together into a finished picture.');
  }else{
    pictureLayout=new Map();
    announce('You can continue building your jigsaw.');
  }
  render();
});







