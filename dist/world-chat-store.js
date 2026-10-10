import {playableSkin} from './player-types.js?v=20261010-free-cook71';
export const CHAT_LIMIT=400,CHAT_PAGE=100,CHAT_HISTORY_LIMIT=500;
export function cleanChatMessage(value){
  if(typeof value?.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(value.id)||typeof value.text!=='string'||!Number.isFinite(value.at))return null;
  const text=value.text.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,CHAT_LIMIT);if(!text)return null;
  return {id:value.id,skin:playableSkin(value.skin),text,at:value.at};
}
export class WorldChatStore{
  constructor(records=[],save=()=>{}){this.records=(Array.isArray(records)?records:[]).map(cleanChatMessage).filter(Boolean).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));this.records=this.records.slice(-CHAT_HISTORY_LIMIT);this.save=save;this.pending=Promise.resolve();}
  page(before=this.records.length){const end=Number.isInteger(before)?Math.min(this.records.length,Math.max(0,before)):this.records.length,start=Math.max(0,end-CHAT_PAGE);return {messages:this.records.slice(start,end),nextCursor:start>0?start:null,oldestId:this.records[0]?.id||null,oldestAt:this.records[0]?.at||null};}
  post(skin,text){
    const message=cleanChatMessage({id:Date.now().toString(36)+'-'+crypto.randomUUID(),skin,text,at:Date.now()});if(!message)return Promise.reject(new Error('メッセージを入力してください'));
    const job=this.pending.then(async()=>{const records=[...this.records,message].slice(-CHAT_HISTORY_LIMIT),removed=this.records.filter(old=>!records.some(next=>next.id===old.id));await this.save(message,removed,records);this.records=records;return message;});this.pending=job.catch(()=>{});return job;
  }
}
