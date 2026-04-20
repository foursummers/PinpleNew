/**
 * 拼朋友 Pinpengyou — v4.3
 * 白天/夜间双主题 · 简化建档 · 人脉圈搜索加好友 · 家庭成员管理 · 修复弹窗高度
 *
 * Vercel-hardening additions on top of the v4.3 template:
 *   - tRPC client uses credentials:"include" so the session cookie travels
 *   - <AppErrorBoundary> + global unhandledrejection listener catch the
 *     "Please login (10001)" 401 spiral that otherwise white-screens the app
 *   - Forgot-password / reset-password flow (uses the existing email backend)
 */

import { useState, useEffect, useCallback, Component, type ErrorInfo, type ReactNode } from "react";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers";

const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // Vercel terminates TLS at the edge. Without credentials:"include" the
      // browser will *omit* our session cookie on cross-origin-style fetches
      // and every protected procedure 401s. Don't remove this without a fix.
      fetch(input, init) {
        return fetch(input, { ...init, credentials: "include" });
      },
    }),
  ],
});

// ─── Auth-error guard ─────────────────────────────────────────────────────────
// The backend throws TRPCError({ code: "UNAUTHORIZED", message: "Please login" })
// once the session cookie is missing/invalid. We detect that anywhere it bubbles
// up (caught or not) and force a clean reload back to the auth screen — but
// only ONCE per page load, otherwise we'd loop forever.
function isAuthError(err: unknown): boolean {
  const msg = (err as any)?.message ?? "";
  if (typeof msg !== "string") return false;
  return /Please login|UNAUTHORIZED|10001|未登录/i.test(msg);
}

let _authErrorHandled = false;
function handleAuthErrorOnce() {
  if (_authErrorHandled) return;
  _authErrorHandled = true;
  // Clear any cached state and bounce to login. We don't try to call
  // auth.logout because the cookie is already invalid by definition.
  try { localStorage.removeItem("ppy_lastFam"); } catch {}
  // Use replace so the Back button doesn't take the user into a bad state.
  setTimeout(() => { window.location.replace("/"); }, 50);
}

// ─── Types ────────────────────────────────────────────────────────────────────
type User = { id:number; name:string|null; email:string|null; avatarUrl:string|null; openId:string; role?:string; creditScore?:number|null };
type Family = { id:number; name:string; inviteCode:string; memberRole?:string };
type Child = {
  id:number; familyId:number; nickname:string;
  gender?:string|null; birthDate?:string|null; notes?:string|null;
  pregnancyRefDate?:string|null; pregnancyWeeksAtRef?:number|null; pregnancyDaysAtRef?:number|null;
  ageInfo?:{years:number;months:number;days:number;totalMonths:number}|null;
  eddInfo?:{lmp:string;edd:string;twin37w:string}|null;
  isMultiple?:boolean|null;
  embryoTransferDate?:string|null; embryoDay?:number|null;
  childOneName?:string|null; childTwoName?:string|null;
  childOneGender?:string|null; childTwoGender?:string|null;
};
type Task = { id:number; title:string; category:string; icon?:string|null; color?:string|null; todayCheckins:number; isActive?:boolean|null };
type Skill = { id:number; userId:number; name:string; category?:string|null; description?:string|null; priceMin?:string|null; priceMax?:string|null; location?:string|null; status?:string|null };
type HelpReq = { id:number; title:string; description?:string|null; location?:string|null; urgency?:string|null; status?:string|null };
type Friend = { id:number; name:string|null; email:string|null; openId:string; creditScore?:number|null; status?:string };
type FamilyMember = {
  id:number; userId:number; name?:string|null; email?:string|null;
  role:string; relation?:string|null; remark?:string|null;
  birthday?:string|null; openId:string;
};

// ─── Theme ────────────────────────────────────────────────────────────────────
type Theme = "light"|"dark";
function useTheme():[Theme,(t:Theme)=>void]{
  const [t,setT]=useState<Theme>(()=>{
    try { return (localStorage.getItem("ppyTheme")||"light") as Theme; } catch { return "light"; }
  });
  const set=(v:Theme)=>{setT(v);try{localStorage.setItem("ppyTheme",v);}catch{}};
  useEffect(()=>{document.documentElement.setAttribute("data-theme",t);},[t]);
  return [t,set];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcWeeks(c:Child):{weeks:number;days:number}|null{
  if(c.pregnancyRefDate&&c.pregnancyWeeksAtRef!=null){
    const ref=new Date(c.pregnancyRefDate);
    const diff=Math.floor((Date.now()-ref.getTime())/86400000);
    const total=c.pregnancyWeeksAtRef*7+(c.pregnancyDaysAtRef??0)+diff;
    return {weeks:Math.floor(total/7),days:total%7};
  }
  if(c.embryoTransferDate){
    const t2=new Date(c.embryoTransferDate);
    const lmp=new Date(t2.getTime()-((c.embryoDay??5)+14)*86400000);
    const total=Math.floor((Date.now()-lmp.getTime())/86400000);
    return {weeks:Math.floor(total/7),days:total%7};
  }
  return null;
}
function daysTo(d?:string|null):number|null{
  if(!d) return null;
  return Math.ceil((new Date(d).getTime()-Date.now())/86400000);
}
function fmt(d?:string|null,opts?:Intl.DateTimeFormatOptions):string{
  if(!d) return "";
  return new Date(d).toLocaleDateString("zh-CN",opts??{month:"short",day:"numeric"});
}
const AC=["#3D7A5A","#B87A1A","#4A6EA8","#8B5A9A","#B84050","#2E7A7A","#D4693A","#447AA0"];
function aColor(s:string){return AC[Math.abs(s.charCodeAt(0)+(s.charCodeAt(s.length-1)||0))%AC.length];}
function ini(name?:string|null,email?:string|null){return (name||email||"?").slice(0,2).toUpperCase();}

// Read URL query param without depending on a router
function getQuery(name:string):string|null{
  try { return new URLSearchParams(window.location.search).get(name); } catch { return null; }
}

// ─── Static data ──────────────────────────────────────────────────────────────
const TL_NODES=[
  {week:"6-8周",title:"建档产检",desc:"确认妊娠，建立档案",s:"done"},
  {week:"11-13周",title:"NT检查",desc:"早唐筛查，颈部透明层",s:"upcoming"},
  {week:"15-20周",title:"无创DNA",desc:"染色体筛查（可选）",s:"upcoming"},
  {week:"22-24周",title:"大排畸",desc:"四维超声，系统筛查",s:"upcoming"},
  {week:"24-28周",title:"糖耐量",desc:"GDM筛查",s:"upcoming"},
  {week:"32-34周",title:"胎位+监护",desc:"每2周产检",s:"upcoming"},
  {week:"37-40周",title:"足月分娩",desc:"顺产或剖宫产",s:"target"},
] as const;

const ITEMS=[
  {cat:"喂养",icon:"🍼",items:["奶瓶（宽口）×4","奶嘴S/M号×6","奶瓶消毒器×1","温奶器×1","吸奶器（电动）×1","储奶袋×1盒","配方奶粉（备用）×1罐"]},
  {cat:"衣物",icon:"👕",items:["和尚服/连体衣×8件","包被/抱被×2条","帽子×2顶","袜子×4双","口水巾×8条","隔尿垫×8条"]},
  {cat:"洗护",icon:"🛁",items:["婴儿浴盆×1","浴巾×2条","小毛巾×6条","婴儿沐浴露×1","护臀膏×1支","婴儿棉签×1盒"]},
  {cat:"睡眠",icon:"🛏️",items:["婴儿床×1张","床垫×1个","床单×3条","睡袋（薄款）×2个"]},
  {cat:"出行",icon:"🚗",items:["安全提篮×1个","婴儿推车×1辆","妈咪包×1个"]},
  {cat:"医护",icon:"💊",items:["耳温枪×1个","吸鼻器×1个","肚脐贴×1盒","碘伏棉签×1盒","维生素D×1瓶"]},
  {cat:"产妇",icon:"👩",items:["哺乳内衣×3件","一次性内裤×10条","产妇卫生巾×2包","防溢乳垫×1盒","哺乳睡衣×2套","收腹带×1条"]},
];

const EM=[
  {t:"孕期",l:"crit",s:"阴道流血",a:"立即急诊"},
  {t:"孕期",l:"crit",s:"剧烈腹痛",a:"立即急诊"},
  {t:"孕期",l:"crit",s:"破水",a:"平躺垫高臀部，即刻急诊"},
  {t:"孕期",l:"warn",s:"持续头痛+眼花",a:"急诊（子痫前期排查）"},
  {t:"孕期",l:"warn",s:"胎动明显减少",a:"立即就医"},
  {t:"产后",l:"crit",s:"产后大出血",a:"通知医护，按压子宫"},
  {t:"产后",l:"warn",s:"发烧 > 38.5℃",a:"就医检查"},
  {t:"产后",l:"warn",s:"情绪低落超2周",a:"心理咨询（产后抑郁排查）"},
  {t:"新生儿",l:"crit",s:"体温 > 37.5℃",a:"立即就医"},
  {t:"新生儿",l:"warn",s:"黄疸较重",a:"就医，可能需蓝光照射"},
  {t:"新生儿",l:"warn",s:"拒奶/持续嗜睡",a:"观察，持续则就医"},
] as const;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

:root{
  --sage:#3D7A5A;--sage-d:#2C5A42;--sage-lt:rgba(61,122,90,.1);--sage-mid:rgba(61,122,90,.28);
  --amber:#C4861A;--amber-lt:rgba(196,134,26,.1);--amber-mid:rgba(196,134,26,.32);
  --rose:#C03050;--rose-lt:rgba(192,48,80,.1);--rose-mid:rgba(192,48,80,.28);
  --ff-s:'Noto Serif SC',Georgia,serif;--ff:'DM Sans',system-ui,sans-serif;
  --r:10px;--rl:16px;--rxl:22px;
  --ease:cubic-bezier(.16,1,.3,1);
  --tr:background-color .25s var(--ease),color .25s var(--ease),border-color .25s var(--ease);
}

[data-theme="light"]{
  --bg:#EEECEA;--s:#FFFFFF;--s2:#F5F4F1;--s3:#ECEAE7;--s4:#E2E0DC;
  --ink:#1C1A17;--ink2:#4E4B46;--ink3:#918E88;
  --bd:rgba(28,26,23,.08);--bd2:rgba(28,26,23,.15);--bd3:rgba(28,26,23,.05);
  --sh:0 1px 3px rgba(0,0,0,.05),0 0 1px rgba(0,0,0,.03);
  --sh-lg:0 8px 28px rgba(0,0,0,.10),0 2px 6px rgba(0,0,0,.05);
  --sb-bg:#FFFFFF;--mob-bg:rgba(255,255,255,.92);
  --hero-from:#3D7A5A;--hero-to:#2C5A42;
}

[data-theme="dark"]{
  --bg:#0F100F;--s:#1A1C19;--s2:#212320;--s3:#272927;--s4:#2E302D;
  --ink:#EAE8E2;--ink2:#A09C96;--ink3:#5A5854;
  --bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.13);--bd3:rgba(255,255,255,.04);
  --sh:0 1px 3px rgba(0,0,0,.35),0 0 1px rgba(0,0,0,.2);
  --sh-lg:0 8px 32px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.25);
  --sb-bg:#151614;--mob-bg:rgba(21,22,20,.93);
  --sage:#5EAA84;--sage-d:#7EC4A0;--sage-lt:rgba(94,170,132,.13);--sage-mid:rgba(94,170,132,.28);
  --amber:#D4963A;--amber-lt:rgba(212,150,58,.13);--amber-mid:rgba(212,150,58,.32);
  --rose:#D45870;--rose-lt:rgba(212,88,112,.13);--rose-mid:rgba(212,88,112,.28);
  --hero-from:#1E3D2C;--hero-to:#162C20;
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font-family:var(--ff);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;transition:var(--tr)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}

