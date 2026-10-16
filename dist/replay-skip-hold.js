export class ReplaySkipHold{
 constructor(){this.cancel();}
 begin(pointer,now,replay){if(this.pointer!==null)return;this.pointer=pointer;this.started=now;this.replay=replay;}
 cancel(pointer){if(pointer!==undefined&&pointer!==this.pointer)return;this.pointer=null;this.started=0;this.replay=null;}
 progress(now,replay){return this.pointer===null||this.replay!==replay?0:Math.max(0,Math.min(1,(now-this.started)/2000));}
 consume(now,replay){if(this.progress(now,replay)<1)return false;this.cancel();return true;}
}
