import WebSocket from "ws"
const ws = new WebSocket(process.argv[2])
let id=0; const pending=new Map()
const send=(method,params={})=>new Promise((resolve)=>{const msgId=++id;pending.set(msgId,{resolve});ws.send(JSON.stringify({id:msgId,method,params}))})
ws.on("message",(data)=>{const msg=JSON.parse(data); if(msg.id&&pending.has(msg.id)){pending.get(msg.id).resolve(msg.result);pending.delete(msg.id)}})
await new Promise(r=>ws.on("open",r))
await send("Runtime.enable"); await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await send("Page.navigate",{url:"http://localhost:4000/#/login"}); await new Promise(r=>setTimeout(r,3000))
await send("Runtime.evaluate",{expression:`(()=>{const inputs=[...document.querySelectorAll("input")];const u=inputs.find(i=>i.type!=="password"&&i.type!=="checkbox");const p=inputs.find(i=>i.type==="password");const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}))};set(u,"admin");set(p,"123456");[...document.querySelectorAll("button")].find(b=>/登录/.test(b.innerText||""))?.click();return true})()`,returnByValue:true})
await new Promise(r=>setTimeout(r,4000))
const layout=await send("Runtime.evaluate",{expression:`(()=>{
 const vars=["--left-menu-max-width","--left-menu-min-width","--left-menu-bg-color","--app-content-bg-color","--top-header-bg-color"];
 const root=getComputedStyle(document.documentElement);
 const varMap=Object.fromEntries(vars.map(v=>[v,root.getPropertyValue(v).trim()]));
 const nodes=[...document.querySelectorAll("div,aside,section")].map(el=>{
  const r=el.getBoundingClientRect(); if(r.width<30||r.height<30) return null;
  const c=el.className?.toString?.()||"";
  if(!/menu|aside|layout|tool-header|logo|sidebar/i.test(c)) return null;
  return {c:c.slice(0,100),w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x)};
 }).filter(Boolean).slice(0,20);
 const text=(document.body.innerText||"").slice(0,200);
 return {varMap,nodes,text,href:location.href,vw:window.innerWidth};
})()`,returnByValue:true})
console.log(JSON.stringify(layout.result.value,null,2))
ws.close()