/* shell */
.app{display:flex;min-height:100vh}
.sb{width:232px;flex-shrink:0;background:var(--sb-bg);border-right:1px solid var(--bd);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;transition:var(--tr)}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{background:var(--s);border-bottom:1px solid var(--bd);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:90;flex-shrink:0;transition:var(--tr)}
.page-body{padding:26px 26px 100px;flex:1;overflow-y:auto}
.pi{max-width:860px}

/* sidebar */
.sb-logo{padding:20px 16px 12px}
.logo{font-family:var(--ff-s);font-size:20px;font-weight:700;color:var(--ink);letter-spacing:-.5px}
.logo em{color:var(--sage);font-style:normal}
.logo-sub{font-size:10px;color:var(--ink3);margin-top:2px;letter-spacing:.5px}
.sb-fam{margin:0 10px 10px;background:var(--sage-lt);border:1px solid var(--sage-mid);border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .15s}
.sb-fam:hover{filter:brightness(.96)}
.sb-fn{font-size:12.5px;font-weight:600;color:var(--sage)}
.sb-fc{font-size:9.5px;color:var(--ink3);margin-top:2px;font-family:monospace;letter-spacing:.1em}
.sb-nav{flex:1;padding:0 8px 8px}
.sb-sec{font-size:9.5px;font-weight:600;color:var(--ink3);letter-spacing:.9px;text-transform:uppercase;padding:0 8px;margin:14px 0 4px}
.nb{display:flex;align-items:center;gap:9px;padding:8px 10px;width:100%;background:transparent;border:none;border-radius:10px;font-family:var(--ff);font-size:13px;color:var(--ink2);cursor:pointer;text-align:left;transition:all .12s;margin-bottom:2px}
.nb:hover{background:var(--s3);color:var(--ink)}
.nb.on{background:var(--sage-lt);color:var(--sage);font-weight:500}
.nb-ic{font-size:14px;width:20px;text-align:center;flex-shrink:0}
.sb-bot{padding:10px 10px 14px;border-top:1px solid var(--bd)}

/* avatar */
.av{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;font-family:var(--ff-s)}
.av-sm{width:28px;height:28px;font-size:10px}
.av-md{width:36px;height:36px;font-size:13px}
.av-lg{width:64px;height:64px;font-size:22px}

/* user chip */
.uc{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background .12s;margin-top:8px}
.uc:hover{background:var(--s3)}
.un{font-size:12.5px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ue{font-size:10px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* theme toggle */
.theme-tog{display:flex;align-items:center;gap:6px;padding:6px 11px;background:var(--s3);border:1px solid var(--bd);border-radius:20px;cursor:pointer;font-size:12px;color:var(--ink2);transition:all .15s;font-family:var(--ff);width:100%}
.theme-tog:hover{background:var(--s4)}

/* mobile nav */
.mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--mob-bg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--bd);z-index:200;padding:4px 0 env(safe-area-inset-bottom,0)}
.mob-items{display:flex;justify-content:space-around}
.mb{flex:1;background:transparent;border:none;padding:5px 2px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;color:var(--ink3);font-family:var(--ff);transition:color .12s}
.mb.on{color:var(--sage)}
.mb-ic{font-size:18px;line-height:1}
.mb-lb{font-size:9px;font-weight:500}
.ham{display:none;background:transparent;border:none;padding:5px;color:var(--ink2);cursor:pointer}
.drw{display:none;position:fixed;inset:0;z-index:300}
.drw.open{display:block}
.drw-bg{position:absolute;inset:0;background:rgba(0,0,0,.35)}
.drw-panel{position:absolute;left:0;top:0;bottom:0;width:248px;background:var(--sb-bg);display:flex;flex-direction:column;overflow-y:auto;box-shadow:4px 0 24px rgba(0,0,0,.2);transition:var(--tr)}
@media(max-width:768px){
  .sb{display:none}.mob-nav{display:block}.ham{display:flex;align-items:center}
  .page-body{padding:18px 16px 88px}.topbar{padding:0 14px}.tb-title{display:none}
}

