import React from 'react';
import { useLocation } from 'wouter';

export default function ProposalNew() {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    setLocation('/proposals');
  }, [setLocation]);

  return (
    <div className="p-8 text-center text-muted-foreground">
      Redirecionando para Propostas...
    </div>
  );
}
