import {Composition} from 'remotion';
import {GameplayFilm} from './Composition';
export const RemotionRoot: React.FC=()=> <Composition id="KineticCoreGameplay" component={GameplayFilm} width={1920} height={1080} fps={30} durationInFrames={2640}/>;
