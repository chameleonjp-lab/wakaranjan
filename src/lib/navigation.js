export function scrollAppToTop(){
  if(typeof window==='undefined')return;
  window.scrollTo({top:0,left:0,behavior:'auto'});
}
