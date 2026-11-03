import React from "react";
import { Composition } from "remotion";
import { registerRoot } from "remotion";
import { TwynLaunchFilm } from "./TwynLaunchFilm";
import { V2Composition } from "../v2/src/RootV2";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TwynLaunchFilm"
      component={TwynLaunchFilm}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ vertical: false }}
    />
    <Composition
      id="TwynLaunchFilmVertical"
      component={TwynLaunchFilm}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ vertical: true }}
    />
    <V2Composition />
  </>
);

export default RemotionRoot;

registerRoot(RemotionRoot);
