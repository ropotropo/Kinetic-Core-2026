import { createVehicleConfig, resolveConfig } from './catalog.js';

// Presentation only: milestones and the next maneuver come from physical mission state.
// A local rehearsal never claims an Earth launch, transfer or lunar capture.
const PHASE_STEP = Object.freeze({
  rollout: 0, countdown: 0, launch: 0,
  orbit: 1, window: 1, departure: 1, coast: 1, 'lunar-approach': 1, 'lunar-coast': 1,
  capture: 2, 'lunar-orbit': 2,
  descent: 3, landing: 3, landed: 3,
});
const POWERED = new Set(['launch', 'departure', 'lunar-approach', 'capture', 'descent', 'landing']);
const COAST_WARP = Object.freeze({ window: 1000, coast: 50000, 'lunar-coast': 1000, 'lunar-orbit': 1000 });
const GOALS = Object.freeze({
  launch: ['Reach Earth orbit', 'Powered guidance steers. Stage release stays in your hands.'],
  departure: ['Burn toward the Moon', 'The engine spends propellant to raise the real transfer trajectory.'],
  'lunar-approach': ['Target lunar periapsis', 'Guidance steers the approach toward a safe capture altitude.'],
  capture: ['Brake into lunar orbit', 'The engine is slowing the spacecraft into a bound orbit.'],
  descent: ['Brake toward the landing site', 'Powered guidance spends fuel to cancel orbital motion.'],
  landing: ['Make a soft touchdown', 'Watch vertical speed and pad offset. Guidance obeys your engine ceiling.'],
});
export function getMissionJourney(mission, telemetry = {}, { guidance = true, power = 1, warp = 10, paused = false, lastPhase = null } = {}) {
  const phase = mission?.phase ?? 'rollout';
  const rehearsal = mission?.kind === 'custom-descent';
  const ended = phase === 'landed' || phase === 'failed';
  const activeStep = rehearsal ? 3 : PHASE_STEP[phase] ?? PHASE_STEP[lastPhase] ?? (mission?.primary === 'moon' || mission?.resources ? 1 : 0);
  const steps = ['Launch', 'Transfer', 'Orbit', 'Land'].map((label, index) => ({
    label,
    state: rehearsal && index < 3 ? 'skipped' : phase === 'landed' ? 'complete' : index < activeStep ? 'complete' : index === activeStep ? (phase === 'failed' ? 'failed' : 'current') : 'upcoming',
  }));
  const result = (title, detail, action = null, label = '', extra = {}) => ({ steps, activeStep, rehearsal, ended, title, detail, action, label, ...extra });
  if (phase === 'landed') return result(rehearsal ? 'Rehearsal complete' : 'Lunar touchdown confirmed', rehearsal ? 'Earth launch and transfer were skipped.' : 'Crew egress and the Kinetic Core flag ceremony follow.');
  if (phase === 'failed') return result('Review the flight', 'Restore the last valid checkpoint to try this maneuver again.', 'restore', 'Restore checkpoint');
  if (phase === 'rollout') return paused ? result('Rollout paused', 'Resume the ground sequence or skip it in flight tools.', 'resume', 'Resume rollout') : result('Roll out to the pad', 'The transporter carries your assembled spacecraft. Ignition follows.', 'skip-rollout', 'Skip rollout');
  if (phase === 'countdown') return paused ? result('Countdown paused', 'Resume to continue the ignition sequence.', 'resume', 'Resume countdown') : result('Ignition sequence', 'Five-second countdown. Flight director flies the first 100 metres.');
  if (phase === 'launch' && !mission.handedOver) return paused ? result('Ascent paused', 'The flight director hands over above 100 metres.', 'resume', 'Resume ascent') : result('Flight director has control', 'Actual thrust lifts the vehicle. Your controls unlock above 100 metres.');
  const stageIndex = telemetry.stageIndex ?? mission?.stageIndex ?? 2;
  if (!rehearsal && stageIndex < 2 && telemetry.stageReady && (telemetry.fuel === undefined || telemetry.fuel <= .001)) return result(stageIndex === 0 ? 'Booster propellant depleted' : 'Upper-stage propellant depleted', paused ? 'Flight is held for manual stage release. The next engine uses its own fuel.' : 'Release the depleted stage. The next engine uses its own fuel.', 'stage', stageIndex === 0 ? 'Separate booster' : 'Separate upper stage', { urgent: true });
  if (phase === 'orbit' && !mission.resources) return result('Release the attached core', 'Earth orbit is confirmed. Release the core before planning the transfer.', 'stage', 'Release core stage');
  if (phase === 'orbit') return result('Plan lunar departure', 'Use the moving Moon to calculate the next departure window.', 'depart', 'Plan departure');
  if (POWERED.has(phase) && telemetry.fuel <= .001) return result('Active engine is out of fuel', 'Restore a checkpoint and review the fuel budget.', 'restore', 'Restore checkpoint', { urgent: true });
  if (POWERED.has(phase) && power <= 0) return result('Engine ceiling is zero', 'Set a ceiling before continuing. Guidance cannot burn with the engine cut.', 'power', 'Set 100% ceiling');
  if (paused) return result('Continue the maneuver', 'All held flight inputs have been released.', 'resume', 'Resume flight');
  if (!guidance && ['lunar-coast', 'lunar-orbit'].includes(phase)) return result('Manual lunar flight', 'Engine and pitch are manual. Time stays at 1×; enable Guidance for an unpowered coast.');
  if (COAST_WARP[phase]) {
    const targetWarp = COAST_WARP[phase];
    const [goal, detail] = ({
      window: ['Coast to the departure window', 'Engines stay off until the Moon and spacecraft align.'],
      coast: ['Coast toward the Moon', 'No fuel is needed for this coast. Capture still requires a real braking burn.'],
      'lunar-coast': ['Coast to lunar capture', 'The targeted periapsis sets the next braking point.'],
      'lunar-orbit': ['Coast to the landing approach', 'Lunar orbit is confirmed. Descent begins near the selected site.'],
    })[phase];
    return result(goal, warp <= 1 ? `${detail} Use Time to accelerate this coast.` : detail, warp < targetWarp ? 'warp' : null, warp < targetWarp ? `Coast at ${targetWarp.toLocaleString('en-US')}×` : '', { targetWarp });
  }
  const [goal, detail] = GOALS[phase] ?? ['Follow the mission', 'Flight data and controls are available in the tools.'];
  if (!guidance && POWERED.has(phase)) return result(goal, 'Manual flight: use engine ceiling and held pitch controls. Guidance is optional.');
  return result(goal, detail);
}

// Use the resolved flight contract: evaluateDesign().parts deliberately omits cargo.
export function getRetainedSpacecraftBudget(design, gravity, configOptions = {}) {
  const parts = resolveConfig(createVehicleConfig(design, configOptions));
  const retainedMass = parts.capsule.dryMass + parts.cargo.dryMass + parts.service.dryMass + parts.service.propellant + parts.service.rcsFuel;
  return { retainedMass, surfaceTwr: parts.service.thrustVac / (retainedMass * gravity) };
}
