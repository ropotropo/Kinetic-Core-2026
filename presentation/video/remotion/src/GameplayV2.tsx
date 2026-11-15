import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Interactive,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio, Video} from '@remotion/media';

export type GameplayV2Props = {
  narration: string;
  music: string;
  narrationVolume: number;
  musicVolume: number;
};

const font = '-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';

type ShotProps = {
  source: string;
  trim: number;
  duration: number;
  title: string;
  detail?: string;
  zoom?: number;
  focusX?: number;
  focusY?: number;
};

function ShotLabel({title, detail, duration}: Pick<ShotProps, 'title' | 'detail' | 'duration'>) {
  const frame = useCurrentFrame();
  return (
    <div
      aria-label="Operational shot label"
      style={{
        position: 'absolute', left: 64, top: 1008, width: 1792, height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 24,
        margin: 0, padding: 0, overflow: 'visible', textAlign: 'left',
        opacity: interpolate(frame, [0, 5, duration - 4, duration], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        }),
      }}
    >
      <span style={{flexShrink: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-.025em', whiteSpace: 'nowrap'}}>{title}</span>
      {detail ? <span style={{fontSize: 21, color: '#b6b6bf', lineHeight: 1.2}}>{detail}</span> : null}
    </div>
  );
}

function OperationalShot({source, trim, duration, title, detail, zoom = 1, focusX = .5, focusY = .5}: ShotProps) {
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 1008, overflow: 'hidden'}}>
        <Video
          src={staticFile(source)}
          trimBefore={trim}
          playbackRate={1}
          muted
          style={{
            position: 'absolute', width: 1792, height: 1008, left: 64, top: 0,
            objectFit: 'contain', scale: zoom,
            transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
          }}
        />
      </div>
      <ShotLabel title={title} detail={detail} duration={duration}/>
    </AbsoluteFill>
  );
}

function OpeningV2() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <CanvasImage src={staticFile('hero.png')} style={{width: '100%', height: '100%', objectFit: 'cover', scale: interpolate(frame, [0, 3 * fps], [1, 1.015])}}/>
      <AbsoluteFill style={{background: 'linear-gradient(90deg,rgba(0,0,0,.48),transparent 66%)', justifyContent: 'center', padding: 96}}>
        <Interactive.Div name="Opening title" style={{fontSize: 136, lineHeight: .94, fontWeight: 650, letterSpacing: '-.045em', opacity: interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'}), translate: `0px ${interpolate(frame, [0, 10], [10, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)})}px`}}>
          Kinetic<br/>Core
        </Interactive.Div>
        <div style={{fontSize: 30, marginTop: 34}}>Created by Mykyta Borisov</div>
        <div style={{fontSize: 24, color: '#b8b8c0', marginTop: 18}}>NASA Space Apps Challenge 2026</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function ClosingV2() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#000', alignItems: 'center', justifyContent: 'center'}}>
      <CanvasImage src={staticFile('logo.png')} style={{width: 230, height: 230, objectFit: 'contain'}}/>
      <div style={{fontSize: 84, fontWeight: 600, letterSpacing: '-.04em', marginTop: 24}}>Kinetic Core</div>
      <div style={{fontSize: 30, color: '#d0d0d7', marginTop: 24}}>Created by Mykyta Borisov</div>
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [3 * fps - 10, 3 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}/>
    </AbsoluteFill>
  );
}

