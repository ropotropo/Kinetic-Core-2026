import {Composition, Folder} from 'remotion';
import {GameplayFilm} from './Composition';
import {GameplayFilmV2} from './GameplayV2';
export const RemotionRoot: React.FC=()=> <>
  <Composition id="KineticCoreGameplayV2" component={GameplayFilmV2} width={1920} height={1080} fps={30} durationInFrames={2460} defaultProps={{narration:'audio-v2/voiceover-en.wav',music:'audio-v2/music.wav',narrationVolume:1,musicVolume:1}}/>
  <Folder name="Archive"><Composition id="KineticCoreGameplay" component={GameplayFilm} width={1920} height={1080} fps={30} durationInFrames={2640}/></Folder>
</>;
