import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  open: 7000,
  properties: 7000,
  tenants: 7000,
  finance: 7000,
  close: 7000,
};

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  open: Scene1,
  properties: Scene2,
  tenants: Scene3,
  finance: Scene4,
  close: Scene5,
};

const bgPositions = [
  { x: '-20%', y: '-20%', scale: 1 },
  { x: '50%', y: '30%', scale: 1.2 },
  { x: '80%', y: '-10%', scale: 0.8 },
  { x: '10%', y: '60%', scale: 1.1 },
  { x: '-20%', y: '-20%', scale: 1 },
];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];
  const pos = bgPositions[sceneIndex] ?? bgPositions[0];

  return (
    <div className="w-full h-screen overflow-hidden relative bg-bg-dark">
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute w-[50vw] h-[50vw] rounded-full blur-[80px] opacity-20"
          style={{ background: 'var(--color-primary)' }}
          animate={{ x: pos.x, y: pos.y, scale: pos.scale }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
