import { useEffect, useRef } from 'react';

const UnicornBackground = ({ projectId, dpi = 1.5, scale = 1 }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    let destroyed = false;

    const loadAndInit = () => {
      if (!containerRef.current || destroyed) return;

      // Check if the script is already loaded
      if (window.UnicornStudio) {
        initScene();
        return;
      }

      const script = document.createElement('script');
      script.src = '/unicornStudio.umd.js';
      script.onload = () => {
        if (!destroyed) initScene();
      };
      document.head.appendChild(script);
    };

    const initScene = () => {
      if (!window.UnicornStudio || !containerRef.current || destroyed) return;

      // Set the required data attributes
      containerRef.current.setAttribute('data-us-project', projectId);
      if (dpi) containerRef.current.setAttribute('data-us-dpi', String(dpi));
      if (scale) containerRef.current.setAttribute('data-us-scale', String(scale));

      window.UnicornStudio.addScene({
        element: containerRef.current,
        projectId: projectId,
        dpi: dpi,
        scale: scale,
        fps: 60,
        production: true,
      }).then((scene) => {
        if (!destroyed) {
          sceneRef.current = scene;
        } else if (scene && scene.destroy) {
          scene.destroy();
        }
      }).catch(() => {});
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
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default UnicornBackground;
