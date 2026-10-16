import * as THREE from 'three';
import {sampleHit} from './hit-reaction.js?v=20261016-cinema106';
const probe=new THREE.Vector3();
// Shared by live avatars and the isolated cinematic duplicates.
export function applyAvatarHitPose(joints,state){
 const {pelvis,torso,head,shoulders,elbows,hips,knees}=joints;
 const pose=sampleHit({gunEliminated:state.gunEliminated,phase:['impact','air','down','recover'].includes(state.hitPhase)?state.hitPhase:'air',elapsed:state.hitTime||0,downTime:state.hitDownTime||0,recovery:state.hitRecovery||0,strength:state.hitStrength||.5}),w=pose.weight;
 pelvis.rotation.set(pose.tilt*w,0,pose.roll*w);pelvis.position.y=THREE.MathUtils.lerp(pelvis.position.y,pose.height,w);torso.rotation.set(0,0,0);head.rotation.set(0,0,0);
 const blend=(joint,x,y,z)=>{joint.rotation.x=THREE.MathUtils.lerp(joint.rotation.x,x,w);joint.rotation.y=THREE.MathUtils.lerp(joint.rotation.y,y,w);joint.rotation.z=THREE.MathUtils.lerp(joint.rotation.z,z,w);};
 for(const [side,index,sign]of [['right',0,-1],['left',1,1]]){blend(shoulders[side],pose.arms[index],0,sign*.35);blend(elbows[side],pose.elbows[index],0,0);blend(hips[side],pose.hips[index],0,sign*pose.spread);blend(knees[side],pose.knees[index],0,0);}
}
export function groundAvatarHitPose(root,pelvis,meshes){
 root.updateMatrixWorld(true);let lowest=Infinity;
 for(const mesh of meshes){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;for(let corner=0;corner<8;corner++){probe.set(corner&1?b.max.x:b.min.x,corner&2?b.max.y:b.min.y,corner&4?b.max.z:b.min.z).applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,probe.y);}}
 if(lowest<root.position.y+.015)pelvis.position.y+=root.position.y+.015-lowest;
}
