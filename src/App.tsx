import { useState, useEffect } from "react";
import { AggregatorHome } from "./components/AggregatorHome";
import { EmbedView } from "./components/EmbedView";
import { ApiDocumentation } from "./components/ApiDocumentation";

function getEmbedIdFromUrl(): string | null {
  const path = window.location.pathname;
  // Match /embed/(ID)
  const embedMatch = path.match(/^\/embed\/([^/?#]+)/i);
  if (embedMatch && embedMatch[1]) {
    return decodeURIComponent(embedMatch[1]);
  }

  // Also fallback to query param ?id=... or ?embed=...
  const params = new URLSearchParams(window.location.search);
  const qId = params.get("id") || params.get("embed");
  if (qId) {
    return qId;
  }

  return null;
}

function isDocsUrl(): boolean {
  const path = window.location.pathname.toLowerCase();
  if (
    path === "/docs" ||
    path === "/api-docs" ||
    path === "/api/documentation" ||
    path === "/documentation"
  ) {
    return true;
  }
  const params = new URLSearchParams(window.location.search);
  return params.has("docs") || params.has("apidocs");
}

export default function App() {
  const [embedId, setEmbedId] = useState<string | null>(() => getEmbedIdFromUrl());
  const [showDocs, setShowDocs] = useState<boolean>(() => isDocsUrl());

  useEffect(() => {
    const handlePopState = () => {
      setEmbedId(getEmbedIdFromUrl());
      setShowDocs(isDocsUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelectEmbed = (id: string) => {
    setShowDocs(false);
    setEmbedId(id);
    const targetPath = `/embed/${encodeURIComponent(id)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
  };

  const handleNavigateHome = () => {
    setEmbedId(null);
    setShowDocs(false);
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  };

  const handleNavigateDocs = () => {
    setEmbedId(null);
    setShowDocs(true);
    if (window.location.pathname !== "/docs") {
      window.history.pushState({}, "", "/docs");
    }
  };

  if (embedId) {
    return <EmbedView id={embedId} onNavigateHome={handleNavigateHome} />;
  }

  if (showDocs) {
    return (
      <ApiDocumentation
        onNavigateHome={handleNavigateHome}
        onSelectEmbed={handleSelectEmbed}
      />
    );
  }

  return (
    <AggregatorHome
      onSelectEmbed={handleSelectEmbed}
      onNavigateDocs={handleNavigateDocs}
    />
  );
}
