// Standard MIDI Files (formats 0/1) with a small Web Audio retro synthesizer.
// References: https://midi.org/standard-midi-files
// https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode
function parseMidi(buffer) {
  const data=new Uint8Array(buffer),view=new DataView(buffer);let p=0;
  const need=n=>{if(p+n>data.length)throw new Error('Arquivo MIDI incompleto.');};
  const byte=()=>{need(1);return data[p++];};
  const word=()=>{need(2);const n=view.getUint16(p);p+=2;return n;};
  const long=()=>{need(4);const n=view.getUint32(p);p+=4;return n;};
  const tag=()=>String.fromCharCode(byte(),byte(),byte(),byte());
  const variable=()=>{let n=0;for(let i=0;i<4;i++){const b=byte();n=n*128+(b&127);if(!(b&128))return n;}throw new Error('Tempo MIDI inválido.');};
  if(tag()!=='MThd')throw new Error('Selecione um arquivo .mid ou .midi.');
  const header=long(),headerStart=p;need(header);if(header<6)throw new Error('Cabeçalho MIDI inválido.');
  const format=word(),tracks=word(),division=word();p=headerStart+header;
  if(format>1||!division||(division&0x8000))throw new Error('Use um MIDI padrão de formato 0 ou 1, com tempo musical.');
  const events=[];let lastTick=0;
  for(let track=0;track<tracks;track++){
    if(tag()!=='MTrk')throw new Error('Trilha MIDI inválida.');const length=long();need(length);const end=p+length;
    let tick=0,running=0;
    while(p<end){
      tick+=variable();lastTick=Math.max(lastTick,tick);let status=byte();
      if(status<128){if(!running)throw new Error('Evento MIDI inválido.');p--;status=running;}
      else if(status<240)running=status;
      if(status===255){
        const type=byte(),length=variable();need(length);
        if(type===81&&length===3)events.push({tick,type:'tempo',value:data[p]*65536+data[p+1]*256+data[p+2]});
        p+=length;if(type===47){p=end;break;}
      }else if(status===240||status===247){const length=variable();need(length);p+=length;running=0;}
      else if(status>=128&&status<240){
        const kind=status>>4,channel=status&15,a=byte(),b=(kind===12||kind===13)?0:byte();
        if(kind===8||kind===9)events.push({tick,type:kind===9&&b?'on':'off',channel,note:a,velocity:b});
        else if(kind===11&&a===64)events.push({tick,type:'sustain',channel,value:b>=64});
      }else throw new Error('Evento MIDI não suportado.');
      if(p>end)throw new Error('Trilha MIDI incompleta.');
    }
  }
  events.sort((a,b)=>a.tick-b.tick);const notes=[],active=new Map(),pedals=new Set(),held=new Map();
  let seconds=0,tick=0,tempo=500000;
  const finish=(note,time)=>notes.push({...note,duration:Math.max(.035,time-note.start)});
  for(const event of events){
    seconds+=(event.tick-tick)*tempo/division/1e6;tick=event.tick;
    if(event.type==='tempo'){if(event.value>0)tempo=event.value;continue;}
    const key=`${event.channel}:${event.note}`;
    if(event.type==='on'){
      const queue=active.get(key)||[];queue.push({start:seconds,note:event.note,velocity:event.velocity/127,channel:event.channel});active.set(key,queue);
    }else if(event.type==='off'){
      const queue=active.get(key),note=queue?.shift();if(!note)continue;
      if(pedals.has(event.channel)){const pending=held.get(event.channel)||[];pending.push(note);held.set(event.channel,pending);}else finish(note,seconds);
    }else if(event.type==='sustain'){
      if(event.value)pedals.add(event.channel);else{pedals.delete(event.channel);for(const note of held.get(event.channel)||[])finish(note,seconds);held.delete(event.channel);}
    }
  }
  seconds+=(lastTick-tick)*tempo/division/1e6;
  for(const queue of active.values())for(const note of queue)finish(note,Math.max(seconds,note.start+.2));
  for(const queue of held.values())for(const note of queue)finish(note,Math.max(seconds,note.start+.2));
  if(!notes.length)throw new Error('O MIDI não contém notas.');
  notes.sort((a,b)=>a.start-b.start);
  return{notes,duration:Math.max(.1,seconds,...notes.map(n=>n.start+n.duration))};
}

