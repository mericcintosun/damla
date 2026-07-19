import { chromium } from "playwright";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
const RPC="https://rpc.monad.xyz";
const chain={id:143,name:"Monad",nativeCurrency:{name:"MON",symbol:"MON",decimals:18},rpcUrls:{default:{http:[RPC]}}};
const DEPLOYER="0x246c4a43f0d1b8ba43041c5e1892bf79c89b19e2e92a6e79264d6d02b9f0a2ae";
// 1) pre-fund a fresh demo wallet so the app skips the sponsor call
const demoKey=generatePrivateKey(); const demo=privateKeyToAccount(demoKey);
const w=createWalletClient({account:privateKeyToAccount(DEPLOYER),chain,transport:http(RPC)});
const fh=await w.sendTransaction({to:demo.address,value:parseEther("0.08")});
console.log("funded demo",demo.address,fh);
await new Promise(r=>setTimeout(r,4000));

const BASE="https://getdamla.vercel.app";
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:900,height:1180},deviceScaleFactor:1.5,recordVideo:{dir:process.env.VID,size:{width:900,height:1180}}});
// inject the funded demo key so send uses it directly (no sponsor)
await ctx.addInitScript((k)=>{ try{localStorage.setItem("damla_demo_sender",k);}catch(e){} }, demoKey);
const p=await ctx.newPage();
try{
  await p.goto(BASE+"/send",{waitUntil:"networkidle"}); await p.waitForTimeout(1500);
  await p.fill('input[inputmode="decimal"]',"0.01"); await p.waitForTimeout(400);
  await p.fill('input[placeholder="Happy birthday 🎂"]',"coffee on me"); await p.waitForTimeout(700);
  await p.locator('button:has-text("Create the link")').click();
  await p.waitForSelector('.linkbox input',{timeout:90000});
  const link=await p.inputValue('.linkbox input'); console.log("SEND_OK");
  await p.waitForTimeout(2500);
  await p.goto(link,{waitUntil:"networkidle"}); await p.waitForTimeout(2200);
  await p.locator('button:has-text("Claim")').first().click(); console.log("CLAIM_CLICKED");
  await p.waitForFunction(()=>document.body.innerText.includes("yours"),{timeout:90000});
  console.log("CLAIM_SUCCESS"); await p.waitForTimeout(3500);
}catch(e){console.log("ERR",e.message.split("\n")[0]);}
await ctx.close(); await b.close(); console.log("SAVED");