export function GameplayFilmV2({narration, music, narrationVolume, musicVolume}: GameplayV2Props) {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{fontFamily: font, color: '#f5f5f7', background: '#000'}}>
      <Audio src={staticFile(narration)} from={.5 * fps} volume={narrationVolume}/>
      <Audio src={staticFile(music)} volume={(frame) => musicVolume * interpolate(frame, [0, .35 * fps, .65 * fps, 79.3 * fps, 80 * fps, 81.3 * fps, 82 * fps], [0, .24, .2, .2, .55, .55, 0], {extrapolateRight: 'clamp'})}/>

      <Sequence name="01 Opening / Kinetic Core" from={0} durationInFrames={90}><OpeningV2/></Sequence>
      <Sequence name="02 Mission laboratory / actual interface" from={90} durationInFrames={134}><OperationalShot source="footage-v2/solar-system.mp4" trim={0} duration={134} title="Your mission laboratory" detail="Created by Mykyta Borisov"/></Sequence>
      <Sequence name="03 Solar System / voice matched" from={224} durationInFrames={73}><OperationalShot source="footage-v2/solar-system.mp4" trim={134} duration={73} title="Explore the Solar System" zoom={1.15} focusY={.53}/></Sequence>
      <Sequence name="04 World selection / controls" from={297} durationInFrames={126}><OperationalShot source="footage-v2/destinations.mp4" trim={.7 * fps} duration={126} title="Compare worlds" detail="Choose a destination" zoom={1.15} focusY={.55}/></Sequence>
      <Sequence name="05 Workshop / full context" from={423} durationInFrames={74}><OperationalShot source="footage-v2/builder.mp4" trim={0} duration={74} title="Build the spacecraft" detail="A shared vehicle model"/></Sequence>
      <Sequence name="06 Compatible components / detail" from={497} durationInFrames={113}><OperationalShot source="footage-v2/builder.mp4" trim={74} duration={113} title="Inspect a component" zoom={1.18} focusX={.3} focusY={.48}/></Sequence>
      <Sequence name="07 Parameters / engineering closeup" from={610} durationInFrames={108}><OperationalShot source="footage-v2/builder.mp4" trim={187} duration={108} title="Change the design" detail="Mass, thrust and fuel" zoom={1.28} focusX={.94} focusY={.72}/></Sequence>
      <Sequence name="08 Planner / shared flight model" from={718} durationInFrames={89}><OperationalShot source="footage-v2/planner.mp4" trim={0} duration={89} title="Plan the mission" detail="One shared model"/></Sequence>
      <Sequence name="09 Liftoff / full context" from={807} durationInFrames={154}><OperationalShot source="footage-v2/liftoff.mp4" trim={0} duration={154} title="Launch from Earth" detail="Powered guidance"/></Sequence>
      <Sequence name="10 Powered ascent / actual instruments" from={961} durationInFrames={146}><OperationalShot source="footage-v2/liftoff.mp4" trim={154} duration={146} title="Follow the instruments" detail="Powered ascent: gravity, propellant and mass" zoom={1.24} focusX={.96} focusY={.55}/></Sequence>
      <Sequence name="11 Moon rehearsal / full context" from={1107} durationInFrames={116}><OperationalShot source="footage-v2/landing.mp4" trim={0} duration={116} title="Practice the final approach" detail="Local Moon rehearsal. Powered assist. 1.2× edit."/></Sequence>
      <Sequence name="12 Descent instruments / closeup" from={1223} durationInFrames={133}><OperationalShot source="footage-v2/landing.mp4" trim={116} duration={133} title="Read the descent" detail="Altitude, speed and drift. 1.2× edit." zoom={1.25} focusX={.95} focusY={.55}/></Sequence>
      <Sequence name="13 Powered assist / fuel detail" from={1356} durationInFrames={111}><OperationalShot source="footage-v2/landing.mp4" trim={249} duration={111} title="Guidance still uses fuel" detail="Powered landing assistance. 1.2× edit." zoom={1.2} focusX={.94} focusY={.79}/></Sequence>
      <Sequence name="14 Docking / full context" from={1467} durationInFrames={107}><OperationalShot source="footage-v2/root-docking-external.mp4" trim={0} duration={107} title="Switch to docking" detail="Separate terminal exercise"/></Sequence>
      <Sequence name="15 Cockpit / live approach" from={1574} durationInFrames={103}><OperationalShot source="footage-v2/root-docking-cockpit.mp4" trim={0} duration={103} title="Change the view" detail="Read the actual approach"/></Sequence>
      <Sequence name="16 RCS / control detail" from={1677} durationInFrames={98}><OperationalShot source="footage-v2/root-docking-cockpit.mp4" trim={103} duration={98} title="Align and correct" detail="Finite RCS propellant" zoom={1.24} focusX={.64} focusY={.71}/></Sequence>
      <Sequence name="17 Contact / voice-matched result" from={1775} durationInFrames={204}><OperationalShot source="footage-v2/contact.mp4" trim={0} duration={204} title="Review the touchdown" detail="Genuine local rehearsal contact"/></Sequence>
      <Sequence name="18 Engineering / feature montage" from={1979} durationInFrames={123}><OperationalShot source="footage-v2/builder.mp4" trim={7.8 * fps} duration={123} title="Engineering choices" detail="Visible consequences"/></Sequence>
      <Sequence name="19 Exploration / feature montage" from={2102} durationInFrames={136}><OperationalShot source="footage-v2/solar-system.mp4" trim={3 * fps} duration={136} title="Explore and experiment" detail="For curious learners" zoom={1.2} focusY={.53}/></Sequence>
      <Sequence name="20 Design / narrated closing tag" from={2238} durationInFrames={69}><OperationalShot source="footage-v2/builder.mp4" trim={.4 * fps} duration={69} title="Design the spacecraft" zoom={1.15} focusX={.54} focusY={.51}/></Sequence>
      <Sequence name="21 Flight / narrated closing tag" from={2307} durationInFrames={63}><OperationalShot source="footage-v2/liftoff.mp4" trim={7.8 * fps} duration={63} title="Fly the critical moments" zoom={1.2} focusX={.52} focusY={.58}/></Sequence>
      <Sequence name="22 Closing / sole author" from={2370} durationInFrames={90}><ClosingV2/></Sequence>
    </AbsoluteFill>
  );
}
