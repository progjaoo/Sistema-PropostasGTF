import React from 'react';

import { ProposalPreview } from '@/components/proposal/ProposalPreview';

const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = 1123;

type ResponsiveProposalPreviewProps = {
  proposal: React.ComponentProps<typeof ProposalPreview>['proposal'];
  maxScale?: number;
};

export function ResponsiveProposalPreview({
  proposal,
  maxScale = 0.8,
}: ResponsiveProposalPreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(maxScale);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const availableWidth = container.clientWidth;
      const nextScale = Math.min(maxScale, availableWidth / A4_PREVIEW_WIDTH);
      setScale(Math.max(0.2, nextScale));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={containerRef} className="w-full max-w-[794px]">
      <div
        className="mx-auto origin-top-left transition-[width,height]"
        style={{
          width: `${A4_PREVIEW_WIDTH * scale}px`,
          height: `${A4_PREVIEW_HEIGHT * scale}px`,
        }}
      >
        <ProposalPreview proposal={proposal} scale={scale} />
      </div>
    </div>
  );
}

