/* Editable Figma handoff: semantic DOM hierarchy, text and original image references. */
function captureNative(doc){
 const win=doc.defaultView,round=v=>Math.round(v*100)/100;
 const bounds=e=>{const r=e.getBoundingClientRect();return {x:round(r.x),y:round(r.y),w:round(r.width),h:round(r.height)}};
 const isClear=c=>c==='transparent'||c==='rgba(0, 0, 0, 0)';
 const seen=new Set();let counter=0;
 function walk(e){
  const s=win.getComputedStyle(e),r=bounds(e);
  if(!r.w||!r.h||s.display==='none'||s.visibility==='hidden'||+s.opacity===0||['SCRIPT','DIALOG','NOSCRIPT'].includes(e.tagName))return null;
  if(e.parentElement?.tagName==='DETAILS'&&!e.parentElement.open&&e.tagName!=='SUMMARY')return null;
  const n={id:++counter,type:'FRAME',name:e.getAttribute('data-block')||e.getAttribute('aria-label')||e.id||e.className||e.tagName,...r,children:[]};
  if(!isClear(s.backgroundColor))n.fill=s.backgroundColor;
  n.opacity=+s.opacity;n.radius=parseFloat(s.borderRadius)||0;
  n.borders=['Top','Right','Bottom','Left'].map(side=>({width:parseFloat(s['border'+side+'Width'])||0,color:s['border'+side+'Color']}));
  if(e.classList.contains('hero-shade'))n.gradient=doc.documentElement.clientWidth<=760?'vertical':'horizontal';
  if(e.tagName==='IMG'){
   if(!e.naturalWidth)return null;
   n.type='IMAGE';n.src=e.getAttribute('src');n.fit=s.objectFit==='contain'?'FIT':'FILL';n.position=s.objectPosition;seen.add(n.src);return n;
  }
  const font=()=>({fontSize:parseFloat(s.fontSize),weight:s.fontWeight,color:s.color,lineHeight:parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.2,letterSpacing:parseFloat(s.letterSpacing)||0,align:s.textAlign==='center'?'CENTER':s.textAlign==='right'?'RIGHT':'LEFT'});
  if(['INPUT','SELECT'].includes(e.tagName)){
   if(e.type!=='checkbox'){
    const value=e.tagName==='SELECT'?e.options[e.selectedIndex].text:e.value||e.placeholder;
    n.children.push({id:++counter,type:'TEXT',name:value,text:value,x:r.x+parseFloat(s.paddingLeft)+1,y:r.y+(r.h-parseFloat(s.fontSize)*1.2)/2,w:r.w-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-2,h:parseFloat(s.fontSize)*1.2,...font(),singleLine:true});
    if(e.tagName==='SELECT')n.children.push({id:++counter,type:'TEXT',name:'Раскрыть',text:'⌄',x:r.x+r.w-21,y:r.y+r.h/2-9,w:14,h:18,fontSize:15,weight:'400',color:s.color,lineHeight:18,letterSpacing:0,align:'CENTER',singleLine:true});
   }
   return n;
  }
  const textOnly=[...e.children].every(c=>c.tagName==='BR');
  if(textOnly&&e.textContent.trim()){
   const t=e.innerText.trim();
   const px=parseFloat(s.paddingLeft)+parseFloat(s.borderLeftWidth),py=parseFloat(s.paddingTop)+parseFloat(s.borderTopWidth);
   n.children.push({id:++counter,type:'TEXT',name:t.slice(0,60),text:t,x:r.x+px,y:r.y+py,w:r.w-px-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth),h:r.h-py-parseFloat(s.paddingBottom)-parseFloat(s.borderBottomWidth),...font()});
  } else {
   for(const c of e.childNodes){
    if(c.nodeType===1){const child=walk(c);if(child)n.children.push(child);}
    else if(c.nodeType===3&&c.textContent.trim()){
     const range=doc.createRange();range.selectNodeContents(c);const rs=[...range.getClientRects()];if(!rs.length)continue;
     const x=Math.min(...rs.map(q=>q.x)),y=Math.min(...rs.map(q=>q.y)),right=Math.max(...rs.map(q=>q.right)),bottom=Math.max(...rs.map(q=>q.bottom));
     let t=c.textContent.replace(/\s+/g,' ').trim();if(s.textTransform==='uppercase')t=t.toUpperCase();
     n.children.push({id:++counter,type:'TEXT',name:t.slice(0,60),text:t,x:round(x),y:round(y),w:round(right-x)+1,h:round(bottom-y),...font()});
    }
   }
  }
  // Semantic vertical groups with their measured gaps become native auto-layout.
  const positioned=n.children.filter(c=>c.type!=='TEXT'||c.text.trim());
  const ordered=positioned.length>1&&positioned.every((c,i)=>i===0||c.y>=positioned[i-1].y+positioned[i-1].h-1);
  if(ordered&&positioned.every(c=>Math.abs(c.x-positioned[0].x)<1)&&positioned.every(c=>Math.abs(c.w-positioned[0].w)<2)){
   n.layout='VERTICAL';n.padding=[positioned[0].y-r.y,Math.max(0,r.x+r.w-positioned[0].x-positioned[0].w),Math.max(0,r.y+r.h-positioned.at(-1).y-positioned.at(-1).h),positioned[0].x-r.x].map(round);
   n.gaps=positioned.slice(1).map((c,i)=>round(Math.max(0,c.y-positioned[i].y-positioned[i].h)));
  }
  return n;
 }
 const tree=walk(doc.body);
 return {width:doc.documentElement.clientWidth,height:doc.documentElement.scrollHeight,tree,assets:[...seen]};
}
