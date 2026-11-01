(()=>{'use strict';
function start(){
 const cfg=window.JANIKS_SUPABASE_CONFIG||{},form=document.getElementById('contact-form'),btn=document.getElementById('contact-submit'),status=document.getElementById('contact-status');
 if(!form||!btn||!status)return;
 const ready=cfg.contactFormEnabled===true&&Boolean(cfg.turnstileSiteKey&&cfg.projectUrl&&cfg.publishableKey);
 if(!ready){status.textContent='Contact form configuration is incomplete. Please contact the store owner.';return;}
 btn.textContent='Send my message ♡';
 status.textContent='Loading security verification…';
 let widget=null,token='';
 const verify=()=>{
  if(!window.turnstile)return false;
  try{
   widget=window.turnstile.render('#contact-turnstile',{sitekey:cfg.turnstileSiteKey,callback:v=>{token=v;status.textContent='Security check complete. You can send your message.';},'expired-callback':()=>{token='';status.textContent='Please complete the security verification again.';},'error-callback':()=>{token='';status.textContent='Security verification failed. Refresh and try again.';}});
   btn.disabled=false;
   status.textContent='Complete the security verification, then send your message.';
   return true;
  }catch(err){status.textContent='Could not load security verification. Please refresh this page.';console.error('Turnstile initialization',err);return true;}
 };
 if(!verify()){
   let checks=0;
   const interval=setInterval(()=>{checks++;if(verify()||checks>=30){clearInterval(interval);if(checks>=30&&!window.turnstile)status.textContent='Security verification could not load. Disable content blockers for this site or try another browser.';}},200);
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!token){status.textContent='Please complete the security verification before sending.';return;}
  btn.disabled=true;status.textContent='Sending your message…';
  const data=Object.fromEntries(new FormData(form).entries());data.turnstileToken=token;
  try{
   const res=await fetch(cfg.projectUrl+'/functions/v1/contact-inquiry',{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.publishableKey},body:JSON.stringify(data)});
   const body=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(body.error||'Unable to send your message');
   form.reset();status.textContent='Thank you! Your message has been sent to Janiks Aniks. ♡';
  }catch(err){status.textContent='Message not sent: '+(err.message||String(err));}
  finally{token='';if(window.turnstile&&widget!==null)window.turnstile.reset(widget);btn.disabled=false;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();