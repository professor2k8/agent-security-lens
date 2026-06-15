function intersects(left = [], right = []) {
  return left.some((item) => right.includes(item));
}

function includesAll(left = [], right = []) {
  return right.every((item) => left.includes(item));
}

function appliesToFinding(recommendation, finding) {
  const appliesTo = recommendation.applies_to || {};

  if (appliesTo.rule_ids?.length && !appliesTo.rule_ids.includes(finding.rule_id)) {
    return false;
  }
  if (appliesTo.categories?.length && !appliesTo.categories.includes(finding.category)) {
    return false;
  }
  if (appliesTo.permissions_any?.length && !intersects(finding.permissions, appliesTo.permissions_any)) {
    return false;
  }
  if (appliesTo.permissions_all?.length && !includesAll(finding.permissions, appliesTo.permissions_all)) {
    return false;
  }
  if (appliesTo.profile_ids?.length && !intersects(finding.profile_ids, appliesTo.profile_ids)) {
    return false;
  }

  return true;
}

function publicRecommendation(recommendation) {
  return {
    id: recommendation.id,
    title: recommendation.title,
    type: recommendation.type,
    status: recommendation.status,
    source: recommendation.source,
    confidence: recommendation.confidence,
    rank: recommendation.rank,
    recommended_actions: recommendation.recommended_actions,
    recommended_alternatives: recommendation.recommended_alternatives,
    agent_instruction: recommendation.agent_instruction,
    one_step_commands: recommendation.one_step_commands || [],
    rollback_note: recommendation.rollback_note
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function applyRecommendations(findings, recommendationPacks) {
  const recommendations = recommendationPacks.flatMap((pack) => pack.recommendations || []);

  return findings.map((finding) => {
    const matched = recommendations
      .filter((recommendation) => appliesToFinding(recommendation, finding))
      .sort((left, right) => right.rank - left.rank || right.confidence - left.confidence)
      .map(publicRecommendation);

    const topRecommendation = matched[0];
    const recommendedActions = unique([
      ...(topRecommendation?.recommended_actions || []),
      ...(finding.recommended_actions || [])
    ]);
    const recommendedAlternatives = unique([
      ...(topRecommendation?.recommended_alternatives || []),
      ...(finding.recommended_alternatives || [])
    ]);

    return {
      ...finding,
      recommended_actions: recommendedActions,
      recommended_alternatives: recommendedAlternatives,
      migration_instruction: topRecommendation?.agent_instruction || finding.migration_instruction || "",
      recommendations: matched
    };
  });
}
