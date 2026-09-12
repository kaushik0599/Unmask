// Deterministic, evidence-based incident explanations.
// No AI / network dependency. Every finding references a real event index
// from the events array passed in - nothing is invented.

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

function describeEvent(event, index) {
  const parts = [`Event #${index}`];
  if (event.event_type) parts.push(`type=${event.event_type}`);
  if (event.field_type) parts.push(`field=${event.field_type}`);
  if (event.script_origin) parts.push(`origin=${event.script_origin}`);
  if (event.vector) parts.push(`vector=${event.vector}`);
  if (event.destination) parts.push(`destination=${event.destination}`);
  if (event.policy) parts.push(`policy=${event.policy}`);
  if (event.action) parts.push(`action=${event.action}`);
  parts.push(`severity=${event.severity}`);
  parts.push(`at ${event.timestamp}`);
  return parts.join(' ');
}

function explainIncident(events) {
  if (!events || events.length === 0) {
    return {
      verdict: 'No events are associated with this incident.',
      confidence: 'low',
      findings: []
    };
  }

  const findings = events.map((event, index) => ({
    event_index: index,
    event_id: event.event_id,
    statement: describeEvent(event, index)
  }));

  const maxSeverity = events.reduce(
    (acc, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[acc] ? e.severity : acc),
    'low'
  );
  const eventTypes = [...new Set(events.map((e) => e.event_type))];
  const destinations = [...new Set(events.map((e) => e.destination).filter(Boolean))];

  let verdict = `Detected ${events.length} event(s) of type(s) ${eventTypes.join(', ')} with maximum severity "${maxSeverity}", based on events #0-#${events.length - 1}.`;
  if (destinations.length) {
    verdict += ` Data was observed being directed toward: ${destinations.join(', ')}.`;
  }

  return {
    verdict,
    confidence: events.length > 1 ? 'high' : 'medium',
    findings
  };
}

module.exports = { explainIncident };
