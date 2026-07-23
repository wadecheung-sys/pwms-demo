import{b as u}from"./element-plus-CCEbF-XY.js";import{k as x,l as y,m as $,I as i,B as b,F as h,a8 as f}from"./vue-chunks-CJw3DfAa.js";import{_ as w}from"./index-JsaJOOpN.js";function g(o){return/[",\n\r]/.test(o)?`"${o.replace(/"/g,'""')}"`:o}function k(o,t,d){const c=t.map(a=>g(a.label)).join(","),l=d.map(a=>t.map(s=>{const p=a[s.key],_=s.formatter?s.formatter(p,a):p==null?"":String(p);return g(_)}).join(",")).join(`
`),r="\uFEFF",m=new Blob([r+c+`
`+l],{type:"text/csv;charset=utf-8"}),e=URL.createObjectURL(m),n=document.createElement("a");n.href=e,n.download=`${o}_${new Date().toISOString().slice(0,10)}.csv`,n.click(),URL.revokeObjectURL(e)}function C(o,t,d){const c=`
    body { font-family: "Microsoft YaHei", sans-serif; padding: 24px; color: #333; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .meta { color: #888; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  `,l=`<tr>${t.map(n=>`<th>${n.label}</th>`).join("")}</tr>`,r=d.map(n=>`<tr>${t.map(a=>{const s=n[a.key];return`<td>${a.formatter?a.formatter(s,n):s==null?"":String(s)}</td>`}).join("")}</tr>`).join(""),m=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${o}</title><style>${c}</style></head><body>
    <h1>${o}</h1>
    <div class="meta">打印时间：${new Date().toLocaleString("zh-CN")} · 共 ${d.length} 条</div>
    <table><thead>${l}</thead><tbody>${r}</tbody></table>
  </body></html>`,e=window.open("","_blank");e&&(e.document.write(m),e.document.close(),e.focus(),e.print())}const j={class:"page-toolbar"},v=x({__name:"PageToolbar",props:{title:{},filename:{},columns:{},data:{},disabled:{type:Boolean}},setup(o){const t=o;function d(){if(!t.data.length){u.warning("暂无数据可导出");return}k(t.filename,t.columns,t.data),u.success("导出成功")}function c(){if(!t.data.length){u.warning("暂无数据可打印");return}C(t.title,t.columns,t.data)}return(l,r)=>{const m=f("Download"),e=f("el-icon"),n=f("el-button"),a=f("Printer");return y(),$("div",j,[i(n,{disabled:l.disabled||!l.data.length,onClick:d},{default:b(()=>[i(e,null,{default:b(()=>[i(m)]),_:1}),r[0]||(r[0]=h(" 导出 "))]),_:1},8,["disabled"]),i(n,{disabled:l.disabled||!l.data.length,onClick:c},{default:b(()=>[i(e,null,{default:b(()=>[i(a)]),_:1}),r[1]||(r[1]=h(" 打印 "))]),_:1},8,["disabled"])])}}}),B=w(v,[["__scopeId","data-v-bdbb2024"]]);export{B as P};
