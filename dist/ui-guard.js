// Keep long holds as game/UI gestures, not browser text/copy/drag gestures.
// Delegation also covers furniture cards and controls created after startup.
(() => {
  let composing=false;
  const cancel=event=>{if(event.cancelable)event.preventDefault();};
  for(const type of ['contextmenu','selectstart','dragstart','copy','cut'])document.addEventListener(type,cancel,{capture:true,passive:false});
  document.addEventListener('compositionstart',()=>{composing=true;},true);
  document.addEventListener('compositionend',()=>{composing=false;clearSelection();},true);
  function clearSelection(){
    const selection=window.getSelection();if(selection&&!selection.isCollapsed)selection.removeAllRanges();
    // A text field still accepts typing/paste and a caret, but not a selected
    // range with mobile selection handles. Number/range controls have no range.
    const field=document.activeElement;
    if(!composing&&field?.matches('input,textarea')&&typeof field.selectionStart==='number'&&field.selectionStart!==field.selectionEnd){try{const end=field.selectionEnd;field.setSelectionRange(end,end);}catch{}}
  }
  document.addEventListener('selectionchange',clearSelection);
  document.addEventListener('pointerdown',clearSelection,{capture:true,passive:true});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='a')cancel(event);},true);
  clearSelection();
})();