class MidiBacking {
  constructor(){this.song=null;this.level=.02;this.muted=false;this.voices=new Set();this.timer=null;}
  load(buffer){const song=parseMidi(buffer);this.stop();this.song=song;return song;}
  setLevel(level){this.level=level;this.updateGain();}
  setMuted(muted){this.muted=muted;this.updateGain();}
  updateGain(){if(this.bus)this.bus.gain.setTargetAtTime(this.muted?0:this.level,this.context.currentTime,.04);}
  play(context,offset=0,end=Infinity){
    this.stop();if(!this.song)return;
    this.context=context;this.bus=context.createGain();this.bus.gain.value=this.muted?0:this.level;this.bus.connect(context.destination);
    this.origin=context.currentTime-offset+.025;this.end=end;this.cycle=Math.floor(offset/this.song.duration);this.index=0;
    while(this.index<this.song.notes.length&&this.cycle*this.song.duration+this.song.notes[this.index].start<offset)this.index++;
    this.tick();this.timer=setInterval(()=>this.tick(),75);
  }
  tick(){
    const current=this.context.currentTime-this.origin;
    if(current>=this.end){this.stop();return;}
    for(let count=0;count<512;count++){
      if(this.index>=this.song.notes.length){this.index=0;this.cycle++;}
      const note=this.song.notes[this.index],at=this.cycle*this.song.duration+note.start;
      if(at>=this.end||at>current+.2)return;
      this.index++;if(at<current-.05)continue;
      const start=Math.max(this.context.currentTime+.005,this.origin+at),duration=Math.min(note.duration,this.end-at);
      this.voice(note,start,duration);
    }
  }
  voice(note,start,duration){
    const gain=this.context.createGain(),drum=note.channel===9;
    let source,filter,length;
    if(drum&&note.note>=38){
      // Separate snare noise from bright cymbals; never render both as bass tones.
      if(!this.noise||this.noise.sampleRate!==this.context.sampleRate){
        this.noise=this.context.createBuffer(1,this.context.sampleRate,this.context.sampleRate);
        const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      const cymbal=note.note>=42;length=cymbal?.36:.13;
      source=this.context.createBufferSource();source.buffer=this.noise;
      filter=this.context.createBiquadFilter();filter.type='highpass';filter.frequency.value=cymbal?5000:1400;
      source.connect(filter);filter.connect(gain);
    }else{
      source=this.context.createOscillator();source.type=drum?'sine':note.channel===0?'square':'triangle';
      source.frequency.setValueAtTime(drum?115:440*2**((note.note-69)/12),start);
      if(drum)source.frequency.exponentialRampToValueAtTime(43,start+.1);
      length=drum?.15:Math.max(.04,duration);source.connect(gain);
    }
    length=Math.min(length,duration);const end=start+length;
    const level=(drum?.3:note.channel===0?.055:.14)*note.velocity;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.006);
    gain.gain.setTargetAtTime(drum?level*.08:level*.6,start+.015,drum?.045:.08);
    gain.gain.setTargetAtTime(0,end,.025);gain.connect(this.bus);
    source.start(start);source.stop(end+.15);this.voices.add(source);
    source.onended=()=>{this.voices.delete(source);source.disconnect();filter?.disconnect();gain.disconnect();};
  }

  stop(){clearInterval(this.timer);this.timer=null;for(const osc of this.voices){try{osc.stop();}catch{}}this.voices.clear();if(this.bus){this.bus.disconnect();this.bus=null;}}
}
