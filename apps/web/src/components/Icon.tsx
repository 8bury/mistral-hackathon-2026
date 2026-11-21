const PATHS = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3',
  replay: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  stop: 'M7 7h10v10H7z',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  gallery:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 11 4.5-4.5 3.5 3.5 2.5-2.5L20 17M8.5 9.5h.01',
  camera: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h2L9 4h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5ZM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  map: 'M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5M15 6.5V20',
  share: 'M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12',
  arrow: 'M12 3l6.5 17L12 16l-6.5 4L12 3Z',
};

export default function Icon({ name, size = 20 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
