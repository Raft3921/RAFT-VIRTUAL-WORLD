export const characterIndex=value=>Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<8?Number(value):null;
export function cleanCharacter(value={}){
  const score=Number(value?.score),checkpoint=Number(value?.checkpoint),appearance=Number(value?.appearanceLevel),safeScore=Number.isFinite(score)?Math.max(-10000,Math.min(10000,Math.trunc(score))):0;
  const count=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(1000000,Math.trunc(Number(value)))):0;
  // A deeply negative score must not hide recovery for dozens of later wins.
  // Appearance bottoms out at fully bald (-8), independently of net score.
  return {score:safeScore,wins:count(value?.wins),losses:count(value?.losses),appearanceLevel:Number.isFinite(appearance)?Math.max(-8,Math.min(10000,Math.trunc(appearance))):Math.max(-8,safeScore),crownEnabled:value?.crownEnabled===true,checkpoint:Number.isInteger(checkpoint)?Math.max(1,Math.min(100,checkpoint)):1};
}

// Named skins, not browser identities, own appearance and course progress.
// The old profile score file remains intact as a migration source.
export class CharacterStore{
  constructor(data,legacyScores,save,onChange,onError){
    this.data={version:1,characters:{},migratedProfiles:{...(data?.migratedProfiles||{})}};
    for(let skin=0;skin<8;skin++)if(data?.characters?.[skin])this.data.characters[skin]=cleanCharacter(data.characters[skin]);
    this.legacyScores=legacyScores||{};this.save=save;this.onChange=onChange;this.onError=onError;this.pending=Promise.resolve();
  }
  get(skin,profile,initialEnabled=false){
    if(characterIndex(skin)===null)return cleanCharacter();
    if(!this.data.characters[skin]){
      let score=0;
      if(profile&&!Object.hasOwn(this.data.migratedProfiles,profile)&&Object.hasOwn(this.legacyScores,profile)){
        score=this.legacyScores[profile];this.data.migratedProfiles[profile]=skin;
      }
      this.data.characters[skin]=cleanCharacter({score,crownEnabled:initialEnabled,checkpoint:1});this.persist();
    }
    return {...this.data.characters[skin]};
  }
  snapshots(){const result={};for(let skin=0;skin<8;skin++)result[skin]=cleanCharacter(this.data.characters[skin]);return result;}
  change(skin,patch,persist=true){
    if(characterIndex(skin)===null)return this.pending;
    const previous=this.get(skin),next=cleanCharacter({...previous,...patch});
    if(next.score===previous.score&&next.wins===previous.wins&&next.losses===previous.losses&&next.appearanceLevel===previous.appearanceLevel&&next.crownEnabled===previous.crownEnabled&&next.checkpoint===previous.checkpoint)return this.pending;
    this.data.characters[skin]=next;this.onChange(skin,{...next});return persist?this.persist():this.pending;
  }
  checkpoint(skin,id){const next=Number(id);if(!Number.isInteger(next)||next<1||next>100)return this.pending;return this.change(skin,{checkpoint:Math.max(this.get(skin).checkpoint,next)});}
  result(winner,loser){
    // Guests never own persistent records, but the member's result counts.
    // Two sessions of the same character remain a non-scoring practice duel.
    if(winner===loser)return this.pending;
    const deltas=new Map();if(characterIndex(winner)!==null)deltas.set(winner,1);if(characterIndex(loser)!==null)deltas.set(loser,-1);
    if(!deltas.size)return this.pending;
    for(const [skin,delta]of deltas){const previous=this.get(skin);this.change(skin,{score:previous.score+delta,wins:previous.wins+(delta>0?1:0),losses:previous.losses+(delta<0?1:0),appearanceLevel:Math.max(-8,previous.appearanceLevel+delta)},false);}
    return this.persist();
  }
  persist(){
    const snapshot=JSON.parse(JSON.stringify(this.data));
    this.pending=this.pending.then(async()=>{try{await this.save(snapshot);}catch{this.onError();}});return this.pending;
  }
}
