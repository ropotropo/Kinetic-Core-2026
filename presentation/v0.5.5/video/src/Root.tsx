import {AbsoluteFill, Composition, Track, staticFile} from 'remotion';
import {Closing, Opening, Shot, Soundtrack, type TeaserProps} from './Teaser';

export function Teaser(props:TeaserProps) {
  return <AbsoluteFill style={{backgroundColor:'#000', color:'#f5f5f7', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif'}}>
    <Soundtrack {...props}/>
    <Track name="Frozen v0.5.5 picture edit">
      <Opening name="01 Opening" from={0} durationInFrames={60}/>
      <Shot name="02 Moon home" from={60} durationInFrames={75} source={staticFile("footage/home.mp4")}  sourceIn={0} ready={true} title="Begin a Moon expedition" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="03 World selector" from={135} durationInFrames={75} source={staticFile("footage/worlds.mp4")}  sourceIn={15} ready={true} title="Worlds & local practice" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="04 Workshop context" from={210} durationInFrames={75} source={staticFile("footage/workshop.mp4")}  sourceIn={0} ready={true} title="Build the vehicle" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="05 Component detail" from={285} durationInFrames={45} source={staticFile("footage/workshop.mp4")}  sourceIn={75} ready={true} title="Inspect the hardware" detail="" zoom={1.12} focusX={0.68} focusY={0.48}/>
      <Shot name="06 Dimensions" from={330} durationInFrames={60} source={staticFile("footage/workshop.mp4")}  sourceIn={120} ready={true} title="Change the design" detail="Real mass and fuel budgets" zoom={1.18} focusX={0.94} focusY={0.72}/>
      <Shot name="07 Rollout context" from={390} durationInFrames={75} source={staticFile("footage/rollout.mp4")}  sourceIn={0} ready={true} title="Roll to the pad" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="08 Pad detail" from={465} durationInFrames={45} source={staticFile("footage/rollout.mp4")}  sourceIn={75} ready={true} title="Ready for flight" detail="" zoom={1.12} focusX={0.5} focusY={0.52}/>
      <Shot name="09 Liftoff" from={510} durationInFrames={90} source={staticFile("footage/ascent.mp4")}  sourceIn={0} ready={true} title="Launch from Earth" detail="Actual powered ascent" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="10 Trail and sunlight" from={600} durationInFrames={60} source={staticFile("footage/ascent.mp4")}  sourceIn={90} ready={true} title="Every force matters" detail="" zoom={1.1} focusX={0.4} focusY={0.5}/>
      <Shot name="11 Flight instruments" from={660} durationInFrames={60} source={staticFile("footage/ascent.mp4")}  sourceIn={150} ready={true} title="Read the flight" detail="Finite fuel. Changing mass." zoom={1.16} focusX={0.83} focusY={0.74}/>
      <Shot name="12 Stage aft beat" from={720} durationInFrames={90} source={staticFile("footage/stage-release.mp4")}  sourceIn={0} ready={true} title="Release the stage" detail="Actual manual separation" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="13 Departing stage" from={810} durationInFrames={60} source={staticFile("footage/stage-release.mp4")}  sourceIn={90} ready={true} title="Leave the mass behind" detail="" zoom={1.08} focusX={0.5} focusY={0.5}/>
      <Shot name="14 Chase recovery" from={870} durationInFrames={60} source={staticFile("footage/stage-release.mp4")}  sourceIn={150} ready={true} title="Keep the mission moving" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="15 Separate docking" from={930} durationInFrames={75} source={staticFile("footage/docking.mp4")}  sourceIn={30} ready={true} title="Take control" detail="Separate docking exercise" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="16 Cockpit RCS" from={1005} durationInFrames={75} source={staticFile("footage/cockpit.mp4")}  sourceIn={60} ready={true} title="Align. Then close." detail="Manual RCS corrections" zoom={1.1} focusX={0.56} focusY={0.58}/>
      <Shot name="17 Moon descent context" from={1080} durationInFrames={75} source={staticFile("footage/moon-descent.mp4")}  sourceIn={0} ready={true} title="Continue the Moon expedition" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="18 Descent plume" from={1155} durationInFrames={75} source={staticFile("footage/moon-descent.mp4")}  sourceIn={75} ready={true} title="Brake. Descend." detail="Thrust uses propellant" zoom={1.1} focusX={0.5} focusY={0.58}/>
      <Shot name="19 Critical approach" from={1230} durationInFrames={90} source={staticFile("footage/moon-descent.mp4")}  sourceIn={150} ready={true} title="Make the approach count" detail="Altitude. Speed. Drift." zoom={1.1} focusX={0.25} focusY={0.75}/>
      <Shot name="20 Touchdown result" from={1320} durationInFrames={120} source={staticFile("footage/moon-contact.mp4")}  sourceIn={150} ready={true} title="Touch down" detail="" zoom={1} focusX={0.5} focusY={0.5}/>
      <Shot name="21 KC ceremony" from={1440} durationInFrames={150} source={staticFile("footage/moon-flag.mp4")}  sourceIn={150} ready={true} title="A landing earned" detail="Post-contact KC ceremony" zoom={1} focusX={0.5} focusY={0.5}/>
      <Closing name="22 Closing" from={1590} durationInFrames={90}/>
    </Track>
  </AbsoluteFill>;
}

export const RemotionRoot=()=> <Composition id="KineticCoreTeaser055" component={Teaser} width={1920} height={1080} fps={30} durationInFrames={1680} defaultProps={{voiceEnabled:true,musicEnabled:true,voiceVolume:1,musicVolume:1}}/>;
