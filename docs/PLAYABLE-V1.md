# First playable: Earth orbit and docking

Original game concept by Mykyta, relayed by Andrii. Existing project identity: Kineti Core.

## Player loop

1. Assemble a two-stage rocket from selectable core, upper stage, command capsule and service module. Mass, ideal delta-v and liftoff thrust-to-weight update immediately. Module specifications are plausible fictional designs, not NASA-certified vehicles.
2. Launch from an LC-39-inspired Florida site. Guidance is optional and controls an actual thrust direction; the flight is integrated from forces, not a progress timer. Throttle, pitch trim and explicit stage separation remain under player control.
3. Reach an actual bound orbit with a sufficiently high periapsis. An orbital result screen explains the flight and offers the next scenario.
4. Enter a clearly labeled terminal-docking scenario near a station. The transition places the same spacecraft into a local training scenario; it does not claim to simulate phasing, transfer, plane alignment or the entire orbital rendezvous.
5. Translate and rotate manually using finite RCS propellant. Unpowered motion preserves inertia. Dock only within stated position, speed, orientation and angular-rate limits; unsafe contact produces a recoverable failure.
6. Pause, restore a versioned checkpoint, change the design or try again.

## Acceptance

- Every visible control performs the stated action, supports keyboard focus and has an accessible label.
- Selection changes the vehicle and computed performance. Incompatible/underpowered configurations explain why launch is unavailable.
- Separation discards real mass, cannot accidentally repeat on key auto-repeat, and can sacrifice remaining propellant if chosen early.
- Fixed-step integration is independent of display refresh rate. Pausing or losing focus releases all input and stops the simulation.
- The default guided design can reach orbit with manual staging. A complete deterministic ascent is tested independently of rendering.
- Docking is manual six-DOF flight with meaningful failure criteria and finite fuel. No automatic forward progress or vacuum drag.
- Saved data is versioned and validated before restoring. Corrupt or unavailable storage does not prevent a new flight.
- The game runs from the built static dist directory, including in Safari, with no runtime external assets or services.
- NASA references, model assumptions, synthetic design data and AI assistance are disclosed. NASA endorsement is not implied.

## Presentation

The playable interface is in English for Space Apps compatibility. Desktop keyboard is the primary control scheme; narrow screens receive visible touch controls. First version does not promise flight certification, full Solar System simulation or a full rigid-body structural failure model.
