// Reads the real status flag the UNMASK extension's MAIN-world content
// script (inject.js) sets on window when it is actually running on this
// page. There is no other way for a web page to detect an installed Chrome
// extension, so absence of this flag genuinely means "not connected" - it is
// never assumed true.
import { useEffect, useState } from "react";

declare global {
  interface Window {
    __unmaskStatus?: {
      injected: boolean;
      dataXRayActive: boolean;
      firewallActive: boolean;
    };
  }
}

export interface ExtensionStatus {
  extensionConnected: boolean;
  dataXRayActive: boolean;
  firewallActive: boolean;
  // Trust Gate has not been implemented yet - always reported honestly as
  // inactive rather than faked.
  trustGateActive: boolean;
}

const NOT_CONNECTED: ExtensionStatus = {
  extensionConnected: false,
  dataXRayActive: false,
  firewallActive: false,
  trustGateActive: false,
};

function readStatus(): ExtensionStatus {
  const s = window.__unmaskStatus;
  if (!s || !s.injected) return NOT_CONNECTED;
  return {
    extensionConnected: true,
    dataXRayActive: !!s.dataXRayActive,
    firewallActive: !!s.firewallActive,
    trustGateActive: false,
  };
}

export function useExtensionStatus(): ExtensionStatus {
  const [status, setStatus] = useState<ExtensionStatus>(readStatus);

  useEffect(() => {
    // The content script injects asynchronously at document_start, so poll
    // briefly on mount rather than assuming it has already run.
    const id = window.setInterval(() => setStatus(readStatus()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return status;
}
