import ARView from './components/ARView';

/**
 * Vysta AR demo: Pokémon-Go-style back-camera view with a transparent centre
 * crosshair, four Crossy-Road-style guide modes at the top, tap-to-focus space
 * recognition with grey/white ripples, a corner compass and a mini map.
 */
export default function App() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b1020',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <ARView />
    </div>
  );
}
