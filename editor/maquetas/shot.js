const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
for(const v of ['ed_hook','ed_pair','bd_hook','bd_pair']){await p.goto('file://'+process.argv[2]+'/mk.html?v='+v);await p.waitForTimeout(400);await p.screenshot({path:process.argv[2]+'/'+v+'.png'});}
await b.close();})();
