export function rampHeight(body,z){const t=Math.max(0,Math.min(1,z/body.d+.5));return body.ramp.base+body.ramp.back+(body.ramp.front-body.ramp.back)*t;}
export function bounceSpeed(incoming,pump=false){return Math.min(12,Math.max(6.5,Math.abs(incoming)*.88+2.2+(pump?1.1:0)));}
export function springLaunch(x,y,charge,yaw){const amount=Math.min(2.5,Math.max(0,charge)),length=Math.hypot(x,y)||1,speed=3+amount*5;return {x:-(Math.cos(yaw)*x+Math.sin(yaw)*y)/length*speed,z:-(-Math.sin(yaw)*x+Math.cos(yaw)*y)/length*speed,y:5+amount*3.6};}
