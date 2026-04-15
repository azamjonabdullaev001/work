import { useEffect, useRef, useState } from 'react';

const UnicornBackground = ({ projectId, dpi = 1.5, scale = 1 }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const initedRef = useRef(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let destroyed = false;

    const loadAndInit = () => {
      if (!containerRef.current || destroyed || initedRef.current) return;

      if (window.UnicornStudio) {
        initScene();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@2.1.9/dist/unicornStudio.umd.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (!destroyed && window.UnicornStudio) initScene();
        else if (!destroyed) setFallback(true);
      };
      script.onerror = () => {
        console.error('Failed to load UnicornStudio SDK');
        setFallback(true);
      };
      document.head.appendChild(script);
    };

    const initScene = () => {
      if (!window.UnicornStudio || !containerRef.current || destroyed || initedRef.current) return;
      initedRef.current = true;

      window.UnicornStudio.addScene({
        element: containerRef.current,
        projectId: projectId,
        dpi: dpi,
        scale: scale,
        fps: 60,
        production: true,
        interactivity: {
          mouse: {
            disableMobile: false,
            disabled: false,
          },
        },
      }).then((scene) => {
        if (!destroyed) {
          sceneRef.current = scene;
        } else if (scene && scene.destroy) {
          scene.destroy();
        }
      }).catch((err) => {
        console.error('UnicornStudio scene error:', err);
        initedRef.current = false;
        setFallback(true);
      });
    };

    loadAndInit();

    return () => {
      destroyed = true;
      if (sceneRef.current && sceneRef.current.destroy) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, [projectId, dpi, scale]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100vw', height: '100vh', display: fallback ? 'none' : 'block' }}
      />
      {fallback && <div className="animated-bg-fallback" />}
    </>
  );
};

export default UnicornBackground;
