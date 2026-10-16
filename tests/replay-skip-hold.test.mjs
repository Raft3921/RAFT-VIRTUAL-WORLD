import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplaySkipHold} from '../dist/replay-skip-hold.js';
test('skip requires one continuous two-second hold and can only be consumed once',()=>{const h=new ReplaySkipHold();h.begin(1,100,'a');assert(!h.consume(2099,'a'));assert(h.consume(2100,'a'));assert(!h.consume(2200,'a'));});
test('release/cancel resets progress and several short clicks do not accumulate',()=>{const h=new ReplaySkipHold();for(let i=0;i<10;i++){h.begin(1,i*2000,'a');assert(!h.consume(i*2000+1900,'a'));h.cancel(1);}assert.equal(h.progress(30000,'a'),0);});
test('second fingers cannot start over or release the primary hold; new replays need a new press',()=>{const h=new ReplaySkipHold();h.begin(1,0,'a');h.begin(2,300,'a');h.cancel(2);assert.equal(h.progress(1000,'a'),.5);assert(!h.consume(3000,'b'));h.cancel();h.begin(3,3000,'b');assert(!h.consume(4999,'b'));assert(h.consume(5000,'b'));});