/* page */
.pg-head{margin-bottom:22px}
.pg-t{font-family:var(--ff-s);font-size:23px;font-weight:700;letter-spacing:-.4px;line-height:1.2}
.pg-s{font-size:13px;color:var(--ink3);margin-top:3px}
.rb{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.re{display:flex;align-items:center;gap:8px}

/* cards */
.card{background:var(--s);border:1px solid var(--bd);border-radius:var(--rl);padding:20px 22px;box-shadow:var(--sh);transition:var(--tr)}
.card-p0{padding:0;overflow:hidden}

/* hero */
.hero{border-radius:20px;padding:22px 26px;margin-bottom:16px;position:relative;overflow:hidden;background:linear-gradient(135deg,var(--hero-from) 0%,var(--hero-to) 100%)}
.hero::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:rgba(255,255,255,.06);border-radius:50%}
.hero::after{content:'';position:absolute;bottom:-20px;left:20px;width:90px;height:90px;background:rgba(255,255,255,.04);border-radius:50%}
.hi{position:relative;z-index:1}
.ht{font-family:var(--ff-s);font-size:17px;font-weight:700;color:#fff;margin-bottom:2px}
.hs2{font-size:11.5px;color:rgba(255,255,255,.7)}
.h-stats{display:flex;gap:18px;margin-top:16px;flex-wrap:wrap}
.hv{font-family:var(--ff-s);font-size:28px;font-weight:700;color:#fff;line-height:1}
.hl{font-size:10px;color:rgba(255,255,255,.62);margin-top:2px}

/* invite bar */
.inv{background:var(--sage-lt);border:1px solid var(--sage-mid);border-radius:var(--r);padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:16px}
.inv-info{flex:1}
.inv-lbl{font-size:9.5px;color:var(--sage);font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
.inv-code{font-size:20px;font-weight:700;color:var(--ink);letter-spacing:3px;font-family:monospace}
.inv-sub{font-size:10.5px;color:var(--ink3);margin-top:3px}
.inv-btns{display:flex;gap:7px;flex-shrink:0}

/* child cards */
.cg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.cc{background:var(--s);border:1px solid var(--bd);border-radius:var(--rl);padding:18px 20px;box-shadow:var(--sh);transition:var(--tr)}
.cc-top{display:flex;align-items:center;gap:11px;margin-bottom:10px}
.cc-bub{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.cn{font-family:var(--ff-s);font-size:16px;font-weight:700;color:var(--ink)}
.cg2{font-size:10.5px;color:var(--ink3);margin-top:1px}
.wr{display:flex;align-items:baseline;gap:4px}
.wb{font-family:var(--ff-s);font-size:36px;font-weight:700;color:var(--sage);line-height:1}
.wu{font-size:11.5px;color:var(--ink3)}
.edd-tag{display:inline-flex;align-items:center;gap:4px;background:var(--amber-lt);border:1px solid var(--amber-mid);color:var(--amber);font-size:10.5px;font-weight:500;padding:3px 9px;border-radius:20px;margin-top:8px}

/* tasks */
.tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.tc{background:var(--s);border:1px solid var(--bd);border-radius:var(--rl);padding:13px 15px;border-top:3px solid var(--sage);position:relative;box-shadow:var(--sh);transition:var(--tr)}
.tn{font-size:12.5px;font-weight:500;color:var(--ink)}
.tcat{font-size:10px;color:var(--ink3);margin-top:1px}
.tv{font-family:var(--ff-s);font-size:32px;font-weight:700;color:var(--ink);margin:6px 0 1px;line-height:1}
.tl{font-size:9.5px;color:var(--ink3);margin-bottom:10px}
.tic{position:absolute;top:11px;right:13px;font-size:15px;opacity:.7}
.btck{width:100%;padding:7px;border:none;border-radius:8px;font-family:var(--ff);font-size:11.5px;font-weight:500;cursor:pointer;color:#fff;transition:opacity .12s,transform .1s}
.btck:hover{opacity:.88}.btck:active{transform:scale(.97)}.btck:disabled{opacity:.5;cursor:not-allowed}

/* pills */
.pill{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:500;line-height:1.5}
.p-g{background:var(--sage-lt);color:var(--sage);border:1px solid var(--sage-mid)}
.p-a{background:var(--amber-lt);color:var(--amber);border:1px solid var(--amber-mid)}
.p-r{background:var(--rose-lt);color:var(--rose);border:1px solid var(--rose-mid)}
.p-gr{background:var(--s3);color:var(--ink2);border:1px solid var(--bd2)}

/* section label */
.sl2{font-size:10px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}

/* progress */
.prog{height:4px;background:var(--s3);border-radius:2px;overflow:hidden}
.prog-f{height:100%;background:var(--sage);border-radius:2px;transition:width .4s}

/* buttons */
.btn{display:flex;align-items:center;justify-content:center;gap:6px;font-family:var(--ff);cursor:pointer;transition:all .14s;border-radius:var(--r)}
.btn-p{padding:10px 18px;background:var(--sage);color:#fff;border:none;font-size:13px;font-weight:500}
.btn-p:hover{filter:brightness(1.08)}.btn-p:active{transform:scale(.98)}.btn-p:disabled{opacity:.6;cursor:not-allowed}
.btn-o{padding:8px 14px;background:transparent;color:var(--sage);border:1.5px solid var(--sage-mid);font-size:12.5px;font-weight:500}
.btn-o:hover{background:var(--sage-lt)}
.btn-g{padding:9px 16px;background:transparent;color:var(--ink2);border:1px solid var(--bd2);font-size:13px}
.btn-g:hover{background:var(--s3)}
.btn-d{padding:10px 18px;background:transparent;color:var(--rose);border:1.5px solid var(--rose-mid);font-size:13px;font-weight:500;width:100%}
.btn-d:hover{background:var(--rose-lt)}
.btn-sm{padding:6px 12px;font-size:11.5px}
.btn-full{width:100%}
.btn-copy{background:var(--sage);color:#fff;border:none;padding:6px 13px;border-radius:8px;font-family:var(--ff);font-size:11px;font-weight:500;cursor:pointer;transition:filter .12s;white-space:nowrap}
.btn-copy:hover{filter:brightness(1.1)}
.btn-icon{background:var(--s3);border:1px solid var(--bd);color:var(--ink2);padding:5px 10px;border-radius:8px;font-family:var(--ff);font-size:11px;cursor:pointer;transition:all .12s;white-space:nowrap}
.btn-icon:hover{background:var(--s4)}
.btn-link{background:none;border:none;color:var(--sage);font-family:var(--ff);font-size:12px;cursor:pointer;padding:0;text-decoration:underline;text-underline-offset:3px}
.btn-link:hover{filter:brightness(.9)}

/* forms */
.field{margin-bottom:13px}
.field label{display:block;font-size:11.5px;font-weight:500;color:var(--ink2);margin-bottom:5px}
.field input,.field select,.field textarea{width:100%;padding:9px 12px;border:1.5px solid var(--bd2);border-radius:var(--r);font-family:var(--ff);font-size:13.5px;background:var(--s);color:var(--ink);outline:none;transition:border-color .15s;-webkit-appearance:none}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--sage)}
.field input::placeholder,.field textarea::placeholder{color:var(--ink3)}
.field textarea{resize:vertical;min-height:70px}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field-hint{font-size:10.5px;color:var(--ink3);margin-top:4px;line-height:1.5}

/* alerts */
.alert{padding:9px 13px;border-radius:var(--r);font-size:12.5px;margin-bottom:11px}
.a-err{background:var(--rose-lt);color:var(--rose);border:1px solid var(--rose-mid)}
.a-ok{background:var(--sage-lt);color:var(--sage);border:1px solid var(--sage-mid)}
.div{display:flex;align-items:center;gap:12px;margin:14px 0;font-size:11px;color:var(--ink3)}
.div::before,.div::after{content:'';flex:1;height:1px;background:var(--bd2)}

/* modal — full-height scroll, safe on mobile */
.modal{position:fixed;inset:0;z-index:500;display:flex;align-items:flex-end;justify-content:center;padding:0}
.modal-bg{position:absolute;inset:0;background:rgba(0,0,0,.42)}
.modal-box{
  position:relative;background:var(--s);
  border-radius:var(--rxl) var(--rxl) 0 0;
  width:100%;max-width:520px;
  max-height:90vh;
  display:flex;flex-direction:column;
  box-shadow:var(--sh-lg);animation:su .22s ease;transition:var(--tr)
}
.modal-hd{padding:22px 22px 0;flex-shrink:0}
.modal-body{flex:1;overflow-y:auto;padding:0 22px 4px}
.modal-ft{padding:16px 22px 28px;flex-shrink:0;display:flex;gap:10px}
.modal-ft .btn-g,.modal-ft .btn-p{flex:1}
@keyframes su{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.mt{font-family:var(--ff-s);font-size:18px;font-weight:700;margin-bottom:16px;color:var(--ink)}
@media(min-width:540px){.modal{align-items:center;padding:20px}.modal-box{border-radius:var(--rxl);max-height:88vh}}

/* auth */
.auth-s{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:20px;transition:var(--tr)}
.auth-card{background:var(--s);border:1px solid var(--bd);border-radius:var(--rxl);padding:34px 30px 30px;width:100%;max-width:400px;box-shadow:var(--sh-lg);transition:var(--tr)}
.auth-logo{text-align:center;margin-bottom:24px}
.auth-brand{font-family:var(--ff-s);font-size:28px;font-weight:700;color:var(--ink);letter-spacing:-.5px}
.auth-brand em{color:var(--sage);font-style:normal}
.auth-tag{font-size:12px;color:var(--ink3);margin-top:5px}
.auth-tabs{display:flex;background:var(--s3);border-radius:var(--r);padding:3px;margin-bottom:18px}
.atab{flex:1;background:transparent;border:none;padding:8px;border-radius:8px;font-family:var(--ff);font-size:12.5px;font-weight:500;color:var(--ink3);cursor:pointer;transition:all .15s}
.atab.on{background:var(--s);color:var(--ink);box-shadow:var(--sh)}
.auth-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:11.5px;color:var(--ink3)}

/* family select */
.fs{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:20px;transition:var(--tr)}
.fs-in{width:100%;max-width:450px}
.fs-t{font-family:var(--ff-s);font-size:25px;font-weight:700;margin-bottom:4px}
.fs-s{font-size:13px;color:var(--ink3);margin-bottom:20px}
.fo{background:var(--s);border:1.5px solid var(--bd2);border-radius:var(--rl);padding:14px 16px;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;transition:all .14s;box-shadow:var(--sh)}
.fo:hover{border-color:var(--sage);background:var(--sage-lt)}
.fo-n{font-size:15px;font-weight:600;color:var(--ink)}
.fo-m{font-size:11px;color:var(--ink3);margin-top:2px}
.fa{display:flex;gap:10px;margin-top:12px}
.fa .btn-o{flex:1}

/* tabs */
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--bd);margin-bottom:20px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:8px 14px;background:transparent;border:none;border-bottom:2.5px solid transparent;font-family:var(--ff);font-size:12.5px;font-weight:500;color:var(--ink3);cursor:pointer;white-space:nowrap;transition:all .14s;margin-bottom:-1px}
.tab.on{color:var(--sage);border-bottom-color:var(--sage)}
.tab:hover:not(.on){color:var(--ink)}

/* timeline */
.tlw{position:relative;padding-left:32px}
.tlw::before{content:'';position:absolute;left:8px;top:6px;bottom:6px;width:2px;background:var(--bd2);border-radius:1px}
.tli{margin-bottom:11px;position:relative}
.tld{position:absolute;left:-24px;top:11px;width:13px;height:13px;border-radius:50%;background:var(--s);border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:7px;z-index:1}
.tld.done{background:var(--sage);border-color:var(--sage);color:#fff}
.tld.upcoming{}
.tld.target{background:var(--rose);border-color:var(--rose);color:#fff}
.tlc{background:var(--s);border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;border-left:3px solid transparent;box-shadow:var(--sh);transition:var(--tr)}
.tlc.done{border-left-color:var(--sage)}.tlc.target{border-left-color:var(--rose)}
.tlt{display:flex;justify-content:space-between;align-items:center}
.tltitle{font-size:12.5px;font-weight:500;color:var(--ink)}
.tlwk{font-size:9.5px;color:var(--ink3)}
.tldesc{font-size:11.5px;color:var(--ink2);margin-top:2px}

/* checklist */
.clc{margin-bottom:7px}
.clh{display:flex;align-items:center;justify-content:space-between;padding:10px 13px;background:var(--s);border:1px solid var(--bd);border-radius:var(--r);cursor:pointer;transition:background .12s;user-select:none;box-shadow:var(--sh)}
.clh:hover{background:var(--s2)}.clh.open{border-radius:var(--r) var(--r) 0 0;border-bottom:none}
.clhl{display:flex;align-items:center;gap:9px}.clhic{font-size:16px}.clhn{font-size:12.5px;font-weight:500;color:var(--ink)}.clhp{font-size:10px;color:var(--ink3);margin-top:1px}
.clhr{display:flex;align-items:center;gap:7px}
.clmb{width:38px;height:3px;background:var(--s3);border-radius:2px;overflow:hidden}.clmf{height:100%;background:var(--sage);border-radius:2px}
.clch{font-size:9px;color:var(--ink3);transition:transform .2s}.clch.open{transform:rotate(180deg)}
.clis{background:var(--s);border:1px solid var(--bd);border-top:none;border-radius:0 0 var(--r) var(--r)}
.cli{display:flex;align-items:center;gap:9px;padding:8px 13px;border-bottom:1px solid var(--bd3);cursor:pointer;transition:background .1s}
.cli:last-child{border-bottom:none}.cli:hover{background:var(--s2)}
.clbox{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--bd2);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .14s;font-size:9px}
.clbox.on{background:var(--sage);border-color:var(--sage);color:#fff}
.clname{flex:1;font-size:12px;color:var(--ink);transition:all .14s}.clname.done{color:var(--ink3);text-decoration:line-through}

/* emergency */
.ems{margin-bottom:14px}
.em-sl{font-size:9.5px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:7px}
.emc{display:flex;gap:9px;padding:9px 11px;border-radius:var(--r);margin-bottom:6px}
.emc.crit{background:var(--rose-lt);border:1px solid var(--rose-mid)}
.emc.warn{background:var(--amber-lt);border:1px solid var(--amber-mid)}
.emsym{font-size:12.5px;font-weight:500}
.emc.crit .emsym{color:var(--rose)}.emc.warn .emsym{color:var(--amber)}
.emact{font-size:11px;color:var(--ink2);margin-top:2px}
.emh{background:var(--sage-lt);border:1px solid var(--sage-mid);border-radius:var(--r);padding:11px 14px;margin-top:8px}
.emhn{font-size:13px;font-weight:500;color:var(--sage);margin-bottom:2px}
.emhm{font-size:11px;color:var(--ink2)}

/* market */
.mi{padding:14px 18px}
.mi+.mi{border-top:1px solid var(--bd)}
.mn{font-size:13.5px;font-weight:500;color:var(--ink)}
.mm{font-size:11px;color:var(--ink3);margin-top:2px}
.md{font-size:12px;color:var(--ink2);margin-top:6px;line-height:1.5}

/* profile */
.ph{text-align:center;padding:22px 0 14px}
.pname{font-family:var(--ff-s);font-size:20px;font-weight:700;margin:10px 0 3px}
.pmail{font-size:12px;color:var(--ink3)}
.pr{display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;transition:background .12s}
.pr+.pr{border-top:1px solid var(--bd)}.pr:hover{background:var(--s2)}
.pric{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.prl{flex:1;font-size:13px;font-weight:500;color:var(--ink)}
.prv{font-size:11.5px;color:var(--ink3)}
.pra{font-size:15px;color:var(--ink3);margin-left:3px}
.badge-s{background:var(--s3);color:var(--ink3);font-size:10px;padding:2px 7px;border-radius:5px;font-weight:500}

/* connections */
.search-bar{display:flex;gap:9px;margin-bottom:16px}
.search-inp{flex:1;padding:9px 13px;border:1.5px solid var(--bd2);border-radius:var(--r);font-family:var(--ff);font-size:13.5px;background:var(--s);color:var(--ink);outline:none;transition:border-color .15s}
.search-inp:focus{border-color:var(--sage)}
.search-inp::placeholder{color:var(--ink3)}
.user-row{display:flex;align-items:center;gap:11px;padding:11px 14px;background:var(--s);border:1px solid var(--bd);border-radius:var(--rl);margin-bottom:8px;box-shadow:var(--sh);transition:var(--tr)}
.user-info{flex:1;min-width:0}
.user-name{font-size:13.5px;font-weight:500;color:var(--ink)}
.user-meta{font-size:11px;color:var(--ink3);margin-top:2px}
.friend-status{display:flex;align-items:center;gap:6px;flex-shrink:0}

/* members */
.mem-row{display:flex;align-items:center;gap:11px;padding:12px 16px}
.mem-row+.mem-row{border-top:1px solid var(--bd)}
.mem-info{flex:1;min-width:0}
.mem-name{font-size:13.5px;font-weight:500;color:var(--ink)}
.mem-sub{font-size:11px;color:var(--ink3);margin-top:2px}
.mem-role{font-size:11px;color:var(--ink2);margin-top:1px}

/* misc */
.es{text-align:center;padding:44px 20px;color:var(--ink3)}
.esi{font-size:36px;margin-bottom:11px}
.est{font-size:14.5px;font-weight:500;color:var(--ink2);margin-bottom:3px}
.esd{font-size:12.5px}
.ib{border-radius:var(--r);padding:13px 15px;margin-top:12px}
.ib-a{background:var(--amber-lt);border:1px solid var(--amber-mid)}
.ib-g{background:var(--sage-lt);border:1px solid var(--sage-mid)}
.ib-title{font-size:12.5px;font-weight:500;margin-bottom:5px}
.ib-a .ib-title{color:var(--amber)}.ib-g .ib-title{color:var(--sage)}
.ib-body{font-size:12px;color:var(--ink2);line-height:1.7}
.bs{display:flex;align-items:center;justify-content:center;min-height:160px;flex-direction:column;gap:11px;color:var(--ink3);font-size:12.5px}
.sp{width:26px;height:26px;border:2.5px solid var(--bd2);border-top-color:var(--sage);border-radius:50%;animation:spin .65s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu .25s ease both}
.toast{position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:999;padding:9px 18px;background:var(--sage);color:#fff;border-radius:20px;font-size:13px;font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.18);pointer-events:none;animation:fu .2s ease}
@media(max-width:520px){.frow{grid-template-columns:1fr}}
`;

// ─── Micro ────────────────────────────────────────────────────────────────────
function Spin(){return <div className="bs"><div className="sp"/><span>加载中…</span></div>;}
function Msg({t,m}:{t:"e"|"o";m:string}){return <div className={`alert ${t==="e"?"a-err":"a-ok"}`}>{t==="e"?"⚠ ":"✓ "}{m}</div>;}
function Av({name,email,oid,sz="sm"}:{name?:string|null;email?:string|null;oid:string;sz?:"sm"|"md"|"lg"}){
  return <div className={`av av-${sz}`} style={{background:aColor(oid||"?")}}>{ini(name,email)}</div>;
}
function Toast({msg}:{msg:string}){return <div className="toast">{msg}</div>;}

function Modal({title,onClose,footer,children}:{title:string;onClose:()=>void;footer:ReactNode;children:ReactNode}){
  return(
    <div className="modal" onClick={onClose}>
      <div className="modal-bg"/>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd"><div className="mt">{title}</div></div>
        <div className="modal-body">{children}</div>
        <div className="modal-ft">{footer}</div>
      </div>
    </div>
  );
}

function ThemeToggle({theme,setTheme}:{theme:string;setTheme:(t:"light"|"dark")=>void}){
  return(
    <button className="theme-tog" onClick={()=>setTheme(theme==="light"?"dark":"light")}>
      <span>{theme==="light"?"🌙":"☀️"}</span>
      <span style={{flex:1,textAlign:"left"}}>{theme==="light"?"切换夜间":"切换白天"}</span>
    </button>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}:{onAuth:(u:User)=>void}){
  const [mode,setMode]=useState<"login"|"reg">("login");
  // Login uses a flexible identifier (email OR numeric user ID) so existing
  // users can still log in even if they forgot which email they registered with.
  const [id,setId]=useState("");
  const [em,setEm]=useState("");const [pw,setPw]=useState("");const [nm,setNm]=useState("");
  const [ld,setLd]=useState(false);const [err,setErr]=useState("");const [ok,setOk]=useState("");
  const [showForgot,setShowForgot]=useState(false);
  const [forgotEmail,setForgotEmail]=useState("");
  const [forgotBusy,setForgotBusy]=useState(false);
  const [forgotMsg,setForgotMsg]=useState("");
  const [forgotLink,setForgotLink]=useState<string|null>(null);

  const go=async()=>{
    setErr("");setOk("");
    if(mode==="reg"){
      if(!em.trim()||!pw||!nm.trim()){setErr("请填写邮箱、昵称和密码");return;}
      if(pw.length<8){setErr("密码至少8位");return;}
    } else {
      if(!id.trim()||!pw){setErr("请填写账号和密码");return;}
    }
    setLd(true);
    try{
      if(mode==="reg"){
        const res = await (api as any).auth.register.mutate({email:em.trim(),password:pw,name:nm.trim()});
        setOk("注册成功！");
        const user = res?.user ?? (await (api as any).auth.me.query().catch(()=>null));
        if(user) onAuth(user);
        else setErr("注册成功但获取用户信息失败，请刷新重试");
      } else {
        const res = await (api as any).auth.loginWithIdentifier.mutate({identifier:id.trim(),password:pw});
        const user = res?.user ?? (await (api as any).auth.me.query().catch(()=>null));
        if(user) onAuth(user);
        else setErr("登录成功但获取用户信息失败，请刷新重试");
      }
    }catch(e:any){setErr(e?.message||"操作失败，请重试");}
    setLd(false);
  };

  const submitForgot=async()=>{
    setForgotMsg(""); setForgotLink(null);
    if(!forgotEmail.trim()){setForgotMsg("请输入注册邮箱");return;}
    setForgotBusy(true);
    try {
      const r = await (api as any).auth.requestPasswordReset.mutate({email:forgotEmail.trim()});
      if (r?.resetUrl) {
        // Dev/无邮箱服务环境：直接展示链接
        setForgotLink(r.resetUrl);
        setForgotMsg("邮件服务未配置，下方为重置链接：");
      } else {
        setForgotMsg("如果该邮箱已注册，重置链接已发送，请查收邮箱（含垃圾邮件箱）。");
      }
    } catch (e:any) { setForgotMsg(e?.message || "请求失败，请稍后重试"); }
    setForgotBusy(false);
  };

  return(
    <div className="auth-s">
      <div className="auth-card fu">
        <div className="auth-logo">
          <div className="auth-brand">拼<em>朋友</em></div>
          <div className="auth-tag">找到靠谱的朋友，一起把孩子养大。</div>
        </div>
        <div className="auth-tabs">
          <button className={`atab ${mode==="login"?"on":""}`} onClick={()=>{setMode("login");setErr("");}}>登录</button>
          <button className={`atab ${mode==="reg"?"on":""}`} onClick={()=>{setMode("reg");setErr("");}}>注册账号</button>
        </div>
        {err&&<Msg t="e" m={err}/>}{ok&&<Msg t="o" m={ok}/>}
        {mode==="reg"&&<div className="field"><label>昵称</label><input placeholder="你的名字" value={nm} onChange={e=>setNm(e.target.value)}/></div>}
        {mode==="reg"
          ? <div className="field"><label>邮箱</label><input type="email" placeholder="your@email.com" value={em} onChange={e=>setEm(e.target.value)}/></div>
          : <div className="field"><label>账号</label><input placeholder="邮箱或用户 ID" value={id} onChange={e=>setId(e.target.value)} autoComplete="username"/></div>
        }
        <div className="field"><label>密码{mode==="reg"?"（至少8位）":""}</label><input type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} autoComplete={mode==="reg"?"new-password":"current-password"}/></div>
        <button className="btn btn-p btn-full" onClick={go} disabled={ld} style={{marginTop:4}}>{ld?"处理中…":mode==="login"?"登录":"创建账号"}</button>
        <div className="auth-foot">
          {mode==="login"
            ? <button className="btn-link" onClick={()=>{setShowForgot(true);setForgotMsg("");setForgotLink(null);setForgotEmail(em||id);}}>忘记密码？</button>
            : <span style={{fontSize:11}}>注册即表示同意《用户协议》</span>}
          <span style={{fontSize:11,color:"var(--ink3)"}}>v4.3</span>
        </div>
      </div>

      {showForgot && <Modal
        title="找回密码"
        onClose={()=>setShowForgot(false)}
        footer={<>
          <button className="btn btn-g" onClick={()=>setShowForgot(false)}>关闭</button>
          <button className="btn btn-p" onClick={submitForgot} disabled={forgotBusy}>{forgotBusy?"发送中…":"发送重置邮件"}</button>
        </>}
      >
        <div className="field"><label>注册邮箱</label><input type="email" placeholder="your@email.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} autoFocus/></div>
        {forgotMsg && <Msg t="o" m={forgotMsg}/>}
        {forgotLink && <div style={{wordBreak:"break-all",fontSize:11,padding:"8px 10px",background:"var(--s3)",borderRadius:8}}><a href={forgotLink} style={{color:"var(--sage)"}}>{forgotLink}</a></div>}
        <div className="field-hint" style={{marginTop:10}}>我们将发送一个 30 分钟内有效的重置链接到您的邮箱，点击链接即可设置新密码。</div>
      </Modal>}
    </div>
  );
}

// ─── Reset password (URL ?reset_token=...) ────────────────────────────────────
function ResetPasswordScreen({token,onDone}:{token:string;onDone:()=>void}){
  const [pw,setPw]=useState("");
  const [pw2,setPw2]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const submit=async()=>{
    setErr("");setOk("");
    if(pw.length<8){setErr("密码至少 8 位");return;}
    if(pw!==pw2){setErr("两次输入不一致");return;}
    setBusy(true);
    try{
      await (api as any).auth.resetPassword.mutate({token, newPassword: pw});
      setOk("已重置！正在为您登录…");
      setTimeout(()=>{ window.history.replaceState({}, "", "/"); onDone(); }, 800);
    }catch(e:any){setErr(e?.message||"重置失败，链接可能已过期");}
    setBusy(false);
  };
  return (
    <div className="auth-s">
      <div className="auth-card fu">
        <div className="auth-logo">
          <div className="auth-brand">拼<em>朋友</em></div>
          <div className="auth-tag">设置新密码</div>
        </div>
        {err&&<Msg t="e" m={err}/>}{ok&&<Msg t="o" m={ok}/>}
        <div className="field"><label>新密码（至少 8 位）</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus autoComplete="new-password"/></div>
        <div className="field"><label>确认新密码</label><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="new-password"/></div>
        <button className="btn btn-p btn-full" onClick={submit} disabled={busy}>{busy?"提交中…":"重置密码"}</button>
      </div>
    </div>
  );
}

// ─── FamSelect ────────────────────────────────────────────────────────────────
function FamSelect({user,onSel}:{user:User;onSel:(f:Family)=>void}){
  const [fams,setFams]=useState<Family[]>([]);
  const [ld,setLd]=useState(true);
  const [showC,setShowC]=useState(false);const [showJ,setShowJ]=useState(false);
  const [nm,setNm]=useState("");const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
  const load=useCallback(async()=>{
    try{const r=await(api as any).family.myFamilies.query();setFams(r??[]);}
    catch(e){if(isAuthError(e)) handleAuthErrorOnce(); else setErr((e as any)?.message||"加载家庭列表失败");}
    setLd(false);
  },[]);
  useEffect(()=>{load();},[load]);
  const doC=async()=>{if(!nm.trim()){setErr("请填写家庭名称");return;}setBusy(true);setErr("");try{const {familyId}=await(api as any).family.create.mutate({name:nm.trim()});const r=await(api as any).family.myFamilies.query();const f=r?.find((x:Family)=>x.id===familyId);if(f)onSel(f);}catch(e:any){setErr(e?.message||"创建失败");}setBusy(false);};
  const doJ=async()=>{if(!code.trim()){setErr("请输入邀请码");return;}setBusy(true);setErr("");try{const {familyId}=await(api as any).family.join.mutate({inviteCode:code.trim().toUpperCase()});const r=await(api as any).family.myFamilies.query();const f=r?.find((x:Family)=>x.id===familyId);if(f)onSel(f);}catch(e:any){setErr(e?.message||"加入失败");}setBusy(false);};
  if(ld)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><div className="sp"/></div>;
  return(
    <div className="fs">
      <div className="fs-in fu">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <Av name={user.name} email={user.email} oid={user.openId} sz="md"/>
          <div><div style={{fontSize:15,fontWeight:500,color:"var(--ink)"}}>{user.name||user.email}</div><div style={{fontSize:11.5,color:"var(--ink3)"}}>欢迎回来</div></div>
        </div>
        <div className="fs-t">选择家庭</div>
        <div className="fs-s">选择或创建你的家庭空间</div>
        {err&&<Msg t="e" m={err}/>}
        {fams.length===0&&<div className="es"><div className="esi">🏡</div><div className="est">还没有家庭</div><div className="esd">创建或加入开始使用</div></div>}
        {fams.map(f=>(<div key={f.id} className="fo" onClick={()=>onSel(f)}><div><div className="fo-n">{f.name}</div><div className="fo-m">邀请码 {f.inviteCode} · {f.memberRole==="admin"?"管理员":f.memberRole==="collaborator"?"协作者":"观察者"}</div></div><span style={{color:"var(--ink3)",fontSize:20}}>›</span></div>))}
        <div className="fa"><button className="btn btn-o" onClick={()=>setShowC(true)}>+ 创建家庭</button><button className="btn btn-o" onClick={()=>setShowJ(true)}>加入家庭</button></div>
      </div>
      {showC&&<Modal title="创建新家庭" onClose={()=>setShowC(false)} footer={<><button className="btn btn-g" onClick={()=>setShowC(false)}>取消</button><button className="btn btn-p" onClick={doC} disabled={busy}>{busy?"创建中…":"创建"}</button></>}><div className="field"><label>家庭名称</label><input placeholder="例：我们一家" value={nm} onChange={e=>setNm(e.target.value)} autoFocus/></div></Modal>}
      {showJ&&<Modal title="加入家庭" onClose={()=>setShowJ(false)} footer={<><button className="btn btn-g" onClick={()=>setShowJ(false)}>取消</button><button className="btn btn-p" onClick={doJ} disabled={busy}>{busy?"加入中…":"加入"}</button></>}><div className="field"><label>邀请码</label><input placeholder="大写字母+数字" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} autoFocus/></div></Modal>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({fam,kids,tasks,onNav}:{fam:Family;kids:Child[];tasks:Task[];onNav:(p:string)=>void}){
  const child=kids[0];const pg=child?calcWeeks(child):null;
  const edd=child?.eddInfo?.edd;const dl=daysTo(edd);
  const total=tasks.reduce((s,t)=>s+(t.todayCheckins||0),0);
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard?.writeText(fam.inviteCode).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return(
    <div className="fu">
      <div className="hero">
        <div className="hi">
          <div className="ht">{child?child.nickname:fam.name}</div>
          <div className="hs2">{fam.name}{dl!=null&&dl>0?` · ${dl}天后迎接宝宝`:""}</div>
          <div className="h-stats">
            {pg&&<div><div className="hv">{pg.weeks}<span style={{fontSize:14,fontWeight:400,opacity:.8}}>+{pg.days}</span></div><div className="hl">当前孕周</div></div>}
            {dl!=null&&dl>=0&&<div><div className="hv">{dl}</div><div className="hl">距预产天</div></div>}
            <div><div className="hv">{total}</div><div className="hl">今日打卡</div></div>
          </div>
        </div>
      </div>
      <div className="inv">
        <div className="inv-info">
          <div className="inv-lbl">家庭邀请码</div>
          <div className="inv-code">{fam.inviteCode}</div>
          <div className="inv-sub">分享给家人，一起加入管理</div>
        </div>
        <div className="inv-btns">
          <button className="btn-copy" onClick={copy}>{copied?"✓ 已复制":"复制"}</button>
          <button className="btn-icon" onClick={()=>onNav("members")}>成员</button>
        </div>
      </div>
      {kids.length>0&&<>
        <div className="sl2">宝宝档案</div>
        <div className="cg-grid" style={{marginBottom:18}}>
          {kids.map(c=>{const cpg=calcWeeks(c);return(
            <div key={c.id} className="cc">
              <div className="cc-top">
                <div className="cc-bub" style={{background:"var(--sage-lt)"}}>{c.gender==="girl"?"👧":"👶"}</div>
                <div><div className="cn">{c.nickname}</div><div className="cg2">{c.gender==="girl"?"女宝宝":c.gender==="boy"?"男宝宝":"性别待定"}</div></div>
              </div>
              {cpg?<div className="wr"><div className="wb">{cpg.weeks}</div><div className="wu">周 + {cpg.days}天</div></div>
               :c.ageInfo&&<div style={{fontFamily:"var(--ff-s)",fontSize:28,fontWeight:700,color:"var(--sage)"}}>{c.ageInfo.years>0?`${c.ageInfo.years}岁${c.ageInfo.months}月`:`${c.ageInfo.months}月${c.ageInfo.days}天`}</div>}
              {c.eddInfo?.edd&&<div className="edd-tag">🎯 预产期 {fmt(c.eddInfo.edd,{year:"numeric",month:"long",day:"numeric"})}</div>}
            </div>
          );})}
        </div>
      </>}
      {tasks.length>0&&<>
        <div className="sl2">今日打卡</div>
        <div className="tg">{tasks.slice(0,4).map(t=>(<div key={t.id} className="tc" style={{borderTopColor:t.color||"var(--sage)"}}><span className="tic">{t.icon||"📋"}</span><div className="tn">{t.title}</div><div className="tv">{t.todayCheckins}</div><div className="tl">今日次数</div></div>))}</div>
      </>}
      {kids.length===0&&tasks.length===0&&<div className="es"><div className="esi">🌱</div><div className="est">开始使用拼朋友</div><div className="esd">前往「宝宝」添加档案，开始记录</div></div>}
    </div>
  );
}

// ─── Children ─────────────────────────────────────────────────────────────────
function Children({fam,kids,onRefresh}:{fam:Family;kids:Child[];onRefresh:()=>void}){
  const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
  const blank={nickname:"",gender:"unknown" as "unknown"|"boy"|"girl",pregnancyRefDate:"",pregnancyWeeksAtRef:12,pregnancyDaysAtRef:0,notes:""};
  const [f,setF]=useState(blank);
  const reset=()=>setF(blank);
  const doAdd=async()=>{
    if(!f.nickname.trim()){setErr("请填写宝宝昵称");return;}
    setBusy(true);setErr("");
    try{
      await(api as any).children.create.mutate({
        familyId:fam.id,nickname:f.nickname.trim(),
        gender:f.gender==="unknown"?undefined:f.gender,
        pregnancyRefDate:f.pregnancyRefDate||undefined,
        pregnancyWeeksAtRef:f.pregnancyRefDate?f.pregnancyWeeksAtRef:undefined,
        pregnancyDaysAtRef:f.pregnancyRefDate?f.pregnancyDaysAtRef:undefined,
        notes:f.notes||undefined,
      });
      onRefresh();setShow(false);reset();
    }catch(e:any){setErr(e?.message||"添加失败");}
    setBusy(false);
  };
  return(
    <div className="fu">
      <div className="pg-head"><div className="rb"><div><div className="pg-t">宝宝档案</div><div className="pg-s">孕期信息与成长记录</div></div><button className="btn btn-o btn-sm" onClick={()=>setShow(true)}>+ 添加档案</button></div></div>
      {kids.length===0?<div className="es"><div className="esi">👶</div><div className="est">还没有宝宝档案</div><div className="esd">点击右上角添加</div></div>:
      <div className="cg-grid">{kids.map(c=>{const pg=calcWeeks(c);return(
        <div key={c.id} className="cc">
          <div className="cc-top">
            <div className="cc-bub" style={{background:"var(--sage-lt)"}}>{c.gender==="girl"?"👧":"👶"}</div>
            <div><div className="cn">{c.nickname}</div><div className="cg2">{c.gender==="girl"?"女宝宝":c.gender==="boy"?"男宝宝":"性别待定"}</div></div>
          </div>
          {pg?<div className="wr"><div className="wb">{pg.weeks}</div><div className="wu">周 + {pg.days}天</div></div>
           :c.ageInfo&&<div style={{fontFamily:"var(--ff-s)",fontSize:28,fontWeight:700,color:"var(--sage)"}}>{c.ageInfo.years>0?`${c.ageInfo.years}岁${c.ageInfo.months}月`:`${c.ageInfo.months}月${c.ageInfo.days}天`}</div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
            {c.eddInfo?.edd&&<span className="pill p-a">预产 {fmt(c.eddInfo.edd)}</span>}
          </div>
          {c.notes&&<div style={{marginTop:10,padding:"8px 11px",background:"var(--s3)",borderRadius:8,fontSize:12,color:"var(--ink2)",lineHeight:1.6}}>{c.notes}</div>}
        </div>
      );})}</div>}
      {show&&<Modal title="添加宝宝档案" onClose={()=>{setShow(false);reset();}} footer={<><button className="btn btn-g" onClick={()=>{setShow(false);reset();}}>取消</button><button className="btn btn-p" onClick={doAdd} disabled={busy}>{busy?"添加中…":"添加"}</button></>}>
        {err&&<Msg t="e" m={err}/>}
        <div className="field"><label>宝宝昵称</label><input placeholder="例：小宝、糖糖…" value={f.nickname} onChange={e=>setF(p=>({...p,nickname:e.target.value}))} autoFocus/></div>
        <div className="field"><label>性别</label><select value={f.gender} onChange={e=>setF(p=>({...p,gender:e.target.value as any}))}><option value="unknown">暂不填写</option><option value="boy">男宝宝</option><option value="girl">女宝宝</option></select></div>
        <div className="field">
          <label>某次产检的日期（用于推算孕周）</label>
          <input type="date" value={f.pregnancyRefDate} onChange={e=>setF(p=>({...p,pregnancyRefDate:e.target.value}))}/>
          <div className="field-hint">填入任意产检日期，再填当时的孕周+天数，自动推算当前孕周和预产期。不知道可以跳过。</div>
        </div>
        {f.pregnancyRefDate&&<div className="frow">
          <div className="field"><label>当时是第几周</label><input type="number" min={0} max={42} value={f.pregnancyWeeksAtRef} onChange={e=>setF(p=>({...p,pregnancyWeeksAtRef:+e.target.value}))}/></div>
          <div className="field"><label>加几天（0-6）</label><input type="number" min={0} max={6} value={f.pregnancyDaysAtRef} onChange={e=>setF(p=>({...p,pregnancyDaysAtRef:+e.target.value}))}/></div>
        </div>}
        <div className="field"><label>备注（可选）</label><input placeholder="任何想记录的信息…" value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))}/></div>
      </Modal>}
    </div>
  );
}

// ─── Manual ───────────────────────────────────────────────────────────────────
function Manual({kids}:{kids:Child[]}){
  const child=kids[0];const pg=child?calcWeeks(child):null;
  const [tab,setTab]=useState<"tl"|"items"|"em">("tl");
  const [ck,setCk]=useState<Record<string,boolean>>(()=>{try{return JSON.parse(localStorage.getItem("ppy_cl")||"{}");}catch{return{};}});
  const [oCat,setOCat]=useState<number|null>(0);
  const tog=(ci:number,ii:number)=>{const k=`${ci}-${ii}`;setCk(p=>{const n={...p,[k]:!p[k]};localStorage.setItem("ppy_cl",JSON.stringify(n));return n;});};
  const total=ITEMS.reduce((s,c)=>s+c.items.length,0);
  const done=Object.values(ck).filter(Boolean).length;
  const pct=Math.round((done/total)*100);
  const emG=EM.reduce((a,e)=>{if(!a[e.t])a[e.t]=[];a[e.t].push(e);return a;},{} as Record<string,(typeof EM)[number][]>);
  return(
    <div className="fu">
      <div className="pg-head"><div className="pg-t">孕育手册</div><div className="pg-s">{pg?`孕 ${pg.weeks}+${pg.days} 周 · `:""}孕期节点 · 待产清单 · 应急预案</div></div>
      <div className="tabs">
        <button className={`tab ${tab==="tl"?"on":""}`} onClick={()=>setTab("tl")}>📅 孕期节点</button>
        <button className={`tab ${tab==="items"?"on":""}`} onClick={()=>setTab("items")}>🛒 待产清单 {pct}%</button>
        <button className={`tab ${tab==="em"?"on":""}`} onClick={()=>setTab("em")}>🚨 应急预案</button>
      </div>
      {tab==="tl"&&<div>
        {child&&pg&&<div className="card" style={{display:"flex",gap:20,alignItems:"center",marginBottom:18,flexWrap:"wrap"}}>
          <div><div style={{fontSize:11,color:"var(--ink3)"}}>当前孕周</div><div style={{fontFamily:"var(--ff-s)",fontSize:40,fontWeight:700,color:"var(--sage)",lineHeight:1}}>{pg.weeks}<span style={{fontSize:15,color:"var(--ink3)"}}>+{pg.days}天</span></div></div>
          {child.eddInfo?.edd&&<div style={{borderLeft:"1px solid var(--bd)",paddingLeft:20}}><div style={{fontSize:11,color:"var(--ink3)"}}>预产期</div><div style={{fontFamily:"var(--ff-s)",fontSize:19,fontWeight:700,color:"var(--amber)",marginTop:3}}>{fmt(child.eddInfo.edd,{year:"numeric",month:"long",day:"numeric"})}</div><div style={{fontSize:11,color:"var(--ink3)",marginTop:2}}>还有 {Math.max(0,daysTo(child.eddInfo.edd)??0)} 天</div></div>}
        </div>}
        <div className="tlw">{TL_NODES.map((n,i)=><div key={i} className="tli"><div className={`tld ${n.s}`}>{n.s==="done"?"✓":n.s==="target"?"♥":""}</div><div className={`tlc ${n.s}`}><div className="tlt"><span className="tltitle">{n.title}</span><span className="tlwk">{n.week}</span></div><div className="tldesc">{n.desc}</div></div></div>)}</div>
      </div>}
      {tab==="items"&&<div>
        <div className="rb" style={{marginBottom:8}}><span style={{fontSize:12,color:"var(--ink3)"}}>{done}/{total} 已准备</span><span style={{fontSize:12,fontWeight:600,color:"var(--sage)"}}>{pct}%</span></div>
        <div className="prog" style={{marginBottom:16}}><div className="prog-f" style={{width:`${pct}%`}}/></div>
        {ITEMS.map((cat,ci)=>{const cd=cat.items.filter((_,ii)=>ck[`${ci}-${ii}`]).length;const io=oCat===ci;return(
          <div key={ci} className="clc">
            <div className={`clh ${io?"open":""}`} onClick={()=>setOCat(io?null:ci)}>
              <div className="clhl"><span className="clhic">{cat.icon}</span><div><div className="clhn">{cat.cat}</div><div className="clhp">{cd}/{cat.items.length} 已准备</div></div></div>
              <div className="clhr"><div className="clmb"><div className="clmf" style={{width:`${Math.round((cd/cat.items.length)*100)}%`}}/></div><span className={`clch ${io?"open":""}`}>▼</span></div>
            </div>
            {io&&<div className="clis">{cat.items.map((item,ii)=>{const k=`${ci}-${ii}`;const on=!!ck[k];return(<div key={ii} className="cli" onClick={()=>tog(ci,ii)}><div className={`clbox ${on?"on":""}`}>{on?"✓":""}</div><span className={`clname ${on?"done":""}`}>{item}</span></div>);})}</div>}
          </div>
        );})}
      </div>}
      {tab==="em"&&<div>
        {Object.entries(emG).map(([t2,items])=>(<div key={t2} className="ems"><div className="em-sl">{t2==="孕期"?"🤰":t2==="产后"?"🌸":"👶"} {t2}</div>{items.map((item,i)=><div key={i} className={`emc ${item.l}`}><span style={{fontSize:15,flexShrink:0,lineHeight:1.5}}>{item.l==="crit"?"🚨":"⚠️"}</span><div><div className="emsym">{item.s}</div><div className="emact">{item.a}</div></div></div>)}</div>))}
        <div className="emh"><div className="emhn">📍 紧急求助</div><div className="emhm">产科急诊 / 儿科急诊 · 拨打 120 全国急救热线 · 就近医院就医</div></div>
      </div>}
    </div>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
function Tasks({fam,tasks,onRefresh}:{fam:Family;tasks:Task[];onRefresh:()=>void}){
  const [busy,setBusy]=useState<number|null>(null);
  const [show,setShow]=useState(false);
  const [f,setF]=useState({title:"",icon:"📋",color:"#3D7A5A",category:"other"});
  const ck=async(id:number)=>{setBusy(id);try{await(api as any).tasks.checkin.mutate({taskId:id});onRefresh();}catch{}setBusy(null);};
  const add=async()=>{if(!f.title.trim())return;try{await(api as any).tasks.create.mutate({familyId:fam.id,...f});onRefresh();setShow(false);}catch{}};
  const CL:Record<string,string>={feeding:"喂养",sleep:"睡眠",checkup:"检查",play:"运动",bath:"洗浴",other:"其他"};
  return(
    <div className="fu">
      <div className="pg-head"><div className="rb"><div><div className="pg-t">日常打卡</div><div className="pg-s">今日已打卡 {tasks.reduce((s,t)=>s+(t.todayCheckins||0),0)} 次</div></div><button className="btn btn-o btn-sm" onClick={()=>setShow(true)}>+ 新任务</button></div></div>
      {tasks.length===0?<div className="es"><div className="esi">✅</div><div className="est">还没有打卡任务</div></div>:
      <div className="tg">{tasks.filter(t=>t.isActive!==false).map(t=>(<div key={t.id} className="tc" style={{borderTopColor:t.color||"var(--sage)"}}><span className="tic">{t.icon||"📋"}</span><div className="tn">{t.title}</div><div className="tcat">{CL[t.category]||t.category}</div><div className="tv">{t.todayCheckins}</div><div className="tl">今日次数</div><button className="btck" style={{background:busy===t.id?"var(--s3)":t.color||"var(--sage)",color:busy===t.id?"var(--ink3)":"#fff"}} onClick={()=>ck(t.id)} disabled={busy===t.id}>{busy===t.id?"记录中…":"✓ 打卡"}</button></div>))}</div>}
      {show&&<Modal title="添加打卡任务" onClose={()=>setShow(false)} footer={<><button className="btn btn-g" onClick={()=>setShow(false)}>取消</button><button className="btn btn-p" onClick={add}>添加</button></>}>
        <div className="field"><label>任务名称</label><input placeholder="例：体重记录" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))} autoFocus/></div>
        <div className="frow"><div className="field"><label>图标</label><input value={f.icon} onChange={e=>setF(p=>({...p,icon:e.target.value}))}/></div><div className="field"><label>颜色</label><input type="color" value={f.color} onChange={e=>setF(p=>({...p,color:e.target.value}))} style={{height:40,cursor:"pointer"}}/></div></div>
        <div className="field"><label>类别</label><select value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))}><option value="feeding">喂养</option><option value="sleep">睡眠</option><option value="checkup">检查</option><option value="play">运动</option><option value="bath">洗浴</option><option value="other">其他</option></select></div>
      </Modal>}
    </div>
  );
}

// ─── Market ───────────────────────────────────────────────────────────────────
function Market(){
  const [tab,setTab]=useState<"sk"|"rq"|"me">("sk");
  const [sk,setSk]=useState<Skill[]>([]);const [rq,setRq]=useState<HelpReq[]>([]);const [me,setMe]=useState<Skill[]>([]);
  const [ld,setLd]=useState(true);
  const [shS,setShS]=useState(false);const [shR,setShR]=useState(false);
  const [sf,setSf]=useState({name:"",category:"other",description:"",location:"",priceMin:"",priceMax:""});
  const [rf,setRf]=useState({title:"",description:"",location:"",urgency:"medium"});
  const load=useCallback(async()=>{setLd(true);try{const[a,b,c]=await Promise.all([(api as any).skills.list.query({limit:20,offset:0}),(api as any).helpRequests.list.query({limit:20,offset:0}),(api as any).skills.mySkills.query()]);setSk(a||[]);setRq(b||[]);setMe(c||[]);}catch{}setLd(false);},[]);
  useEffect(()=>{load();},[load]);
  const pubS=async()=>{if(!sf.name.trim())return;try{await(api as any).skills.create.mutate(sf);load();setShS(false);}catch(e:any){alert(e?.message||"发布失败");}};
  const pubR=async()=>{if(!rf.title.trim())return;try{await(api as any).helpRequests.create.mutate(rf);load();setShR(false);}catch(e:any){alert(e?.message||"发布失败");}};
  const CL:Record<string,string>={education:"教育",childcare:"育儿",housekeeping:"家政",tech:"技术",other:"其他"};
  const UL:Record<string,string>={low:"不急",medium:"一般",high:"紧急"};
  return(
    <div className="fu">
      <div className="pg-head"><div className="rb"><div><div className="pg-t">技能市场</div><div className="pg-s">信任圈内发布与寻找服务</div></div><div className="re"><button className="btn btn-o btn-sm" onClick={()=>setShS(true)}>+ 发布技能</button><button className="btn btn-sm" style={{padding:"6px 11px",background:"transparent",color:"var(--amber)",border:"1.5px solid var(--amber-mid)",borderRadius:"var(--r)",fontFamily:"var(--ff)",fontSize:"11.5px",cursor:"pointer"}} onClick={()=>setShR(true)}>+ 发布求助</button></div></div></div>
      <div className="tabs">{[["sk","技能列表"],["rq","求助列表"],["me","我的发布"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>setTab(k as any)}>{l}</button>)}</div>
      {ld?<Spin/>:<>
        {tab==="sk"&&(sk.length===0?<div className="es"><div className="esi">🛍</div><div className="est">暂无技能发布</div></div>:<div className="card card-p0">{sk.map((s,i)=><div key={i} className="mi"><div className="rb"><div><div className="mn">{s.name}</div><div className="mm">{CL[s.category||""]||s.category}{s.location?` · ${s.location}`:""}</div></div>{(s.priceMin||s.priceMax)&&<span className="pill p-a">¥{s.priceMin}~{s.priceMax}</span>}</div>{s.description&&<div className="md">{s.description}</div>}</div>)}</div>)}
        {tab==="rq"&&(rq.length===0?<div className="es"><div className="esi">🙋</div><div className="est">暂无求助</div></div>:<div className="card card-p0">{rq.map((r,i)=><div key={i} className="mi"><div className="rb"><div className="mn">{r.title}</div><span className={`pill ${r.urgency==="high"?"p-r":r.urgency==="medium"?"p-a":"p-gr"}`}>{UL[r.urgency||"medium"]}</span></div>{r.location&&<div className="mm">{r.location}</div>}{r.description&&<div className="md">{r.description}</div>}</div>)}</div>)}
        {tab==="me"&&(me.length===0?<div className="es"><div className="esi">📤</div><div className="est">还没有发布</div></div>:<div className="card card-p0">{me.map((s,i)=><div key={i} className="mi"><div className="rb"><div><div className="mn">{s.name}</div><div className="mm">{CL[s.category||""]||s.category}{s.location?` · ${s.location}`:""}</div></div><span className={`pill ${s.status==="active"?"p-g":"p-gr"}`}>{s.status==="active"?"上架中":"已下架"}</span></div></div>)}</div>)}
      </>}
      {shS&&<Modal title="发布技能" onClose={()=>setShS(false)} footer={<><button className="btn btn-g" onClick={()=>setShS(false)}>取消</button><button className="btn btn-p" onClick={pubS}>发布</button></>}>
        <div className="field"><label>技能名称</label><input placeholder="例：母婴护理、营养咨询…" value={sf.name} onChange={e=>setSf(p=>({...p,name:e.target.value}))} autoFocus/></div>
        <div className="field"><label>类别</label><select value={sf.category} onChange={e=>setSf(p=>({...p,category:e.target.value}))}><option value="education">教育</option><option value="childcare">育儿</option><option value="housekeeping">家政</option><option value="tech">技术</option><option value="other">其他</option></select></div>
        <div className="field"><label>描述</label><textarea placeholder="简要介绍技能和经验…" value={sf.description} onChange={e=>setSf(p=>({...p,description:e.target.value}))}/></div>
        <div className="field"><label>服务地点</label><input placeholder="线上 / 同城…" value={sf.location} onChange={e=>setSf(p=>({...p,location:e.target.value}))}/></div>
        <div className="frow"><div className="field"><label>最低价（元）</label><input type="number" value={sf.priceMin} onChange={e=>setSf(p=>({...p,priceMin:e.target.value}))}/></div><div className="field"><label>最高价（元）</label><input type="number" value={sf.priceMax} onChange={e=>setSf(p=>({...p,priceMax:e.target.value}))}/></div></div>
      </Modal>}
      {shR&&<Modal title="发布求助" onClose={()=>setShR(false)} footer={<><button className="btn btn-g" onClick={()=>setShR(false)}>取消</button><button className="btn btn-p" onClick={pubR}>发布</button></>}>
        <div className="field"><label>求助标题</label><input placeholder="需要什么帮助？" value={rf.title} onChange={e=>setRf(p=>({...p,title:e.target.value}))} autoFocus/></div>
        <div className="field"><label>描述</label><textarea placeholder="详细说明需求…" value={rf.description} onChange={e=>setRf(p=>({...p,description:e.target.value}))}/></div>
        <div className="frow"><div className="field"><label>地点</label><input placeholder="线上/同城" value={rf.location} onChange={e=>setRf(p=>({...p,location:e.target.value}))}/></div><div className="field"><label>紧急程度</label><select value={rf.urgency} onChange={e=>setRf(p=>({...p,urgency:e.target.value}))}><option value="low">不急</option><option value="medium">一般</option><option value="high">紧急</option></select></div></div>
      </Modal>}
    </div>
  );
}

// ─── Connections ──────────────────────────────────────────────────────────────
function Connections(){
  const [tab,setTab]=useState<"friends"|"search"|"requests">("friends");
  const [friends,setFriends]=useState<Friend[]>([]);
  const [searchQ,setSearchQ]=useState("");
  const [searchRes,setSearchRes]=useState<Friend[]>([]);
  const [ld,setLd]=useState(false);const [searching,setSearching]=useState(false);
  const [actionBusy,setActionBusy]=useState<number|null>(null);
  const [toast,setToast]=useState("");
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  const loadFriends=useCallback(async()=>{setLd(true);try{const r=await(api as any).connections?.list?.query()??[];setFriends(r);}catch{}setLd(false);},[]);
  useEffect(()=>{loadFriends();},[loadFriends]);
  const doSearch=async()=>{if(!searchQ.trim())return;setSearching(true);setSearchRes([]);try{const r=await(api as any).connections?.search?.query({q:searchQ.trim()})??[];setSearchRes(r);}catch{}setSearching(false);};
  const addFriend=async(userId:number)=>{setActionBusy(userId);try{await(api as any).connections?.sendRequest?.mutate({toUserId:userId});showToast("好友请求已发送！");setSearchRes(prev=>prev.map(u=>u.id===userId?{...u,status:"pending"}:u));}catch(e:any){showToast(e?.message||"发送失败");}setActionBusy(null);};
  const acceptFriend=async(userId:number)=>{setActionBusy(userId);try{await(api as any).connections?.acceptRequest?.mutate({fromUserId:userId});showToast("已添加好友！");loadFriends();}catch(e:any){showToast(e?.message||"操作失败");}setActionBusy(null);};
  const removeFriend=async(userId:number)=>{if(!confirm("确定移除该好友吗？"))return;setActionBusy(userId);try{await(api as any).connections?.remove?.mutate({userId});setFriends(prev=>prev.filter(f=>f.id!==userId));}catch{}setActionBusy(null);};
  const pendingReqs=friends.filter(f=>f.status==="pending_incoming");
  const confirmedFriends=friends.filter(f=>f.status==="accepted");
  return(
    <div className="fu">
      {toast&&<Toast msg={toast}/>}
      <div className="pg-head"><div className="pg-t">人脉圈</div><div className="pg-s">与信任的朋友互相连接，共享育儿资源</div></div>
      <div className="tabs">
        <button className={`tab ${tab==="friends"?"on":""}`} onClick={()=>setTab("friends")}>好友{confirmedFriends.length>0?` (${confirmedFriends.length})`:""}</button>
        <button className={`tab ${tab==="search"?"on":""}`} onClick={()=>setTab("search")}>搜索用户</button>
        <button className={`tab ${tab==="requests"?"on":""}`} onClick={()=>setTab("requests")}>好友请求{pendingReqs.length>0?` (${pendingReqs.length})`:""}</button>
      </div>
      {tab==="friends"&&<div>
        {ld?<Spin/>:confirmedFriends.length===0?<div className="es"><div className="esi">👥</div><div className="est">还没有好友</div><div className="esd">通过「搜索用户」添加你认识的朋友</div></div>:
          confirmedFriends.map(f=>(<div key={f.id} className="user-row"><Av name={f.name} email={f.email} oid={f.openId} sz="md"/><div className="user-info"><div className="user-name">{f.name||f.email||"用户"}</div><div className="user-meta">{f.email} · 信用分 {f.creditScore??100}</div></div><button className="btn-icon" onClick={()=>removeFriend(f.id)} disabled={actionBusy===f.id}>移除</button></div>))
        }
      </div>}
      {tab==="search"&&<div>
        <div className="search-bar"><input className="search-inp" placeholder="搜索昵称或邮箱…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}/><button className="btn btn-p btn-sm" onClick={doSearch} disabled={searching}>{searching?"搜索中…":"搜索"}</button></div>
        {searchRes.length===0&&!searching&&searchQ&&<div className="es" style={{padding:"24px 0"}}><div className="esi" style={{fontSize:28}}>🔍</div><div className="est">没有找到用户</div></div>}
        {searchRes.map(u=>(<div key={u.id} className="user-row"><Av name={u.name} email={u.email} oid={u.openId} sz="md"/><div className="user-info"><div className="user-name">{u.name||"用户"}</div><div className="user-meta">{u.email} · 信用分 {u.creditScore??100}</div></div><div className="friend-status">{u.status==="accepted"?<span className="pill p-g">已是好友</span>:u.status==="pending"?<span className="pill p-gr">已发送</span>:<button className="btn-copy" style={{fontSize:11}} onClick={()=>addFriend(u.id)} disabled={actionBusy===u.id}>{actionBusy===u.id?"发送中…":"+ 加好友"}</button>}</div></div>))}
      </div>}
      {tab==="requests"&&<div>
        {pendingReqs.length===0?<div className="es"><div className="esi">📩</div><div className="est">暂无好友请求</div></div>:
          pendingReqs.map(f=>(<div key={f.id} className="user-row"><Av name={f.name} email={f.email} oid={f.openId} sz="md"/><div className="user-info"><div className="user-name">{f.name||"用户"}</div><div className="user-meta">{f.email}</div></div><div className="friend-status"><button className="btn-copy" style={{fontSize:11}} onClick={()=>acceptFriend(f.id)} disabled={actionBusy===f.id}>{actionBusy===f.id?"处理中…":"接受"}</button><button className="btn-icon" style={{fontSize:11}} onClick={()=>removeFriend(f.id)}>忽略</button></div></div>))
        }
      </div>}
    </div>
  );
}

// ─── Members (家庭成员管理) ────────────────────────────────────────────────────
function Members({fam}:{fam:Family}){
  const [members,setMembers]=useState<FamilyMember[]>([]);
  const [ld,setLd]=useState(true);
  const [show,setShow]=useState(false);const [editMem,setEditMem]=useState<FamilyMember|null>(null);
  const [busy,setBusy]=useState(false);const [toast,setToast]=useState("");
  const blank={name:"",relation:"",remark:"",birthday:"",role:"collaborator" as string};
  const [f,setF]=useState(blank);
  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(""),2500);};
  const loadMembers=useCallback(async()=>{setLd(true);try{const r=await(api as any).family.members?.query({familyId:fam.id})??[];setMembers(r);}catch{}setLd(false);},[fam.id]);
  useEffect(()=>{loadMembers();},[loadMembers]);
  const openEdit=(m:FamilyMember)=>{setEditMem(m);setF({name:m.name||"",relation:m.relation||"",remark:m.remark||"",birthday:m.birthday||"",role:m.role});setShow(true);};
  // openAdd: 这里是给"已加入家庭"的成员补充资料；新增成员仍需通过邀请码加入。
  const openAdd=()=>{showToast("请用上方邀请码邀请家人加入，加入后再补充信息");};
  const save=async()=>{
    if(!editMem){setShow(false);return;}
    setBusy(true);
    try{
      await(api as any).family.updateMember?.mutate({familyId:fam.id,userId:editMem.userId,relation:f.relation||undefined,remark:f.remark||undefined,birthday:f.birthday||undefined,role:f.role});
      showToast("已更新成员信息");
      loadMembers();setShow(false);
    }catch(e:any){showToast(e?.message||"操作失败");}
    setBusy(false);
  };
  const removeMember=async(userId:number)=>{if(!confirm("确定移除该成员吗？"))return;try{await(api as any).family.removeMember?.mutate({familyId:fam.id,userId});showToast("已移除成员");loadMembers();}catch(e:any){showToast(e?.message||"操作失败");}};
  const ROLES:Record<string,string>={admin:"管理员",collaborator:"协作者",observer:"观察者",viewer:"观察者"};
  const RELATIONS=["爸爸","妈妈","爷爷","奶奶","外公","外婆","叔叔","阿姨","姑姑","舅舅","月嫂","保姆","其他"];
  return(
    <div className="fu">
      {toast&&<Toast msg={toast}/>}
      <div className="pg-head"><div className="rb"><div><div className="pg-t">家庭成员</div><div className="pg-s">管理家庭成员信息与权限</div></div><button className="btn btn-o btn-sm" onClick={openAdd}>+ 添加成员</button></div></div>
      {/* invite reminder */}
      <div className="card" style={{marginBottom:16,background:"var(--sage-lt)",border:"1px solid var(--sage-mid)"}}>
        <div style={{fontSize:12.5,color:"var(--sage)",fontWeight:500,marginBottom:4}}>📋 邀请家人加入</div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,letterSpacing:3,color:"var(--ink)"}}>{fam.inviteCode}</div>
          <button className="btn-copy" onClick={()=>{navigator.clipboard?.writeText(fam.inviteCode).catch(()=>{});showToast("邀请码已复制");}}>复制邀请码</button>
        </div>
        <div style={{fontSize:11,color:"var(--ink3)",marginTop:4}}>将邀请码分享给家人，他们可以加入并看到家庭信息</div>
      </div>
      {ld?<Spin/>:members.length===0?<div className="es"><div className="esi">👪</div><div className="est">还没有成员资料</div><div className="esd">可以为已加入的家人补充关系、备注等信息</div></div>:
      <div className="card card-p0">
        {members.map((m)=>(
          <div key={m.userId} className="mem-row">
            <Av name={m.name} email={m.email} oid={m.openId} sz="md"/>
            <div className="mem-info">
              <div className="mem-name">{m.name||m.email||"成员"}</div>
              <div className="mem-sub">
                {m.relation&&<span style={{marginRight:8}}>👤 {m.relation}</span>}
                {m.birthday&&<span style={{marginRight:8}}>🎂 {fmt(m.birthday,{month:"long",day:"numeric"})}</span>}
                {m.remark&&<span style={{color:"var(--ink3)"}}>· {m.remark}</span>}
              </div>
              <div className="mem-role"><span className={`pill ${m.role==="admin"?"p-g":"p-gr"}`}>{ROLES[m.role]||m.role}</span></div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="btn-icon" onClick={()=>openEdit(m)}>编辑</button>
              {m.role!=="admin"&&<button className="btn-icon" style={{color:"var(--rose)"}} onClick={()=>removeMember(m.userId)}>移除</button>}
            </div>
          </div>
        ))}
      </div>}
      {show&&<Modal title={editMem?"编辑成员信息":"添加成员信息"} onClose={()=>setShow(false)} footer={<><button className="btn btn-g" onClick={()=>setShow(false)}>取消</button><button className="btn btn-p" onClick={save} disabled={busy}>{busy?"保存中…":"保存"}</button></>}>
        {editMem&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 12px",background:"var(--s3)",borderRadius:"var(--r)"}}>
          <Av name={editMem.name} email={editMem.email} oid={editMem.openId} sz="sm"/>
          <div><div style={{fontSize:13,fontWeight:500,color:"var(--ink)"}}>{editMem.name||editMem.email||"成员"}</div><div style={{fontSize:11,color:"var(--ink3)"}}>{editMem.email}</div></div>
        </div>}
        <div className="field">
          <label>关系</label>
          <select value={f.relation} onChange={e=>setF(p=>({...p,relation:e.target.value}))}>
            <option value="">请选择关系</option>
            {RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field"><label>生日</label><input type="date" value={f.birthday} onChange={e=>setF(p=>({...p,birthday:e.target.value}))} placeholder="可选"/></div>
        <div className="field"><label>备注</label><input placeholder="例：主要负责夜间照顾" value={f.remark} onChange={e=>setF(p=>({...p,remark:e.target.value}))}/></div>
        <div className="field">
          <label>角色权限</label>
          <select value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))}>
            <option value="collaborator">协作者（可查看和操作）</option>
            <option value="observer">观察者（只可查看）</option>
            <option value="admin">管理员（完全权限）</option>
          </select>
        </div>
      </Modal>}
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function Profile({user,fam,theme,setTheme,onLogout,onSwitch,onNav}:{user:User;fam:Family;theme:string;setTheme:(t:"light"|"dark")=>void;onLogout:()=>void;onSwitch:()=>void;onNav:(p:string)=>void}){
  return(
    <div className="fu">
      <div className="ph">
        <Av name={user.name} email={user.email} oid={user.openId} sz="lg" />
        <div className="pname">{user.name||"用户"}</div>
        <div className="pmail">{user.email}</div>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:10}}>
          <span className="pill p-g">信用分 {user.creditScore??100}</span>
          <span className="pill p-gr">{fam.memberRole==="admin"?"管理员":fam.memberRole==="collaborator"?"协作者":"观察者"}</span>
        </div>
      </div>
      <div className="card card-p0" style={{marginBottom:12}}>
        <div className="pr" onClick={onSwitch}><span className="pric">🏠</span><span className="prl">当前家庭</span><span className="prv">{fam.name}</span><span className="pra">›</span></div>
        <div className="pr" onClick={()=>onNav("members")}><span className="pric">👪</span><span className="prl">家庭成员管理</span><span className="pra">›</span></div>
        <div className="pr" onClick={()=>{navigator.clipboard?.writeText(fam.inviteCode).catch(()=>{});}}><span className="pric">🎟️</span><span className="prl">邀请码</span><span className="prv" style={{fontFamily:"monospace",letterSpacing:2}}>{fam.inviteCode}</span></div>
      </div>
      <div className="card card-p0" style={{marginBottom:12}}>
        <div className="pr" onClick={()=>setTheme(theme==="light"?"dark":"light")}><span className="pric">{theme==="light"?"🌙":"☀️"}</span><span className="prl">{theme==="light"?"切换夜间模式":"切换白天模式"}</span><span className="prv">{theme==="light"?"深色":"浅色"}</span></div>
        <div className="pr"><span className="pric">🔗</span><span className="prl">绑定 微信</span><span className="badge-s">即将上线</span></div>
        <div className="pr"><span className="pric">🌟</span><span className="prl">信用体系</span><span className="badge-s">即将上线</span></div>
      </div>
      <div className="card card-p0" style={{marginBottom:16}}>
        <div className="pr"><span className="pric">📖</span><span className="prl">关于拼朋友</span><span className="prv">v4.3</span><span className="pra">›</span></div>
      </div>
      <button className="btn btn-d" onClick={onLogout}>退出登录</button>
      <div style={{height:24}}/>
    </div>
  );
}

// ─── Sidebar & nav ────────────────────────────────────────────────────────────
const NAV=[
  {id:"home",ic:"🏠",l:"首页"},
  {id:"children",ic:"👶",l:"宝宝档案"},
  {id:"manual",ic:"📖",l:"孕育手册"},
  {id:"tasks",ic:"✅",l:"日常打卡"},
  {id:"market",ic:"🛍",l:"技能市场"},
  {id:"connections",ic:"👥",l:"人脉圈"},
  {id:"members",ic:"👪",l:"家庭成员"},
  {id:"profile",ic:"👤",l:"我的"},
];
const MTABS=[
  {id:"home",ic:"🏠",l:"首页"},
  {id:"children",ic:"👶",l:"宝宝"},
  {id:"manual",ic:"📖",l:"手册"},
  {id:"tasks",ic:"✅",l:"打卡"},
  {id:"connections",ic:"👥",l:"人脉"},
  {id:"members",ic:"👪",l:"成员"},
  {id:"profile",ic:"👤",l:"我的"},
];
const PTITLES:Record<string,string>={home:"首页",children:"宝宝档案",manual:"孕育手册",tasks:"日常打卡",market:"技能市场",connections:"人脉圈",members:"家庭成员",profile:"我的"};

function SB({fam,user,page,theme,setTheme,onNav,onSwitch}:{fam:Family;user:User;page:string;theme:string;setTheme:(t:"light"|"dark")=>void;onNav:(p:string)=>void;onSwitch:()=>void}){
  return(
    <>
      <div className="sb-logo"><div className="logo">拼<em>朋友</em></div><div className="logo-sub">家庭管理 · 信任圈</div></div>
      <div className="sb-fam" onClick={onSwitch}><div className="sb-fn">{fam.name}</div><div className="sb-fc">邀请码 {fam.inviteCode}</div></div>
      <div className="sb-nav">
        {NAV.map(n=>(<button key={n.id} className={`nb ${page===n.id?"on":""}`} onClick={()=>onNav(n.id)}><span className="nb-ic">{n.ic}</span>{n.l}</button>))}
      </div>
      <div className="sb-bot">
        <ThemeToggle theme={theme} setTheme={setTheme}/>
        <div className="uc" onClick={()=>onNav("profile")}>
          <div className="av av-sm" style={{background:aColor(user.openId)}}>{ini(user.name,user.email)}</div>
          <div style={{flex:1,minWidth:0}}><div className="un">{user.name||"用户"}</div><div className="ue">{user.email||user.openId}</div></div>
        </div>
      </div>
    </>
  );
}

// ─── Error boundary (prevents the white-screen-of-death) ─────────────────────
class AppErrorBoundary extends Component<{children:ReactNode},{error:Error|null}>{
  state = { error: null as Error | null };
  static getDerivedStateFromError(err:Error){ return { error: err }; }
  componentDidCatch(error:Error,info:ErrorInfo){
    console.error("[AppErrorBoundary]", error, info);
    if (isAuthError(error)) handleAuthErrorOnce();
  }
  render(){
    if (!this.state.error) return this.props.children;
    const msg = (this.state.error as any)?.message ?? String(this.state.error);
    return (
      <div className="auth-s">
        <style>{CSS}</style>
        <div className="auth-card fu">
          <div className="auth-logo">
            <div className="auth-brand">拼<em>朋友</em></div>
            <div className="auth-tag">页面遇到了一个意外错误</div>
          </div>
          <div className="alert a-err" style={{marginBottom:14,wordBreak:"break-word"}}>{msg}</div>
          <button className="btn btn-p btn-full" onClick={()=>window.location.reload()}>刷新重试</button>
          <div style={{textAlign:"center",marginTop:10}}>
            <button className="btn-link" onClick={()=>{handleAuthErrorOnce();}}>清除登录态并返回</button>
          </div>
        </div>
      </div>
    );
  }
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function AppInner(){
  const [user,setUser]=useState<User|null|undefined>(undefined);
  const [fam,setFam]=useState<Family|null>(null);
  const [kids,setKids]=useState<Child[]>([]);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [dld,setDld]=useState(false);
  const [page,setPage]=useState("home");
  const [drawer,setDrawer]=useState(false);
  const [theme,setTheme]=useTheme();
  const [resetToken] = useState<string|null>(()=>getQuery("reset_token"));

  // Global unhandled-rejection handler — auth errors become a clean reload
  useEffect(()=>{
    const onRejection = (ev: PromiseRejectionEvent) => {
      if (isAuthError(ev.reason)) {
        ev.preventDefault();
        handleAuthErrorOnce();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  },[]);

  useEffect(()=>{
    if (resetToken) { setUser(null); return; } // skip auth-me on reset flow
    (api as any).auth.me.query()
      .then((u:User|null)=>setUser(u))
      .catch((e:any)=>{
        if (isAuthError(e)) handleAuthErrorOnce();
        setUser(null);
      });
  },[resetToken]);

  const loadData=useCallback(async(f:Family)=>{
    setDld(true);
    try{const[k,t]=await Promise.all([(api as any).children.list.query({familyId:f.id}),(api as any).tasks.list.query({familyId:f.id})]);setKids(k??[]);setTasks(t??[]);}
    catch(e){if(isAuthError(e)) handleAuthErrorOnce();}
    setDld(false);
  },[]);

  useEffect(()=>{if(fam)loadData(fam);},[fam,loadData]);

  const logout=async()=>{try{await(api as any).auth.logout.mutate();}catch{}setUser(null);setFam(null);};
  const switchFam=()=>{setFam(null);setPage("home");};
  const nav=(p:string)=>{setPage(p);setDrawer(false);};

  // /?reset_token=... → show reset form
  if (resetToken) {
    return (<><style>{CSS}</style><ResetPasswordScreen token={resetToken} onDone={()=>{
      // Clear ?reset_token from URL and re-fetch user (resetPassword auto-signs us in)
      window.history.replaceState({}, "", "/");
      (api as any).auth.me.query().then((u:User|null)=>setUser(u)).catch(()=>setUser(null));
    }}/></>);
  }

  if(user===undefined)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:14,background:"var(--bg)"}}>
      <style>{CSS}</style>
      <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:26,fontWeight:700,color:"var(--ink)"}}>拼<span style={{color:"var(--sage)"}}>朋友</span></div>
      <div className="sp"/>
    </div>
  );

  if(!user)return(<><style>{CSS}</style><AuthScreen onAuth={u=>setUser(u)}/></>);
  if(!fam)return(<><style>{CSS}</style><FamSelect user={user} onSel={f=>setFam(f)}/></>);

  const renderPage=()=>{
    if(dld&&["home","children","tasks"].includes(page))return <Spin/>;
    switch(page){
      case"home":return <Dashboard fam={fam} kids={kids} tasks={tasks} onNav={nav}/>;
      case"children":return <Children fam={fam} kids={kids} onRefresh={()=>loadData(fam)}/>;
      case"manual":return <Manual kids={kids}/>;
      case"tasks":return <Tasks fam={fam} tasks={tasks} onRefresh={()=>loadData(fam)}/>;
      case"market":return <Market/>;
      case"connections":return <Connections/>;
      case"members":return <Members fam={fam}/>;
      case"profile":return <Profile user={user} fam={fam} theme={theme} setTheme={setTheme} onLogout={logout} onSwitch={switchFam} onNav={nav}/>;
      default:return <Dashboard fam={fam} kids={kids} tasks={tasks} onNav={nav}/>;
    }
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="app">
        <aside className="sb"><SB fam={fam} user={user} page={page} theme={theme} setTheme={setTheme} onNav={nav} onSwitch={switchFam}/></aside>
        <div className="main">
          <header className="topbar">
            <button className="ham" onClick={()=>setDrawer(true)} aria-label="打开菜单">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div style={{fontFamily:"var(--ff-s)",fontSize:15,fontWeight:600,color:"var(--ink)"}} className="tb-title">{PTITLES[page]||""}</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div onClick={()=>nav("profile")} style={{cursor:"pointer"}}><Av name={user.name} email={user.email} oid={user.openId} sz="sm"/></div>
            </div>
          </header>
          <div className="page-body"><div className="pi">{renderPage()}</div></div>
        </div>
        <nav className="mob-nav"><div className="mob-items">{MTABS.map(t=><button key={t.id} className={`mb ${page===t.id?"on":""}`} onClick={()=>nav(t.id)}><span className="mb-ic">{t.ic}</span><span className="mb-lb">{t.l}</span></button>)}</div></nav>
        <div className={`drw ${drawer?"open":""}`}>
          <div className="drw-bg" onClick={()=>setDrawer(false)}/>
          <div className="drw-panel"><SB fam={fam} user={user} page={page} theme={theme} setTheme={setTheme} onNav={nav} onSwitch={switchFam}/></div>
        </div>
      </div>
    </>
  );
}

export default function App(){
  return (
    <AppErrorBoundary>
      <AppInner/>
    </AppErrorBoundary>
  );
}
