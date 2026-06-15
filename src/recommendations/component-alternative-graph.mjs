function activeAt(edge, at) {
  const timestamp = new Date(at).getTime();
  const starts = new Date(edge.valid_from).getTime();
  const ends = edge.valid_until ? new Date(edge.valid_until).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(timestamp) && timestamp >= starts && timestamp <= ends;
}

function indexedComponents(components = []) {
  return new Map(components.map((component) => [component.id, component]));
}

function isStrictReviewed(component) {
  return (
    component?.intelligence_state === "strict_reviewed"
    && component?.publication_gate?.strict_pass === true
  );
}

export function findComponentAlternatives({
  componentId,
  graph = {},
  components = [],
  at = new Date().toISOString(),
  includePeers = false
}) {
  if (!componentId) return [];
  const policy = graph.policy || {};
  const allowedRelationships = new Set(policy.agent_facing_relationships || []);
  const minimumConfidence = Number(policy.minimum_confidence ?? 1);
  const minimumSafetyDelta = Number(policy.minimum_safety_delta ?? 0);
  const componentIndex = indexedComponents(components);
  const source = componentIndex.get(componentId);

  return (graph.edges || [])
    .filter((edge) => edge.source_component_id === componentId)
    .filter((edge) => edge.status === "active" && activeAt(edge, at))
    .filter((edge) => includePeers || allowedRelationships.has(edge.relationship_type))
    .filter((edge) => includePeers || edge.confidence >= minimumConfidence)
    .filter((edge) => includePeers || edge.safety_delta >= minimumSafetyDelta)
    .map((edge) => {
      const target = componentIndex.get(edge.target_component_id);
      return { edge, source, target };
    })
    .filter(({ source: sourceComponent, target }) =>
      isStrictReviewed(sourceComponent)
      && isStrictReviewed(target)
      && sourceComponent.type === target.type
    )
    .sort((left, right) =>
      right.edge.safety_delta - left.edge.safety_delta
      || right.edge.confidence - left.edge.confidence
      || Number(right.target.trust_score || 0) - Number(left.target.trust_score || 0)
    )
    .map(({ edge, target }) => ({
      id: edge.id,
      component_id: target.id,
      name: target.name,
      component_type: target.type,
      relationship_type: edge.relationship_type,
      confidence: edge.confidence,
      safety_delta: edge.safety_delta,
      trust_score: target.trust_score,
      decision: target.decision,
      reason: edge.reason,
      shared_capabilities: edge.shared_capabilities,
      unsupported_source_capabilities: edge.unsupported_source_capabilities,
      conditions: edge.conditions,
      migration: edge.migration,
      evidence: edge.evidence,
      valid_from: edge.valid_from,
      valid_until: edge.valid_until
    }));
}

export function alternativeCoverageFor({ componentId, graph = {}, alternatives = [] }) {
  const gap = (graph.coverage_gaps || []).find((item) => item.component_id === componentId);
  if (alternatives.length) {
    return {
      status: alternatives.some((item) => item.relationship_type === "verified_alternative")
        ? "verified"
        : "conditional",
      reviewed_alternative_count: alternatives.length,
      reason: null,
      graph_version: graph.version || null
    };
  }
  return {
    status: "gap",
    reviewed_alternative_count: 0,
    reason: gap?.reason || "No evidence-backed safer functional alternative is currently available.",
    target_research_queries: gap?.target_research_queries || [],
    graph_version: graph.version || null
  };
}
