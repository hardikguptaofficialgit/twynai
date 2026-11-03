import React from "react";
import { Composition } from "remotion";
import { TwynLaunchFilmV2 } from "./TwynLaunchFilmV2";
import { DURATION, FPS, HEIGHT, WIDTH } from "./tokens";

export const V2Composition: React.FC = () => <Composition id="TwynLaunchFilmV2" component={TwynLaunchFilmV2} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />;
