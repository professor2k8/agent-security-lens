import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { discoverFiles } from "../core/files.mjs";
import { extractJsonObservations } from "../observations/json-observations.mjs";
import { findingsFromObservations } from "../observations/observation-rules.mjs";
import { loadProfiles, resolveProfileSelection } from "../profiles/load-profiles.mjs";
import { loadRecommendationPacks } from "../recommendations/load-recommendations.mjs";
import { applyRecommendations } from "../recommendations/match-recommendations.mjs";
import { loadRulePacks } from "../rules/load-rules.mjs";
import { matchRules } from "../rules/match-rules.mjs";
import { applySupersedes } from "../rules/supersedes.mjs";
import { deriveTrustSignals, summarizeTrustSignals } from "../trust/derive-trust-signals.mjs";
import { loadTrustSignalTaxonomies } from "../trust/load-trust-signals.mjs";
import { groupByRiskDomain } from "./risk-domains.mjs";
import { summarize } from "./summarize.mjs";

export async function assess({ targetPath, requestedProfile }) {
  const startedAt = new Date().toISOString();
  const root = resolve(targetPath);
  const profiles = await loadProfiles();
  const profileSelection = await resolveProfileSelection({ profiles, requestedProfile, root });
  const matchedProfiles = profileSelection.profiles;
  const rulePacks = await loadRulePacks(matchedProfiles);
  const recommendationPacks = await loadRecommendationPacks();
  const trustSignalTaxonomies = await loadTrustSignalTaxonomies();
  const files = await discoverFiles(root);
  const textFindings = await matchRules({ root, files, profiles: matchedProfiles, rulePacks });
  const observations = await extractJsonObservations(files);
  const observationFindings = findingsFromObservations({
    observations,
    profileIds: matchedProfiles.map((profile) => profile.id)
  });
  const findings = applyRecommendations(
    applySupersedes([...observationFindings, ...textFindings]),
    recommendationPacks
  );
  const trustSignals = deriveTrustSignals({ findings, taxonomies: trustSignalTaxonomies });
  const summary = summarize(findings, matchedProfiles);
  summary.trust_signal_summary = summarizeTrustSignals(trustSignals);
  const riskDomains = groupByRiskDomain(findings);
  const completedAt = new Date().toISOString();
  const assessmentId = createHash("sha256")
    .update([root, startedAt, completedAt, profileSelection.selected_profile].join("|"))
    .digest("hex")
    .slice(0, 16);

  return {
    schema_version: "0.1.0",
    tool: {
      name: "AgentSecurityLens",
      version: "0.1.0-alpha.0"
    },
    assessment: {
      id: assessmentId,
      target_path: root,
      target_url: pathToFileURL(root).href,
      started_at: startedAt,
      completed_at: completedAt
    },
    lineage: {
      profile_selection: {
        mode: profileSelection.mode,
        requested_profile: profileSelection.requested_profile,
        selected_profile: profileSelection.selected_profile,
        detection_signals: profileSelection.detection_signals
      },
      algorithms: [
        { id: "json-observation-extractor", version: "0.1.0" },
        { id: "observation-to-finding-rules", version: "0.1.0" },
        { id: "finding-supersedes", version: "0.1.0" },
        { id: "recommendation-matcher", version: "0.1.0" },
        { id: "trust-signal-deriver", version: "0.1.0" },
        { id: summary.scoring_model, version: "0.1.0" }
      ]
    },
    profiles: matchedProfiles.map((profile) => ({
      id: profile.id,
      version: profile.version,
      status: profile.status,
      confidence: profile.confidence,
      coverage: profile.coverage,
      known_limitations: profile.known_limitations
    })),
    rule_packs: rulePacks.map((pack) => ({
      id: pack.id,
      version: pack.version,
      rule_count: pack.rules.length
    })),
    recommendation_packs: recommendationPacks.map((pack) => ({
      id: pack.id,
      version: pack.version,
      status: pack.status,
      recommendation_count: pack.recommendations.length
    })),
    trust_signal_taxonomies: trustSignalTaxonomies.map((taxonomy) => ({
      id: taxonomy.id,
      version: taxonomy.version,
      status: taxonomy.status,
      signal_count: taxonomy.signals.length
    })),
    trust_signals: trustSignals,
    observations,
    summary,
    risk_domains: riskDomains,
    findings
  };
}
